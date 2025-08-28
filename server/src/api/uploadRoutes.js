import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadImages } from '../controllers/uploadController.js';

const router = Router();

// Subida de imágenes (protegido)
router.post(
  '/upload',
  // Log de llegada a la ruta (antes de auth)
  (req, _res, next) => { try { console.info('[UPLOAD_ROUTE] hit', { hasAuth: !!req.headers?.authorization }); } catch {} next(); },
  protect,
  (req, res, next) => {
    upload.array('images', 5)(req, res, (err) => {
      if (!err) return next();
      // Multer error handling
      const isSize = err?.code === 'LIMIT_FILE_SIZE';
      const status = isSize ? 400 : 400;
      return res.status(status).json({
        message: isSize ? 'Archivo demasiado grande (máx 200MB)' : (err?.message || 'Error de carga de archivos'),
        code: err?.code,
      });
    });
  },
  uploadImages
);

export default router;
