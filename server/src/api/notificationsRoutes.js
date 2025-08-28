import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getUnreadCount, listNotifications, markRead } from '../controllers/notificationsController.js';

const router = Router();

// Obtener conteo de notificaciones no leídas
router.get('/unread-count', protect, getUnreadCount);

// Listar notificaciones recientes (likes y comentarios en tus publicaciones)
router.get('/', protect, listNotifications);

// Marcar como leídas (limpia badge desde el último visto)
router.post('/mark-read', protect, markRead);

export default router;
