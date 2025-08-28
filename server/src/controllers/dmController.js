import { PrismaClient } from '@prisma/client';
import cloudinary from '../services/cloudinary.js';

const prisma = new PrismaClient();

// Helper para obtener el par (user1, user2) en orden canónico
function canonicalPair(a, b) {
  const id1 = parseInt(a, 10);
  const id2 = parseInt(b, 10);
  if (Number.isNaN(id1) || Number.isNaN(id2)) return null;
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

// Extraer public_id desde una URL de Cloudinary
function cloudinaryPublicId(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    let rest = parts.slice(uploadIdx + 1);
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (rest.length === 0) return null;
    const last = rest.pop();
    const noExt = last.replace(/\.[^/.]+$/, '');
    rest.push(noExt);
    return decodeURIComponent(rest.join('/'));
  } catch {
    return null;
  }
}

// @desc    Listar conversaciones del usuario actual (con último mensaje)
// @route   GET /api/dm
export const listConversations = async (req, res) => {
  try {
    const currentId = req.user.id_usuario;
    const convs = await prisma.conversacion.findMany({
      where: { OR: [{ id_usuario1: currentId }, { id_usuario2: currentId }] },
      orderBy: { ultima_actividad: 'desc' },
      include: {
        usuario1: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
        usuario2: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
        mensajes: { take: 1, orderBy: { fecha_creacion: 'desc' } },
      },
    });
    // Compute unread counts and follow relationships per conversation
    const result = [];
    for (const c of convs) {
      const otro = c.id_usuario1 === currentId ? c.usuario2 : c.usuario1;
      const last = Array.isArray(c.mensajes) && c.mensajes.length > 0 ? c.mensajes[0] : null;
      let unread_count = 0;
      try {
        unread_count = await prisma.mensaje.count({
          where: { id_conversacion: c.id_conversacion, leido: false, NOT: { id_remitente: currentId } },
        });
      } catch {}
      // Follow relationship flags (accepted only)
      let isFollowedByMe = false; // I follow other
      let isFollowingMe = false;  // Other follows me
      try {
        const [a, b] = await Promise.all([
          prisma.seguidor.findUnique({ where: { id_seguidor_id_seguido: { id_seguidor: currentId, id_seguido: otro.id_usuario } }, select: { estado: true } }),
          prisma.seguidor.findUnique({ where: { id_seguidor_id_seguido: { id_seguidor: otro.id_usuario, id_seguido: currentId } }, select: { estado: true } }),
        ]);
        isFollowedByMe = a?.estado === 'ACEPTADO';
        isFollowingMe = b?.estado === 'ACEPTADO';
      } catch {}

      result.push({
        id_conversacion: c.id_conversacion,
        ultima_actividad: c.ultima_actividad,
        otro_usuario: otro,
        ultimo_mensaje: last,
        unread_count,
        isFollowedByMe,
        isFollowingMe,
      });
    }

    res.json(result);
  } catch (error) {
    try {
      console.error('[DM_LIST_CONVERSATIONS_ERROR]', { message: error?.message, code: error?.code });
    } catch {}
    res.status(500).json({ message: 'Error al listar conversaciones' });
  }
};

// @desc    Eliminar un mensaje (solo participante de la conversación)
// @route   DELETE /api/dm/messages/:messageId
export const deleteMessage = async (req, res) => {
  try {
    const currentId = req.user.id_usuario;
    const messageId = parseInt(req.params.messageId, 10);
    if (Number.isNaN(messageId)) return res.status(400).json({ message: 'ID inválido' });

    const msg = await prisma.mensaje.findUnique({ where: { id_mensaje: messageId } });
    if (!msg) return res.status(404).json({ message: 'Mensaje no encontrado' });

    // Verificar que el usuario es participante de la conversación
    const conv = await prisma.conversacion.findUnique({ where: { id_conversacion: msg.id_conversacion } });
    if (!conv) return res.status(404).json({ message: 'Conversación no encontrada' });
    if (conv.id_usuario1 !== currentId && conv.id_usuario2 !== currentId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Si el contenido es una URL de Cloudinary, intentar borrar el recurso
    const text = String(msg.contenido || '');
    if (/^https?:\/\//i.test(text) && /res\.cloudinary\.com|cloudinary\.com/.test(text)) {
      const publicId = cloudinaryPublicId(text);
      if (publicId) {
        const isVideo = /\/video\/upload\//.test(text) || /(\.mp4|\.webm|\.ogg|\.mov)(\?.*)?$/i.test(text);
        try { await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? 'video' : 'image', invalidate: true }); } catch {}
      }
    }

    await prisma.mensaje.delete({ where: { id_mensaje: messageId } });
    return res.json({ success: true });
  } catch (error) {
    try { console.error('[DM_DELETE_MESSAGE_ERROR]', { message: error?.message, code: error?.code }); } catch {}
    return res.status(500).json({ message: 'Error al eliminar el mensaje' });
  }
};

// @desc    Listar mensajes con un usuario (paginado)
// @route   GET /api/dm/:userId/messages?page=&limit=
export const listMessages = async (req, res) => {
  try {
    const currentId = req.user.id_usuario;
    const otherId = parseInt(req.params.userId, 10);
    if (Number.isNaN(otherId)) return res.status(400).json({ message: 'ID inválido' });

    const [u1, u2] = canonicalPair(currentId, otherId) || [];
    if (!u1 && u1 !== 0) return res.status(400).json({ message: 'IDs inválidos' });

    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limitRaw = parseInt(req.query.limit ?? '50', 10);
    const limit = Math.min(Math.max(1, Number.isNaN(limitRaw) ? 50 : limitRaw), 100);
    const skip = (page - 1) * limit;

    const conv = await prisma.conversacion.findUnique({
      where: { id_usuario1_id_usuario2: { id_usuario1: u1, id_usuario2: u2 } },
      select: { id_conversacion: true },
    });

    if (!conv) return res.json({ messages: [], page, limit, total: 0 });

    const [total, messages] = await Promise.all([
      prisma.mensaje.count({ where: { id_conversacion: conv.id_conversacion } }),
      prisma.mensaje.findMany({
        where: { id_conversacion: conv.id_conversacion },
        orderBy: { fecha_creacion: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({ messages, page, limit, total });
  } catch (error) {
    try {
      console.error('[DM_LIST_MESSAGES_ERROR]', { message: error?.message, code: error?.code });
    } catch {}
    res.status(500).json({ message: 'Error al listar mensajes' });
  }
};

// @desc    Enviar mensaje a un usuario (crea conversación si no existe)
// @route   POST /api/dm/:userId/messages
export const sendMessage = async (req, res) => {
  try {
    const currentId = req.user.id_usuario;
    const otherId = parseInt(req.params.userId, 10);
    const { contenido } = req.body || {};

    if (Number.isNaN(otherId)) return res.status(400).json({ message: 'ID inválido' });
    const normalized = String(contenido).replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length === 0) return res.status(400).json({ message: 'El contenido no puede estar vacío' });
    if (normalized.length > 1000) return res.status(400).json({ message: 'El contenido supera el máximo permitido (1000 caracteres)' });
    if (otherId === currentId) return res.status(400).json({ message: 'No puedes enviarte mensajes a ti mismo' });

    // Verificar que el usuario destino exista
    const userExists = await prisma.usuario.findUnique({ where: { id_usuario: otherId }, select: { id_usuario: true } });
    if (!userExists) return res.status(404).json({ message: 'Usuario destino no encontrado' });

    // Rate limiting sencillo anti-spam: máx 10 mensajes por 10s
    try {
      const tenSecondsAgo = new Date(Date.now() - 10_000);
      const recentCount = await prisma.mensaje.count({
        where: { id_remitente: currentId, fecha_creacion: { gt: tenSecondsAgo } },
      });
      if (recentCount >= 10) {
        return res.status(429).json({ message: 'Demasiados mensajes en poco tiempo. Intenta nuevamente en unos segundos.' });
      }
    } catch {}

    // Verificar bloqueos (si cualquiera bloqueó al otro, no permitir enviar)
    try {
      const [blockedByMe, blockedMe] = await Promise.all([
        prisma.bloqueo.findUnique({
          where: { id_bloqueador_id_bloqueado: { id_bloqueador: currentId, id_bloqueado: otherId } },
          select: { id_bloqueador: true },
        }),
        prisma.bloqueo.findUnique({
          where: { id_bloqueador_id_bloqueado: { id_bloqueador: otherId, id_bloqueado: currentId } },
          select: { id_bloqueador: true },
        }),
      ]);
      if (blockedByMe) return res.status(403).json({ message: 'Has bloqueado a este usuario. Desbloquéalo para enviar mensajes.' });
      if (blockedMe) return res.status(403).json({ message: 'No puedes enviar mensajes a este usuario.' });
    } catch {}

    const [u1, u2] = canonicalPair(currentId, otherId);

    // Upsert de la conversación
    const conv = await prisma.conversacion.upsert({
      where: { id_usuario1_id_usuario2: { id_usuario1: u1, id_usuario2: u2 } },
      update: { ultima_actividad: new Date() },
      create: { id_usuario1: u1, id_usuario2: u2 },
    });

    const msg = await prisma.mensaje.create({
      data: {
        id_conversacion: conv.id_conversacion,
        id_remitente: currentId,
        contenido: normalized,
      },
    });

    // Actualizar última actividad
    await prisma.conversacion.update({
      where: { id_conversacion: conv.id_conversacion },
      data: { ultima_actividad: new Date() },
    });

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    try {
      console.error('[DM_SEND_MESSAGE_ERROR]', { message: error?.message, code: error?.code });
    } catch {}
    res.status(500).json({ message: 'Error al enviar el mensaje' });
  }
};

// @desc    Marcar como leídos los mensajes recibidos en la conversación con un usuario
// @route   POST /api/dm/:userId/read
export const markAsRead = async (req, res) => {
  try {
    const currentId = req.user.id_usuario;
    const otherId = parseInt(req.params.userId, 10);
    if (Number.isNaN(otherId)) return res.status(400).json({ message: 'ID inválido' });

    const [u1, u2] = canonicalPair(currentId, otherId) || [];
    if (!u1 && u1 !== 0) return res.status(400).json({ message: 'IDs inválidos' });

    const conv = await prisma.conversacion.findUnique({
      where: { id_usuario1_id_usuario2: { id_usuario1: u1, id_usuario2: u2 } },
      select: { id_conversacion: true },
    });

    if (!conv) return res.json({ updated: 0 });

    const result = await prisma.mensaje.updateMany({
      where: {
        id_conversacion: conv.id_conversacion,
        leido: false,
        NOT: { id_remitente: currentId },
      },
      data: { leido: true },
    });

    res.json({ updated: result.count || 0 });
  } catch (error) {
    try {
      console.error('[DM_MARK_READ_ERROR]', { message: error?.message, code: error?.code });
    } catch {}
    res.status(500).json({ message: 'Error al marcar como leído' });
  }
};
