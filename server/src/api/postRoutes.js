import express from 'express';
import { createPost, getFeedPosts, toggleLike, explorePosts, updatePost, deletePost, votePoll, addSave, removeSave, getTrends, getSavedPosts, getPollResults, getPostById } from '../controllers/postController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// protect -> Middleware que verifica si el usuario está logueado
router.route('/').post(protect, createPost).get(protect, getFeedPosts);

// Explorar (público con autenticación opcional)
router.get('/explore', optionalAuth, explorePosts);

// Tendencias (hashtags agregados de publicaciones recientes)
router.get('/trends', optionalAuth, getTrends);

// Guardados del usuario autenticado (debe ir antes que '/:id')
router.get('/saved', protect, getSavedPosts);

// Editar / eliminar publicación (solo autor)
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

// Obtener una publicación por ID (auth opcional)
router.get('/:id', optionalAuth, getPostById);

// Toggle like/unlike en una publicación
router.post('/:id/like', protect, toggleLike);

// Guardar / Quitar guardado de una publicación
router.post('/:id/save', protect, addSave);
router.delete('/:id/save', protect, removeSave);

// Encuestas (placeholder)
router.post('/:id/poll/vote', protect, votePoll);
router.get('/:id/poll/results', optionalAuth, getPollResults);

export default router;
