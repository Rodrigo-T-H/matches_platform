import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determinar tipo de almacenamiento segun entorno
const isProduction = process.env.NODE_ENV === 'production';

// En produccion usar memoria, en desarrollo usar disco
let storage;

if (isProduction) {
  // Almacenamiento en memoria para Railway y otros servicios cloud
  storage = multer.memoryStorage();
} else {
  // Almacenamiento en disco para desarrollo local
  const uploadsDir = path.join(__dirname, '../../uploads');

  // Crear directorio de uploads si no existe
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype) ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Helper para obtener el buffer del archivo (funciona tanto en memoria como disco)
export const getFileBuffer = (file) => {
  if (file.buffer) {
    // Archivo en memoria
    return file.buffer;
  } else if (file.path) {
    // Archivo en disco
    return fs.readFileSync(file.path);
  }
  throw new Error('No se pudo leer el archivo');
};

// Helper para limpiar archivo temporal (solo en modo disco)
export const cleanupFile = (file) => {
  if (file.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};
