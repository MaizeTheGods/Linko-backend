import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Obtener el usuario actual (me)
export const getMe = async (req, res) => {
  try {
    // First verify the user exists in DB (optional step)
    const userExists = await prisma.usuario.findUnique({
      where: { id_usuario: req.user.id },
      select: { id_usuario: true }
    });
    
    if (!userExists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Return the decoded token data directly (or fetch full user data if needed)
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el usuario', details: error.message });
  }
};

// Obtener el perfil de un usuario
export const getUserProfile = async (req, res) => {
  const { nombre_usuario } = req.params;

  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limitRaw = parseInt(req.query.limit ?? '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 50);
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id_usuario ?? 0;
    const usuario = await prisma.usuario.findUnique({
      where: { nombre_usuario },
      select: {
        id_usuario: true,
        nombre_usuario: true,
        nombre_perfil: true,
        biografia: true,
        foto_perfil_url: true,
        foto_portada_url: true,
        fecha_creacion: true,
        publicaciones: {
          orderBy: { fecha_creacion: 'desc' },
          skip,
          take: limit,
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nombre_usuario: true,
                nombre_perfil: true,
                foto_perfil_url: true,
              },
            },
            archivos: true,
            me_gusta: {
              where: { id_usuario: currentUserId },
              select: { id_usuario: true },
            },
            _count: {
              select: { me_gusta: true, comentarios: true },
            },
          },
        },
        _count: {
          select: { seguidores: true, seguidos: true, publicaciones: true },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el usuario actual sigue este perfil
    let isFollowing = false;
    if (req.user?.id_usuario) {
      const followRelation = await prisma.seguidor.findUnique({
        where: {
          id_seguidor_id_seguido: {
            id_seguidor: req.user.id_usuario,
            id_seguido: usuario.id_usuario
          }
        }
      });
      isFollowing = !!followRelation && followRelation.estado === 'ACEPTADO';
    }

    // Responder con datos públicos + estado de seguimiento
    res.json({ ...usuario, isFollowing });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil', details: error.message });
  }
};

// Seguir a un usuario
export const followUser = async (req, res) => {
  const { id_seguido } = req.params;
  const id_seguidor = req.user.id_usuario;

  if (id_seguidor === parseInt(id_seguido)) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
  }

  try {
    // Verificar si ya existe la relación
    const exists = await prisma.seguidor.findUnique({
      where: {
        id_seguidor_id_seguido: {
          id_seguidor: parseInt(id_seguidor),
          id_seguido: parseInt(id_seguido)
        }
      }
    });

    if (exists) {
      return res.status(400).json({ error: 'Ya sigues a este usuario' });
    }

    // Revisar si el perfil del seguido es privado para crear solicitud pendiente
    const target = await prisma.usuario.findUnique({
      where: { id_usuario: parseInt(id_seguido) },
      select: { perfil_privado: true },
    });
    const estado = target?.perfil_privado ? 'PENDIENTE' : 'ACEPTADO';

    await prisma.seguidor.create({
      data: {
        id_seguidor: parseInt(id_seguidor),
        id_seguido: parseInt(id_seguido),
        estado,
      },
    });

    // Obtener conteo actualizado
    const count = await prisma.seguidor.count({
      where: { id_seguido: parseInt(id_seguido), estado: 'ACEPTADO' }
    });

    res.status(201).json({ 
      success: true,
      followersCount: count,
      message: estado === 'ACEPTADO' ? 'Ahora sigues a este usuario' : 'Solicitud de seguimiento enviada'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al seguir al usuario', 
      details: error.message 
    });
  }
};

// Dejar de seguir a un usuario
export const unfollowUser = async (req, res) => {
  const { id_seguido } = req.params;
  const id_seguidor = req.user.id_usuario;

  try {
    await prisma.seguidor.delete({
      where: {
        id_seguidor_id_seguido: {
          id_seguidor: parseInt(id_seguidor),
          id_seguido: parseInt(id_seguido)
        }
      },
    });

    // Obtener conteo actualizado
    const count = await prisma.seguidor.count({
      where: { id_seguido: parseInt(id_seguido), estado: 'ACEPTADO' }
    });

    res.json({ 
      success: true,
      followersCount: count,
      message: 'Has dejado de seguir a este usuario'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al dejar de seguir', 
      details: error.message 
    });
  }
};

// Listar solicitudes de seguimiento pendientes para el usuario autenticado
export const listMyFollowRequests = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const requests = await prisma.seguidor.findMany({
      where: { id_seguido: meId, estado: 'PENDIENTE' },
      include: {
        seguidor: {
          select: {
            id_usuario: true,
            nombre_usuario: true,
            nombre_perfil: true,
            foto_perfil_url: true,
          },
        },
      },
      orderBy: { seguidor: { nombre_usuario: 'asc' } },
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener solicitudes', details: error.message });
  }
};

// Aprobar una solicitud de seguimiento (aceptar)
export const approveFollowRequest = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const followerId = parseInt(req.params.id, 10);
    if (Number.isNaN(followerId)) return res.status(400).json({ message: 'ID inválido' });

    const updated = await prisma.seguidor.update({
      where: { id_seguidor_id_seguido: { id_seguidor: followerId, id_seguido: meId } },
      data: { estado: 'ACEPTADO' },
    });
    return res.json({ success: true, estado: updated.estado });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ message: 'Solicitud no encontrada' });
    return res.status(500).json({ message: 'Error al aprobar solicitud', details: error.message });
  }
};

// Rechazar una solicitud de seguimiento (eliminar)
export const rejectFollowRequest = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const followerId = parseInt(req.params.id, 10);
    if (Number.isNaN(followerId)) return res.status(400).json({ message: 'ID inválido' });

    await prisma.seguidor.delete({
      where: { id_seguidor_id_seguido: { id_seguidor: followerId, id_seguido: meId } },
    });
    return res.json({ success: true });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ message: 'Solicitud no encontrada' });
    return res.status(500).json({ message: 'Error al rechazar solicitud', details: error.message });
  }
};

// --- Bloqueos de usuario para DMs ---
// Obtener estado de bloqueo entre el usuario autenticado y otro usuario
export const getBlockStatus = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const otherId = parseInt(req.params.id, 10);
    if (Number.isNaN(otherId)) return res.status(400).json({ message: 'ID inválido' });

    const [byMe, byOther] = await Promise.all([
      prisma.bloqueo.findUnique({
        where: { id_bloqueador_id_bloqueado: { id_bloqueador: meId, id_bloqueado: otherId } },
        select: { id_bloqueador: true },
      }),
      prisma.bloqueo.findUnique({
        where: { id_bloqueador_id_bloqueado: { id_bloqueador: otherId, id_bloqueado: meId } },
        select: { id_bloqueador: true },
      }),
    ]);

    return res.json({ blockedByMe: !!byMe, blockedMe: !!byOther });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener estado de bloqueo', details: error.message });
  }
};

// Bloquear a un usuario (idempotente)
export const blockUser = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const otherId = parseInt(req.params.id, 10);
    if (Number.isNaN(otherId)) return res.status(400).json({ message: 'ID inválido' });
    if (meId === otherId) return res.status(400).json({ message: 'No puedes bloquearte a ti mismo' });

    try {
      await prisma.bloqueo.upsert({
        where: { id_bloqueador_id_bloqueado: { id_bloqueador: meId, id_bloqueado: otherId } },
        update: {},
        create: { id_bloqueador: meId, id_bloqueado: otherId },
      });
    } catch (e) {}

    return res.json({ success: true, blockedByMe: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al bloquear usuario', details: error.message });
  }
};

// Desbloquear a un usuario (idempotente)
export const unblockUser = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const otherId = parseInt(req.params.id, 10);
    if (Number.isNaN(otherId)) return res.status(400).json({ message: 'ID inválido' });

    try {
      await prisma.bloqueo.delete({
        where: { id_bloqueador_id_bloqueado: { id_bloqueador: meId, id_bloqueado: otherId } },
      });
    } catch (e) {
      // Si no existe, lo tratamos como éxito idempotente
      if (e?.code !== 'P2025') {
        throw e;
      }
    }

    return res.json({ success: true, blockedByMe: false });
  } catch (error) {
    return res.status(500).json({ message: 'Error al desbloquear usuario', details: error.message });
  }
};

// Actualizar perfil del usuario autenticado
export const updateMe = async (req, res) => {
  try {
    const id = req.user.id_usuario;
    const { nombre_perfil, biografia, perfil_privado, foto_perfil_url, foto_portada_url } = req.body || {};

    const updated = await prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        ...(nombre_perfil !== undefined ? { nombre_perfil } : {}),
        ...(biografia !== undefined ? { biografia } : {}),
        ...(perfil_privado !== undefined ? { perfil_privado: !!perfil_privado } : {}),
        ...(foto_perfil_url !== undefined ? { foto_perfil_url } : {}),
        ...(foto_portada_url !== undefined ? { foto_portada_url } : {}),
      },
      select: {
        id_usuario: true,
        nombre_usuario: true,
        nombre_perfil: true,
        biografia: true,
        perfil_privado: true,
        foto_perfil_url: true,
        foto_portada_url: true,
        correo_electronico: true,
      },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar el perfil', details: error.message });
  }
};

// Cambiar correo del usuario (verificando contraseña)
export const updateEmail = async (req, res) => {
  try {
    const id = req.user.id_usuario;
    const { nuevo_correo, contrasena } = req.body || {};
    if (!nuevo_correo || !contrasena) return res.status(400).json({ message: 'Datos incompletos' });

    const user = await prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(contrasena, user.contrasena);
    if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta' });

    // Verificar que el correo no esté en uso por otro usuario
    const exists = await prisma.usuario.findFirst({
      where: { correo_electronico: nuevo_correo, NOT: { id_usuario: id } },
      select: { id_usuario: true },
    });
    if (exists) return res.status(400).json({ message: 'El correo ya está en uso' });

    const updated = await prisma.usuario.update({
      where: { id_usuario: id },
      data: { correo_electronico: nuevo_correo },
      select: { id_usuario: true, correo_electronico: true },
    });
    return res.json({ success: true, user: updated });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo actualizar el correo', details: error.message });
  }
};

// Cambiar contraseña del usuario
export const updatePassword = async (req, res) => {
  try {
    const id = req.user.id_usuario;
    const { contrasena_actual, contrasena_nueva } = req.body || {};
    if (!contrasena_actual || !contrasena_nueva) return res.status(400).json({ message: 'Datos incompletos' });

    const user = await prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(contrasena_actual, user.contrasena);
    if (!ok) return res.status(401).json({ message: 'Contraseña actual incorrecta' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(contrasena_nueva, salt);
    await prisma.usuario.update({ where: { id_usuario: id }, data: { contrasena: hashed } });
    return res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo cambiar la contraseña', details: error.message });
  }
};
