import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listConversations, listMessages, sendMessage, markAsRead, deleteMessage } from '../controllers/dmController.js';

const router = Router();

// Listar conversaciones del usuario autenticado
router.get('/', protect, listConversations);

// Listar mensajes con un usuario específico (paginado)
router.get('/:userId/messages', protect, listMessages);

// Enviar mensaje a un usuario (crea conversación si no existe)
router.post('/:userId/messages', protect, sendMessage);

// Marcar mensajes como leídos en la conversación con un usuario
router.post('/:userId/read', protect, markAsRead);

// Eliminar un mensaje específico
router.delete('/messages/:messageId', protect, deleteMessage);

export default router;
