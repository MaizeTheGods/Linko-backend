import { Router } from 'express';
import { getUserProfile, followUser, unfollowUser, getMe, updateMe, updateEmail, updatePassword, listMyFollowRequests, approveFollowRequest, rejectFollowRequest, getBlockStatus, blockUser, unblockUser } from '../controllers/userController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Yo mismo (requiere auth)
router.get('/me', protect, getMe);

// Actualizaciones de perfil/cuenta
router.patch('/me', protect, updateMe);
router.patch('/me/email', protect, updateEmail);
router.patch('/me/password', protect, updatePassword);

// Solicitudes de seguimiento (para cuentas privadas)
router.get('/me/requests', protect, listMyFollowRequests);
router.post('/requests/:id/approve', protect, approveFollowRequest);
router.post('/requests/:id/reject', protect, rejectFollowRequest);

// Perfil: público, pero si hay token añadimos req.user para calcular isFollowing
router.get('/:nombre_usuario', optionalAuth, getUserProfile);

// Seguir / Dejar de seguir
router.post('/:id_seguido/follow', protect, followUser);
// Alias recomendado por especificación: DELETE /:id/follow
router.delete('/:id_seguido/follow', protect, unfollowUser);
// Compatibilidad previa: DELETE /:id/unfollow
router.delete('/:id_seguido/unfollow', protect, unfollowUser);

// Bloqueos de usuario (DM privacy)
router.get('/:id/blocks', protect, getBlockStatus);
router.post('/:id/block', protect, blockUser);
router.delete('/:id/block', protect, unblockUser);

export default router;
