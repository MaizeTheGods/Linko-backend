import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

// @desc    Crear un nuevo comentario en una publicación
// @route   POST /api/posts/:id/comments
export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;
    const author = req.user.id_usuario;
    
    // Verificar que el post existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }
    
    const newComment = new Comment({
      content,
      post: postId,
      author
    });
    
    await newComment.save();
    return res.status(201).json(newComment);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener comentarios de una publicación
// @route   GET /api/posts/:id/comments
export const getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .populate('author', 'nombre_usuario nombre_perfil foto_perfil_url');
    
    // Construir árbol jerárquico
    const map = new Map();
    comments.forEach((c) => {
      map.set(c.id, { ...c, respuestas: [] });
    });
    const roots = [];
    map.forEach((node) => {
      if (node.comentario_padre) {
        const parent = map.get(node.comentario_padre);
        if (parent) parent.respuestas.push(node);
        else roots.push(node); // si no se encuentra el padre por alguna razón, tratarlo como root
      } else {
        roots.push(node);
      }
    });
    return res.json(roots);
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
};

// @desc    Eliminar un comentario (solo autor)
// @route   DELETE /api/comments/:commentId
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const id_usuario = req.user.id_usuario;
    const existing = await Comment.findById(id);
    if (!existing) return res.status(404).json({ message: 'Comentario no encontrado' });
    if (existing.author.toString() !== id_usuario) {
      return res.status(403).json({ message: 'No autorizado para eliminar este comentario' });
    }
    await Comment.findByIdAndRemove(id);
    return res.status(200).json({ 
      message: 'Comentario eliminado',
      success: true 
    });
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
};
