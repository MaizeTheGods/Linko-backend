import express from 'express';
const router = express.Router();

router.get('/unread-count', (req, res) => {
    res.json({ count: 0 }); // Temporary implementation
});

export default router;
