import fs from 'fs/promises';
import cloudinary from '../services/cloudinary.js';

// Subir una o varias imágenes a Cloudinary
// Espera archivos en req.files (multer memoryStorage)
export const uploadImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: 'No se recibieron imágenes' });
    try {
      // eslint-disable-next-line no-console
      console.info('[UPLOAD_CONTROLLER] received files', files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      })));
    } catch {}

    const archivos = [];
    for (const file of files) {
      const isVideo = file?.mimetype?.startsWith('video/');
      const isAvif = file?.mimetype === 'image/avif';
      const options = isVideo
        ? { folder: 'posts', resource_type: 'video' }
        : { folder: 'posts', resource_type: 'image', ...(isAvif ? { format: 'jpg' } : {}) };
      try {
        const result = await cloudinary.uploader.upload(file.path, options);
        const tipo = result.resource_type === 'video' ? 'VIDEO' : 'IMAGEN';
        archivos.push({ url: result.secure_url, tipo });
      } finally {
        // Clean temp file regardless of success to avoid filling disk
        try { if (file.path) await fs.unlink(file.path); } catch {}
      }
    }
    return res.json({ archivos });
  } catch (error) {
    try {
      // eslint-disable-next-line no-console
      console.error('[UPLOAD_CONTROLLER_ERROR]', {
        message: error?.message,
        name: error?.name,
        http_code: error?.http_code,
        cloudinary_code: error?.error?.code,
        cloudinary_message: error?.error?.message,
      });
    } catch {}
    // Evitar provocar logout en el cliente: si Cloudinary devuelve 401, lo tratamos como 502 (upstream error)
    const status = error?.http_code === 401 ? 502 : (error?.http_code || 500);
    return res.status(status).json({ message: 'Error al subir imágenes', error: {
      message: error?.message,
      name: error?.name,
      http_code: error?.http_code,
      cloudinary: error?.error?.message || undefined,
      cloudinary_code: error?.error?.code || undefined,
    }});
  }
};
