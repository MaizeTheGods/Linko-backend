import { PrismaClient } from '@prisma/client';
import cloudinary from '../services/cloudinary.js';
const prisma = new PrismaClient();

// Extraer public_id desde una URL de Cloudinary
function cloudinaryPublicId(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    let rest = parts.slice(uploadIdx + 1); // could be [v12345, folder, name.ext]
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (rest.length === 0) return null;
    // remove extension on last segment
    const last = rest.pop();
    const noExt = last.replace(/\.[^/.]+$/, '');
    rest.push(noExt);
    return decodeURIComponent(rest.join('/'));
  } catch {
    return null;
  }
}

// @desc    Crear una nueva publicación
// @route   POST /api/posts
export const createPost = async (req, res) => {
  const { texto_contenido, imagenes, archivos, etiquetas, encuesta } = req.body; // imagenes: array de URLs (legacy) | archivos: [{ url, tipo }]

  const hasImagenes = Array.isArray(imagenes) && imagenes.length > 0;
  const hasArchivos = Array.isArray(archivos) && archivos.length > 0;
  if (!texto_contenido && !hasImagenes && !hasArchivos) {
    return res.status(400).json({ message: 'El contenido no puede estar vacío' });
  }

  try {
    const post = await prisma.publicacion.create({
      data: {
        texto_contenido: texto_contenido || null,
        id_usuario: req.user.id_usuario, // req.user viene del middleware 'protect'
      },
    });

    // Priorizar 'archivos' (con tipo) y mantener compat con 'imagenes'
    if (hasArchivos) {
      const dataArchivos = archivos.map((a, idx) => ({
        url_archivo: a?.url || a?.url_archivo,
        tipo_archivo: (a?.tipo || a?.tipo_archivo || 'IMAGEN').toUpperCase(),
        orden: idx,
        id_publicacion: post.id_publicacion,
      })).filter((a) => !!a.url_archivo);
      if (dataArchivos.length > 0) {
        await prisma.archivoPublicacion.createMany({ data: dataArchivos });
      }
    } else if (hasImagenes) {
      const data = imagenes.map((url, idx) => ({
        url_archivo: url,
        tipo_archivo: 'IMAGEN',
        orden: idx,
        id_publicacion: post.id_publicacion,
      }));
      if (data.length > 0) {
        await prisma.archivoPublicacion.createMany({ data });
      }
    }

    // Etiquetas de usuarios (@usuario)
    if (Array.isArray(etiquetas) && etiquetas.length > 0) {
      const unique = Array.from(new Set(etiquetas.map((u) => String(u).trim()).filter(Boolean)));
      if (unique.length > 0) {
        const taggedUsers = await prisma.usuario.findMany({ where: { nombre_usuario: { in: unique } }, select: { id_usuario: true } });
        if (taggedUsers.length > 0) {
          await prisma.publicacionEtiqueta.createMany({
            data: taggedUsers.map((u) => ({ id_publicacion: post.id_publicacion, id_usuario_etiquetado: u.id_usuario })),
            skipDuplicates: true,
          });
        }
      }
    }

    // Encuesta (opcional) – si la tabla no existe aún, omitir silenciosamente
    if (encuesta && typeof encuesta.pregunta === 'string') {
      const pregunta = encuesta.pregunta.trim();
      const opciones = Array.isArray(encuesta.opciones) ? encuesta.opciones.map((s) => String(s).trim()).filter(Boolean) : [];
      if (pregunta && opciones.length >= 2) {
        try {
          const poll = await prisma.encuesta.create({
            data: { id_publicacion: post.id_publicacion, pregunta },
          });
          const dataOpc = opciones.slice(0, 4).map((texto, idx) => ({ texto, orden: idx, id_encuesta: poll.id_encuesta }));
          if (dataOpc.length > 0) await prisma.opcionEncuesta.createMany({ data: dataOpc });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[CREATE_POLL_SKIPPED]', { message: e?.message, code: e?.code });
        }
      }
    }

    // Devolver publicación con archivos, encuesta e info básica (fallback si tablas faltan)
    let full;
    try {
      full = await prisma.publicacion.findUnique({
        where: { id_publicacion: post.id_publicacion },
        include: {
          archivos: true,
          usuario: { select: { nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
          encuesta: { include: { opciones: true } },
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[CREATE_POST_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
      full = await prisma.publicacion.findUnique({
        where: { id_publicacion: post.id_publicacion },
        include: {
          archivos: true,
          usuario: { select: { nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    }

    res.status(201).json(full);
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[CREATE_POST_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    res.status(500).json({ message: 'Error al crear la publicación' });
  }
};

// @desc    Obtener una publicación por ID
// @route   GET /api/posts/:id
// @access  Auth opcional (para marcar likes/guardados si está logueado)
export const getPostById = async (req, res) => {
  try {
    const id_publicacion = parseInt(req.params.id, 10);
    if (Number.isNaN(id_publicacion)) return res.status(400).json({ message: 'ID inválido' });
    const currentUserId = req.user?.id_usuario ?? 0;

    let post;
    try {
      post = await prisma.publicacion.findUnique({
        where: { id_publicacion },
        include: {
          usuario: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
          archivos: true,
          encuesta: { include: { opciones: true } },
          me_gusta: { where: { id_usuario: currentUserId }, select: { id_usuario: true } },
          guardados: { where: { id_usuario: currentUserId }, select: { id_usuario: true } },
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    } catch (e) {
      // Fallback si encuesta no existe
      post = await prisma.publicacion.findUnique({
        where: { id_publicacion },
        include: {
          usuario: { select: { id_usuario: true, nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
          archivos: true,
          me_gusta: { where: { id_usuario: currentUserId }, select: { id_usuario: true } },
          guardados: { where: { id_usuario: currentUserId }, select: { id_usuario: true } },
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    }

    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });
    const withSaved = {
      ...post,
      guardado_por_mi: Array.isArray(post.guardados) && post.guardados.length > 0,
    };
    return res.json(withSaved);
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[GET_POST_BY_ID_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al obtener la publicación' });
  }
};

// @desc    Obtener resultados de una encuesta sin votar
// @route   GET /api/posts/:id/poll/results
export const getPollResults = async (req, res) => {
  try {
    const id_publicacion = parseInt(req.params.id, 10);
    if (Number.isNaN(id_publicacion)) return res.status(400).json({ message: 'ID inválido' });

    // Encuesta por publicación con opciones ordenadas
    const poll = await prisma.encuesta.findFirst({
      where: { publicacion: { id_publicacion } },
      include: { opciones: { orderBy: { orden: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ message: 'Encuesta no encontrada' });

    // Agregados de votos por opción
    const counts = await prisma.votoEncuesta.groupBy({
      by: ['id_opcion'],
      where: { id_encuesta: poll.id_encuesta },
      _count: { id_opcion: true },
    });
    const map = new Map(counts.map((c) => [c.id_opcion, c._count.id_opcion]));
    const results = (poll.opciones || []).map((o) => ({ id_opcion: o.id_opcion, texto: o.texto, orden: o.orden, votos: map.get(o.id_opcion) || 0 }));
    const total = results.reduce((acc, r) => acc + r.votos, 0);

    // Si hay usuario autenticado, devolver su selección (si existe)
    let selected = null;
    if (req.user?.id_usuario) {
      const myVote = await prisma.votoEncuesta.findUnique({
        where: { id_encuesta_id_usuario: { id_encuesta: poll.id_encuesta, id_usuario: req.user.id_usuario } },
        select: { id_opcion: true },
      });
      selected = myVote?.id_opcion ?? null;
    }

    return res.json({ results, total, selected });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[GET_POLL_RESULTS_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al obtener resultados de la encuesta' });
  }
};

// @desc Guardar publicación
// @route POST /api/posts/:id/save
export const addSave = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  const id_usuario = req.user.id_usuario;
  if (Number.isNaN(id_publicacion)) return res.status(400).json({ message: 'ID de publicación inválido' });
  try {
    await prisma.guardado.upsert({
      where: { id_usuario_id_publicacion: { id_usuario, id_publicacion } },
      update: {},
      create: { id_usuario, id_publicacion },
    });
    return res.json({ success: true, saved: true });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[SAVE_POST_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al guardar la publicación' });
  }
};

// @desc Quitar de guardados
// @route DELETE /api/posts/:id/save
export const removeSave = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  const id_usuario = req.user.id_usuario;
  if (Number.isNaN(id_publicacion)) return res.status(400).json({ message: 'ID de publicación inválido' });
  try {
    await prisma.guardado.delete({ where: { id_usuario_id_publicacion: { id_usuario, id_publicacion } } });
    return res.json({ success: true, saved: false });
  } catch (error) {
    // Si no existía, igualmente devolver estado
    if (error?.code === 'P2025') return res.json({ success: true, saved: false });
    try {
      // eslint-disable-next-line no-console
      console.error('[UNSAVE_POST_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al quitar guardado' });
  }
};

// @desc    Votar en una encuesta de una publicación (placeholder)
// @route   POST /api/posts/:id/poll/vote
export const votePoll = async (req, res) => {
  try {
    const id_publicacion = parseInt(req.params.id, 10);
    const { opcion } = req.body || {};
    if (Number.isNaN(id_publicacion)) return res.status(400).json({ message: 'ID inválido' });
    if (opcion === undefined || opcion === null) return res.status(400).json({ message: 'Falta opción' });

    // Obtener encuesta por publicación con opciones ordenadas
    const poll = await prisma.encuesta.findFirst({
      where: { publicacion: { id_publicacion } },
      include: { opciones: { orderBy: { orden: 'asc' } } },
    });
    if (!poll) return res.status(404).json({ message: 'Encuesta no encontrada' });

    const opciones = poll.opciones || [];
    const idx = parseInt(opcion, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= opciones.length) {
      return res.status(400).json({ message: 'Opción inválida' });
    }
    const selected = opciones[idx];

    // Upsert voto (1 por encuesta por usuario)
    const id_usuario = req.user.id_usuario;
    await prisma.votoEncuesta.upsert({
      where: { id_encuesta_id_usuario: { id_encuesta: poll.id_encuesta, id_usuario } },
      update: { id_opcion: selected.id_opcion },
      create: { id_encuesta: poll.id_encuesta, id_usuario, id_opcion: selected.id_opcion },
    });

    // Retornar resultados agregados
    const counts = await prisma.votoEncuesta.groupBy({
      by: ['id_opcion'],
      where: { id_encuesta: poll.id_encuesta },
      _count: { id_opcion: true },
    });
    const map = new Map(counts.map((c) => [c.id_opcion, c._count.id_opcion]));
    const results = opciones.map((o) => ({ id_opcion: o.id_opcion, texto: o.texto, orden: o.orden, votos: map.get(o.id_opcion) || 0 }));
    return res.json({ success: true, selected: selected.id_opcion, results });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[VOTE_POLL_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al votar en la encuesta' });
  }
};

// @desc    Obtener las publicaciones para el feed
// @route   GET /api/posts
export const getFeedPosts = async (req, res) => {
  try {
    const currentUserId = req.user.id_usuario;
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limitRaw = parseInt(req.query.limit ?? '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 50);
    const skip = (page - 1) * limit;

    // 1) Obtener los IDs de usuarios a los que sigo (solo aceptados)
    const seguidos = await prisma.seguidor.findMany({
      where: { id_seguidor: currentUserId, estado: 'ACEPTADO' },
      select: { id_seguido: true },
    });

    // 2) Construir la lista de IDs (seguídos + yo mismo)
    const followedIds = seguidos.map((s) => s.id_seguido);
    if (!followedIds.includes(currentUserId)) followedIds.push(currentUserId);

    // 3) Traer solo publicaciones de esos usuarios, ordenadas por fecha
    let posts;
    try {
      posts = await prisma.publicacion.findMany({
        where: { id_usuario: { in: followedIds.length ? followedIds : [currentUserId] } },
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
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
          encuesta: { include: { opciones: true } },
          me_gusta: {
            where: { id_usuario: currentUserId },
            select: { id_usuario: true },
          },
          guardados: {
            where: { id_usuario: currentUserId },
            select: { id_usuario: true },
          },
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[GET_FEED_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
      posts = await prisma.publicacion.findMany({
        where: { id_usuario: { in: followedIds.length ? followedIds : [currentUserId] } },
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
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
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    }
    const withSaved = posts.map((p) => ({
      ...p,
      guardado_por_mi: Array.isArray(p.guardados) && p.guardados.length > 0,
    }));
    return res.json(withSaved);
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[GET_FEED_POSTS_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    res.status(500).json({ message: 'Error al obtener las publicaciones' });
  }
};

// @desc    Explorar publicaciones (de todos los usuarios)
// @route   GET /api/posts/explore
export const explorePosts = async (req, res) => {
  try {
    // Si hay usuario autenticado, lo usamos para marcar likes; si no, 0 no coincidirá con nadie
    const currentUserId = req.user?.id_usuario ?? 0;
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limitRaw = parseInt(req.query.limit ?? '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 50);
    const skip = (page - 1) * limit;
    const tagRaw = (req.query.tag || '').toString().trim();
    const tag = tagRaw.replace(/^#/, '');

    let posts;
    try {
      posts = await prisma.publicacion.findMany({
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        where: tag ? { texto_contenido: { contains: `#${tag}`, mode: 'insensitive' } } : undefined,
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
          encuesta: { include: { opciones: true } },
          me_gusta: {
            where: { id_usuario: currentUserId },
            select: { id_usuario: true },
          },
          guardados: {
            where: { id_usuario: currentUserId },
            select: { id_usuario: true },
          },
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[GET_EXPLORE_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
      posts = await prisma.publicacion.findMany({
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
        where: tag ? { texto_contenido: { contains: `#${tag}`, mode: 'insensitive' } } : undefined,
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
          _count: { select: { me_gusta: true, comentarios: true } },
        },
      });
    }
    const withSaved = posts.map((p) => ({
      ...p,
      guardado_por_mi: Array.isArray(p.guardados) && p.guardados.length > 0,
    }));
    return res.json(withSaved);
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[GET_EXPLORE_POSTS_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al obtener publicaciones de explorar' });
  }
};

// @desc    Listar publicaciones guardadas por el usuario autenticado
// @route   GET /api/posts/saved
export const getSavedPosts = async (req, res) => {
try {
  const currentUserId = req.user.id_usuario;
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const limitRaw = parseInt(req.query.limit ?? '20', 10);
  const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 50);
  const skip = (page - 1) * limit;

  let posts;
  try {
    posts = await prisma.publicacion.findMany({
      where: { guardados: { some: { id_usuario: currentUserId } } },
      skip,
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
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
        encuesta: { include: { opciones: true } },
        me_gusta: {
          where: { id_usuario: currentUserId },
          select: { id_usuario: true },
        },
        guardados: {
          where: { id_usuario: currentUserId },
          select: { id_usuario: true },
        },
        _count: { select: { me_gusta: true, comentarios: true } },
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[GET_SAVED_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
    posts = await prisma.publicacion.findMany({
      where: { guardados: { some: { id_usuario: currentUserId } } },
      skip,
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
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
        _count: { select: { me_gusta: true, comentarios: true } },
      },
    });
  }
  const withSaved = posts.map((p) => ({
    ...p,
    // En esta ruta, todas las publicaciones vienen de un where que garantiza que están guardadas por el usuario.
    // Si no se incluyó 'guardados' por fallback, asumimos true.
    guardado_por_mi: p.guardados ? (Array.isArray(p.guardados) && p.guardados.length > 0) : true,
  }));
  return res.json(withSaved);
} catch (error) {
  try {
    // eslint-disable-next-line no-console
    console.error('[GET_SAVED_POSTS_ERROR]', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    });
  } catch {}
  return res.status(500).json({ message: 'Error al obtener publicaciones guardadas' });
}
};

// @desc    Dar o quitar "Me Gusta" a una publicación (toggle)
// @route   POST /api/posts/:id/like
export const toggleLike = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  const id_usuario = req.user.id_usuario;

  if (Number.isNaN(id_publicacion)) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }

  try {
    const where = { id_usuario_id_publicacion: { id_usuario, id_publicacion } };

    const existing = await prisma.meGusta.findUnique({ where });
    if (existing) {
      await prisma.meGusta.delete({ where });
      return res.json({ success: true, liked: false });
    } else {
      await prisma.meGusta.create({ data: { id_usuario, id_publicacion } });
      return res.json({ success: true, liked: true });
    }
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[TOGGLE_LIKE_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al procesar el me gusta' });
  }
};

// @desc    Actualizar texto de una publicación (solo autor)
// @route   PUT /api/posts/:id
export const updatePost = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  const { texto_contenido } = req.body;
  const id_usuario = req.user.id_usuario;

  if (Number.isNaN(id_publicacion)) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }

  try {
    const existing = await prisma.publicacion.findUnique({ where: { id_publicacion } });
    if (!existing) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (existing.id_usuario !== id_usuario) {
      return res.status(403).json({ message: 'No autorizado para editar esta publicación' });
    }

    const updated = await prisma.publicacion.update({
      where: { id_publicacion },
      data: { texto_contenido: texto_contenido ?? existing.texto_contenido },
      include: {
        usuario: { select: { nombre_usuario: true, nombre_perfil: true, foto_perfil_url: true } },
        archivos: true,
        _count: { select: { me_gusta: true, comentarios: true } },
      },
    });
    return res.json(updated);
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[UPDATE_POST_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al actualizar la publicación' });
  }
};

// @desc    Eliminar una publicación (solo autor)
// @route   DELETE /api/posts/:id
export const deletePost = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  const id_usuario = req.user.id_usuario;

  if (Number.isNaN(id_publicacion)) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }

  try {
    const existing = await prisma.publicacion.findUnique({ where: { id_publicacion } });
    if (!existing) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (existing.id_usuario !== id_usuario) {
      return res.status(403).json({ message: 'No autorizado para eliminar esta publicación' });
    }

    // Traer archivos asociados y eliminar en Cloudinary si aplicable
    const archivos = await prisma.archivoPublicacion.findMany({ where: { id_publicacion } });
    if (Array.isArray(archivos) && archivos.length > 0) {
      await Promise.all(archivos.map(async (a) => {
        const publicId = cloudinaryPublicId(a.url_archivo);
        if (!publicId) return;
        const isVideo = (a.tipo_archivo || '').toUpperCase() === 'VIDEO';
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? 'video' : 'image', invalidate: true });
        } catch {}
      }));
    }

    await prisma.publicacion.delete({ where: { id_publicacion } });
    return res.json({ success: true });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[DELETE_POST_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al eliminar la publicación' });
  }
};

// @desc    Tendencias: extraer hashtags más usados en publicaciones recientes
// @route   GET /api/posts/trends
// @query   limit (default 10), days (default 7)
export const getTrends = async (req, res) => {
  try {
    const limitRaw = parseInt(req.query.limit ?? '10', 10);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 10 : limitRaw), 20);
    const daysRaw = parseInt(req.query.days ?? '7', 10);
    const days = Math.min(Math.max(1, isNaN(daysRaw) ? 7 : daysRaw), 30);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Traer últimas N publicaciones dentro del rango de tiempo
    const posts = await prisma.publicacion.findMany({
      where: { fecha_creacion: { gte: since } },
      orderBy: { fecha_creacion: 'desc' },
      take: 1000,
      select: { texto_contenido: true },
    });

    const counts = new Map();
    const re = /#([A-Za-z0-9_]+)/g; // hashtags básicos (ASCII)

    for (const p of posts) {
      const text = (p.texto_contenido || '').toString();
      if (!text) continue;
      const seenInPost = new Set();
      let m;
      while ((m = re.exec(text)) !== null) {
        const tag = m[1].toLowerCase();
        if (!tag) continue;
        // evitar contar el mismo tag varias veces en la misma publicación
        if (seenInPost.has(tag)) continue;
        seenInPost.add(tag);
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag: `#${tag}`, count }));

    return res.json({ since: since.toISOString(), totalTags: counts.size, trends: sorted });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[GET_TRENDS_ERROR]', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
      });
    } catch {}
    return res.status(500).json({ message: 'Error al obtener tendencias' });
  }
};
