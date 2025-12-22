import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fuzzyRoutes from './routes/fuzzy.js';
import googleLensRoutes from './routes/googleLens.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/fuzzy', fuzzyRoutes);
app.use('/api/google-lens', googleLensRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo excede el tamaño máximo permitido (50MB)'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API endpoints:`);
  console.log(`   - POST /api/fuzzy/process`);
  console.log(`   - POST /api/google-lens/search`);
  console.log(`   - POST /api/google-lens/upload-search`);
  console.log(`   - GET  /api/health`);
});
