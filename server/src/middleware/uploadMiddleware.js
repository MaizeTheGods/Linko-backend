import multer from 'multer';
import os from 'os';
import path from 'path';

// Usamos diskStorage para soportar archivos grandes (videos ~10min)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes o videos'), false);
  }
};

// Límite aumentado: 200MB por archivo
export const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });
