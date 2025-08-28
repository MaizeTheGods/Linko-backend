import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createComment, getCommentsForPost, deleteComment } from '../controllers/commentController.js';

const router = express.Router();

// Comentarios de una publicación
router.get('/posts/:id/comments', getCommentsForPost); // pública
router.post('/posts/:id/comments', protect, createComment); // protegida

// Eliminar un comentario
router.delete('/comments/:commentId', protect, deleteComment); // protegida

export default router;
