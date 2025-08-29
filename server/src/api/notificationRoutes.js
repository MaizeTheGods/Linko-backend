import express from 'express';
const router = express.Router();

// Get unread notifications count
router.get('/unread-count', (req, res) => {
  res.json({ count: 0 }); // TODO: Implement actual logic
});

// Get all notifications
router.get('/', (req, res) => {
  res.json([]); // TODO: Implement actual logic
});

export default router;
