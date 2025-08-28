import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// @desc    Crear un nuevo comentario en una publicación
// @route   POST /api/posts/:id/comments
export const createComment = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  const id_usuario = req.user.id_usuario;
  const { texto_comentario, id_comentario_padre } = req.body;

  if (Number.isNaN(id_publicacion)) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }
  if (!texto_comentario || !texto_comentario.trim()) {
    return res.status(400).json({ message: 'El comentario no puede estar vacío' });
  }

  try {
    const data = {
      texto_comentario,
      id_publicacion,
      id_usuario,
    };
    if (id_comentario_padre !== undefined && id_comentario_padre !== null) {
      const parentId = parseInt(id_comentario_padre, 10);
      if (!Number.isNaN(parentId)) {
        data.id_comentario_padre = parentId;
      }
    }

    const comentario = await prisma.comentario.create({
      data,
      include: {
        usuario: {
          select: {
            nombre_usuario: true,
            nombre_perfil: true,
            foto_perfil_url: true,
          }
        }
      }
    });
    return res.status(201).json(comentario);
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear el comentario', error });
  }
};

// @desc    Obtener comentarios de una publicación
// @route   GET /api/posts/:id/comments
export const getCommentsForPost = async (req, res) => {
  const id_publicacion = parseInt(req.params.id, 10);
  if (Number.isNaN(id_publicacion)) {
    return res.status(400).json({ message: 'ID de publicación inválido' });
  }
  try {
    const comments = await prisma.comentario.findMany({
      where: { id_publicacion },
      orderBy: { fecha_creacion: 'asc' },
      include: {
        usuario: {
          select: {
            nombre_usuario: true,
            nombre_perfil: true,
            foto_perfil_url: true,
          }
        }
      }
    });
    // Construir árbol jerárquico
    const map = new Map();
    comments.forEach((c) => {
      map.set(c.id_comentario, { ...c, respuestas: [] });
    });
    const roots = [];
    map.forEach((node) => {
      if (node.id_comentario_padre) {
        const parent = map.get(node.id_comentario_padre);
        if (parent) parent.respuestas.push(node);
        else roots.push(node); // si no se encuentra el padre por alguna razón, tratarlo como root
      } else {
        roots.push(node);
      }
    });
    return res.json(roots);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener comentarios', error });
  }
};

// @desc    Eliminar un comentario (solo autor)
// @route   DELETE /api/comments/:commentId
export const deleteComment = async (req, res) => {
  const id_comentario = parseInt(req.params.commentId, 10);
  const id_usuario = req.user.id_usuario;
  if (Number.isNaN(id_comentario)) {
    return res.status(400).json({ message: 'ID de comentario inválido' });
  }
  try {
    const existing = await prisma.comentario.findUnique({ where: { id_comentario } });
    if (!existing) return res.status(404).json({ message: 'Comentario no encontrado' });
    if (existing.id_usuario !== id_usuario) {
      return res.status(403).json({ message: 'No autorizado para eliminar este comentario' });
    }
    await prisma.comentario.delete({ where: { id_comentario } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el comentario', error });
  }
};
