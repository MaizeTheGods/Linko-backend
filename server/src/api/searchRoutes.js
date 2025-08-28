import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { searchUsers, searchPosts } from '../controllers/searchController.js';

const router = Router();

// Public endpoints; if token present we'll have req.user via optionalAuth
router.get('/users', optionalAuth, searchUsers);
router.get('/posts', optionalAuth, searchPosts);

export default router;
