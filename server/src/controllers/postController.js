import Post from '../models/Post.js';
import User from '../models/User.js';
import cloudinary from '../services/cloudinary.js';

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
  try {
    const { texto_contenido, imagenes, archivos, etiquetas, encuesta } = req.body; // imagenes: array de URLs (legacy) | archivos: [{ url, tipo }]
    const author = req.userId;

    const newPost = new Post({
      texto_contenido,
      author
    });

    await newPost.save();

    // Priorizar 'archivos' (con tipo) y mantener compat con 'imagenes'
    if (archivos) {
      const dataArchivos = archivos.map((a, idx) => ({
        url_archivo: a?.url || a?.url_archivo,
        tipo_archivo: (a?.tipo || a?.tipo_archivo || 'IMAGEN').toUpperCase(),
        orden: idx,
        id_publicacion: newPost._id,
      })).filter((a) => !!a.url_archivo);
      if (dataArchivos.length > 0) {
        await Post.findByIdAndUpdate(newPost._id, { $push: { archivos: { $each: dataArchivos } } }, { new: true });
      }
    } else if (imagenes) {
      const data = imagenes.map((url, idx) => ({
        url_archivo: url,
        tipo_archivo: 'IMAGEN',
        orden: idx,
        id_publicacion: newPost._id,
      }));
      if (data.length > 0) {
        await Post.findByIdAndUpdate(newPost._id, { $push: { archivos: { $each: data } } }, { new: true });
      }
    }

    // Etiquetas de usuarios (@usuario)
    if (Array.isArray(etiquetas) && etiquetas.length > 0) {
      const unique = Array.from(new Set(etiquetas.map((u) => String(u).trim()).filter(Boolean)));
      if (unique.length > 0) {
        const taggedUsers = await User.find({ nombre_usuario: { $in: unique } }, { id_usuario: 1 });
        if (taggedUsers.length > 0) {
          await Post.findByIdAndUpdate(newPost._id, { $push: { etiquetas: { $each: taggedUsers } } }, { new: true });
        }
      }
    }

    // Encuesta (opcional) – si la tabla no existe aún, omitir silenciosamente
    if (encuesta && typeof encuesta.pregunta === 'string') {
      const pregunta = encuesta.pregunta.trim();
      const opciones = Array.isArray(encuesta.opciones) ? encuesta.opciones.map((s) => String(s).trim()).filter(Boolean) : [];
      if (pregunta && opciones.length >= 2) {
        try {
          const poll = await Post.findByIdAndUpdate(newPost._id, { $set: { encuesta: { pregunta, opciones } } }, { new: true });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[CREATE_POLL_SKIPPED]', { message: e?.message, code: e?.code });
        }
      }
    }

    res.status(201).json(newPost);
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
export const getPostById = async (req, res) => {
  try {
    const id_publicacion = req.params.id;
    const currentUserId = req.user?.id_usuario ?? 0;

    const post = await Post.findById(id_publicacion).populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url');

    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    const withSaved = {
      ...post.toObject(),
      guardado_por_mi: post.guardados && post.guardados.includes(currentUserId),
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
    const id_publicacion = req.params.id;

    // Encuesta por publicación con opciones ordenadas
    const poll = await Post.findById(id_publicacion).select('encuesta');

    if (!poll || !poll.encuesta) return res.status(404).json({ message: 'Encuesta no encontrada' });

    // Agregados de votos por opción
    const counts = await Post.aggregate([
      { $match: { _id: id_publicacion } },
      { $unwind: '$encuesta.opciones' },
      { $group: { _id: '$encuesta.opciones', count: { $sum: 1 } } },
    ]);

    const map = new Map(counts.map((c) => [c._id, c.count]));
    const results = (poll.encuesta.opciones || []).map((o) => ({ id_opcion: o, texto: o, orden: poll.encuesta.opciones.indexOf(o), votos: map.get(o) || 0 }));
    const total = results.reduce((acc, r) => acc + r.votos, 0);

    // Si hay usuario autenticado, devolver su selección (si existe)
    let selected = null;
    if (req.user?.id_usuario) {
      const myVote = await Post.findById(id_publicacion).select('encuesta.opciones');
      selected = myVote?.encuesta?.opciones?.find((o) => o === req.user.id_usuario)?.id_opcion ?? null;
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
  const id_publicacion = req.params.id;
  const id_usuario = req.user.id_usuario;

  try {
    await Post.findByIdAndUpdate(id_publicacion, { $addToSet: { guardados: id_usuario } }, { new: true });
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
  const id_publicacion = req.params.id;
  const id_usuario = req.user.id_usuario;

  try {
    await Post.findByIdAndUpdate(id_publicacion, { $pull: { guardados: id_usuario } }, { new: true });
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
    const id_publicacion = req.params.id;
    const { opcion } = req.body || {};

    // Obtener encuesta por publicación con opciones ordenadas
    const poll = await Post.findById(id_publicacion).select('encuesta');

    if (!poll || !poll.encuesta) return res.status(404).json({ message: 'Encuesta no encontrada' });

    const opciones = poll.encuesta.opciones || [];
    const idx = parseInt(opcion, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= opciones.length) {
      return res.status(400).json({ message: 'Opción inválida' });
    }
    const selected = opciones[idx];

    // Upsert voto (1 por encuesta por usuario)
    const id_usuario = req.user.id_usuario;
    await Post.findByIdAndUpdate(id_publicacion, { $addToSet: { 'encuesta.opciones': { $elemMatch: { id_opcion: selected } } } }, { new: true });

    // Retornar resultados agregados
    const counts = await Post.aggregate([
      { $match: { _id: id_publicacion } },
      { $unwind: '$encuesta.opciones' },
      { $group: { _id: '$encuesta.opciones', count: { $sum: 1 } } },
    ]);

    const map = new Map(counts.map((c) => [c._id, c.count]));
    const results = opciones.map((o) => ({ id_opcion: o, texto: o, orden: opciones.indexOf(o), votos: map.get(o) || 0 }));
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
    const seguidos = await User.find({ seguidores: { $elemMatch: { id_seguidor: currentUserId, estado: 'ACEPTADO' } } }, { id_usuario: 1 });

    // 2) Construir la lista de IDs (seguídos + yo mismo)
    const followedIds = seguidos.map((s) => s.id_usuario);
    if (!followedIds.includes(currentUserId)) followedIds.push(currentUserId);

    // 3) Traer solo publicaciones de esos usuarios, ordenadas por fecha
    let posts;
    try {
      posts = await Post.find({ author: { $in: followedIds } })
        .skip(skip)
        .limit(limit)
        .sort({ fecha_creacion: -1 })
        .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url')
        .populate('archivos', 'url_archivo tipo_archivo orden');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[GET_FEED_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
      posts = await Post.find({ author: { $in: followedIds } })
        .skip(skip)
        .limit(limit)
        .sort({ fecha_creacion: -1 })
        .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url');
    }
    const withSaved = posts.map((p) => ({
      ...p.toObject(),
      guardado_por_mi: p.guardados && p.guardados.includes(currentUserId),
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
      posts = await Post.find(tag ? { texto_contenido: { $regex: `#${tag}`, $options: 'i' } } : {})
        .skip(skip)
        .limit(limit)
        .sort({ fecha_creacion: -1 })
        .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url')
        .populate('archivos', 'url_archivo tipo_archivo orden');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[GET_EXPLORE_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
      posts = await Post.find(tag ? { texto_contenido: { $regex: `#${tag}`, $options: 'i' } } : {})
        .skip(skip)
        .limit(limit)
        .sort({ fecha_creacion: -1 })
        .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url');
    }
    const withSaved = posts.map((p) => ({
      ...p.toObject(),
      guardado_por_mi: p.guardados && p.guardados.includes(currentUserId),
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
      posts = await Post.find({ guardados: { $elemMatch: { $eq: currentUserId } } })
        .skip(skip)
        .limit(limit)
        .sort({ fecha_creacion: -1 })
        .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url')
        .populate('archivos', 'url_archivo tipo_archivo orden');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[GET_SAVED_INCLUDE_FALLBACK]', { message: e?.message, code: e?.code });
      posts = await Post.find({ guardados: { $elemMatch: { $eq: currentUserId } } })
        .skip(skip)
        .limit(limit)
        .sort({ fecha_creacion: -1 })
        .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url');
    }
    const withSaved = posts.map((p) => ({
      ...p.toObject(),
      // En esta ruta, todas las publicaciones vienen de un where que garantiza que están guardadas por el usuario.
      // Si no se incluyó 'guardados' por fallback, asumimos true.
      guardado_por_mi: p.guardados ? p.guardados.includes(currentUserId) : true,
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
  const id_publicacion = req.params.id;
  const id_usuario = req.user.id_usuario;

  if (!id_publicacion) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }

  try {
    const post = await Post.findById(id_publicacion);

    if (!post) return res.status(404).json({ message: 'Publicación no encontrada' });

    const existing = post.me_gusta && post.me_gusta.includes(id_usuario);
    if (existing) {
      await Post.findByIdAndUpdate(id_publicacion, { $pull: { me_gusta: id_usuario } }, { new: true });
      return res.json({ success: true, liked: false });
    } else {
      await Post.findByIdAndUpdate(id_publicacion, { $addToSet: { me_gusta: id_usuario } }, { new: true });
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
  const id_publicacion = req.params.id;
  const { texto_contenido } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!id_publicacion) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }

  try {
    const existing = await Post.findById(id_publicacion);

    if (!existing) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (existing.author.toString() !== id_usuario) {
      return res.status(403).json({ message: 'No autorizado para editar esta publicación' });
    }

    const updated = await Post.findByIdAndUpdate(id_publicacion, { texto_contenido: texto_contenido ?? existing.texto_contenido }, { new: true });
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
  const id_publicacion = req.params.id;
  const id_usuario = req.user.id_usuario;

  if (!id_publicacion) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }

  try {
    const existing = await Post.findById(id_publicacion);

    if (!existing) return res.status(404).json({ message: 'Publicación no encontrada' });
    if (existing.author.toString() !== id_usuario) {
      return res.status(403).json({ message: 'No autorizado para eliminar esta publicación' });
    }

    // Traer archivos asociados y eliminar en Cloudinary si aplicable
    const archivos = existing.archivos;
    if (archivos && archivos.length > 0) {
      await Promise.all(archivos.map(async (a) => {
        const publicId = cloudinaryPublicId(a.url_archivo);
        if (!publicId) return;
        const isVideo = (a.tipo_archivo || '').toUpperCase() === 'VIDEO';
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? 'video' : 'image', invalidate: true });
        } catch {}
      }));
    }

    await Post.findByIdAndRemove(id_publicacion);
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
    const posts = await Post.find({ fecha_creacion: { $gte: since } })
      .sort({ fecha_creacion: -1 })
      .limit(1000)
      .select('texto_contenido')
      .populate('author', 'id_usuario nombre_usuario nombre_perfil foto_perfil_url');

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
