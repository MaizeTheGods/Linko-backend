import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Nota: almacenamiento en memoria (se reinicia al reiniciar el server).
// Si necesitas persistencia, puedo migrarlo a BD (campo last_seen por usuario).
const lastSeenMap = new Map(); // key: id_usuario, value: Date

// Normaliza un evento a un objeto de notificación
function mapLikeToNotif(like, postPreview) {
  return {
    type: 'LIKE',
    created_at: like.fecha_creacion,
    post_id: like.id_publicacion,
    actor: like.usuario ? {
      id_usuario: like.usuario.id_usuario,
      nombre_usuario: like.usuario.nombre_usuario,
      nombre_perfil: like.usuario.nombre_perfil,
      foto_perfil_url: like.usuario.foto_perfil_url,
    } : null,
    post: postPreview || null,
  };
}

function mapFollowToNotif(follow) {
  return {
    type: 'FOLLOW',
    created_at: follow.fecha_creacion,
    actor: follow.seguidor ? {
      id_usuario: follow.seguidor.id_usuario,
      nombre_usuario: follow.seguidor.nombre_usuario,
      nombre_perfil: follow.seguidor.nombre_perfil,
      foto_perfil_url: follow.seguidor.foto_perfil_url,
    } : null,
  };
}

function mapCommentToNotif(c, postPreview) {
  return {
    type: 'COMMENT',
    created_at: c.fecha_creacion,
    post_id: c.id_publicacion,
    actor: c.usuario ? {
      id_usuario: c.usuario.id_usuario,
      nombre_usuario: c.usuario.nombre_usuario,
      nombre_perfil: c.usuario.nombre_perfil,
      foto_perfil_url: c.usuario.foto_peril_url || c.usuario.foto_perfil_url,
    } : null,
    excerpt: c.texto_comentario?.slice(0, 140) || '',
    post: postPreview || null,
  };
}

// @desc    Listar notificaciones recientes (últimos 7 días): likes y comentarios en mis publicaciones
// @route   GET /api/notifications
// @access  Privado
export const listNotifications = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Ids de mis publicaciones
    const myPosts = await prisma.publicacion.findMany({
      where: { id_usuario: meId },
      select: { id_publicacion: true },
    });
    const postIds = myPosts.map(p => p.id_publicacion);
    if (postIds.length === 0) return res.json([]);

    // Likes recientes a mis publicaciones (excluyendo mis propios likes)
    const likes = await prisma.meGusta.findMany({
      where: { id_publicacion: { in: postIds }, fecha_creacion: { gte: sevenDaysAgo }, NOT: { id_usuario: meId } },
      orderBy: { fecha_creacion: 'desc' },
      take: 200,
      include: {
        usuario: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
      },
    });

    // Comentarios recientes en mis publicaciones (excluyendo mis propios comentarios)
    const comments = await prisma.comentario.findMany({
      where: { id_publicacion: { in: postIds }, fecha_creacion: { gte: sevenDaysAgo }, NOT: { id_usuario: meId } },
      orderBy: { fecha_creacion: 'desc' },
      take: 200,
      include: {
        usuario: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
      },
    });

    // Traer previews de publicaciones afectadas (texto recortado y primera miniatura)
    const targetIds = Array.from(new Set([
      ...likes.map(l => l.id_publicacion),
      ...comments.map(c => c.id_publicacion),
    ]));
    const posts = await prisma.publicacion.findMany({
      where: { id_publicacion: { in: targetIds } },
      select: {
        id_publicacion: true,
        texto_contenido: true,
        archivos: { orderBy: { orden: 'asc' }, take: 1, select: { url_archivo: true, tipo_archivo: true } },
      },
    });
    const previewMap = new Map(posts.map(p => [p.id_publicacion, {
      id_publicacion: p.id_publicacion,
      text_excerpt: (p.texto_contenido || '').slice(0, 80),
      thumb_url: Array.isArray(p.archivos) && p.archivos.length > 0 ? p.archivos[0].url_archivo : null,
      media_type: Array.isArray(p.archivos) && p.archivos.length > 0 ? p.archivos[0].tipo_archivo : null,
    }]));

    // Follows recientes hacia mí (solo aceptados)
    const follows = await prisma.seguidor.findMany({
      where: { id_seguido: meId, estado: 'ACEPTADO', fecha_creacion: { gte: sevenDaysAgo } },
      orderBy: { fecha_creacion: 'desc' },
      take: 200,
      include: {
        seguidor: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
      },
    });

    const items = [
      ...likes.map(l => mapLikeToNotif(l, previewMap.get(l.id_publicacion))),
      ...comments.map(c => mapCommentToNotif(c, previewMap.get(c.id_publicacion))),
      ...follows.map(f => mapFollowToNotif(f)),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json(items);
  } catch (error) {
    try { console.error('[NOTIFICATIONS_LIST_ERROR]', { message: error?.message }); } catch {}
    return res.status(500).json({ message: 'Error al listar notificaciones' });
  }
};

// @desc    Obtener conteo de notificaciones no leídas desde último visto (fallback: 24h)
// @route   GET /api/notifications/unread-count
// @access  Privado
export const getUnreadCount = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    const lastSeen = lastSeenMap.get(meId) || new Date(Date.now() - 24 * 60 * 60 * 1000);

    const myPosts = await prisma.publicacion.findMany({ where: { id_usuario: meId }, select: { id_publicacion: true } });

    const postIds = myPosts.map(p => p.id_publicacion);

    let recentLikes = 0;
    let recentComments = 0;
    let recentFollows = 0;
    if (postIds.length > 0) {
      [recentLikes, recentComments] = await Promise.all([
        prisma.meGusta.count({ where: { id_publicacion: { in: postIds }, fecha_creacion: { gte: lastSeen }, NOT: { id_usuario: meId } } }),
        prisma.comentario.count({ where: { id_publicacion: { in: postIds }, fecha_creacion: { gte: lastSeen }, NOT: { id_usuario: meId } } }),
      ]);
    }

    // Follows a mí desde lastSeen
    recentFollows = await prisma.seguidor.count({ where: { id_seguido: meId, estado: 'ACEPTADO', fecha_creacion: { gte: lastSeen } } });

    const count = recentLikes + recentComments + recentFollows;
    return res.json({ count });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[NOTIFICATIONS_UNREAD_ERROR]', { message: error?.message, code: error?.code });
    } catch {}
    return res.status(500).json({ message: 'Error al obtener notificaciones no leídas' });
  }
};

// @desc    Marcar notificaciones como leídas (actualiza lastSeen a ahora)
// @route   POST /api/notifications/mark-read
// @access  Privado
export const markRead = async (req, res) => {
  try {
    const meId = req.user.id_usuario;
    lastSeenMap.set(meId, new Date());
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al marcar notificaciones como leídas' });
  }
};
