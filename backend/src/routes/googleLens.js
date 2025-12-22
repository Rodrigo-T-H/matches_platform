import express from 'express';
import { upload } from '../config/multer.js';
import {
  searchByImageUrl,
  searchByUploadedImage,
  cleanupImageFile
} from '../services/googleLensService.js';

const router = express.Router();

/**
 * POST /api/google-lens/search
 * Search Google Lens using an image URL
 */
router.post('/search', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una URL de imagen (imageUrl)'
      });
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URL de imagen inválida'
      });
    }

    console.log(`Searching Google Lens for: ${imageUrl}`);

    const results = await searchByImageUrl(imageUrl);

    res.json({
      success: true,
      results,
      imageUrl
    });

  } catch (error) {
    console.error('Google Lens error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Error al buscar la imagen'
    });
  }
});

/**
 * POST /api/google-lens/upload-search
 * Upload an image and search Google Lens
 * Note: Currently not fully implemented as Oxylabs requires a URL
 */
router.post('/upload-search', upload.single('image'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen'
      });
    }

    filePath = req.file.path;

    console.log(`Processing uploaded image: ${req.file.originalname}`);

    const results = await searchByUploadedImage(filePath);

    // Clean up the uploaded file
    cleanupImageFile(filePath);

    res.json({
      success: true,
      results,
      imageUrl: `uploaded:${req.file.originalname}`
    });

  } catch (error) {
    console.error('Error in Google Lens upload search:', error);

    // Clean up on error
    if (filePath) {
      cleanupImageFile(filePath);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar la imagen'
    });
  }
});

/**
 * POST /api/google-lens/batch-search
 * Search Google Lens for multiple image URLs with SSE progress
 */
router.post('/batch-search', async (req, res) => {
  console.log('=== BATCH SEARCH REQUEST RECEIVED ===');
  try {
    const { imageUrls } = req.body;

    console.log('Request body:', { imageUrlsCount: imageUrls?.length });

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.error('Invalid request: missing or empty imageUrls array');
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de URLs de imágenes'
      });
    }

    console.log(`✓ Starting batch Google Lens search for ${imageUrls.length} images`);

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send start event
    sendEvent({
      type: 'start',
      message: `Iniciando búsqueda de ${imageUrls.length} imágenes...`,
      totalImages: imageUrls.length
    });

    // Process each image URL
    const results = [];
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const imageUrl of imageUrls) {
      console.log(`\n--- Processing image ${processed + 1}/${imageUrls.length}: ${imageUrl.substring(0, 80)}...`);
      try {
        // Validate URL
        new URL(imageUrl);
        console.log('✓ URL validated');

        // Send progress update
        sendEvent({
          type: 'progress',
          current: processed + 1,
          total: imageUrls.length,
          percentage: Math.round(((processed + 1) / imageUrls.length) * 100),
          message: `Procesando imagen ${processed + 1} de ${imageUrls.length}...`,
          successCount,
          errorCount
        });
        console.log('✓ Progress event sent');

        // Add delay between requests to avoid rate limiting (except for first request)
        if (processed > 0) {
          console.log(`⏱ Waiting 1.5s before next request...`);
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
        }

        console.log('🔍 Calling searchByImageUrl...');
        const searchResults = await searchByImageUrl(imageUrl);
        console.log(`✓ Got ${searchResults.length} results`);

        results.push({
          imageUrl,
          success: true,
          results: searchResults.slice(0, 15), // Top 15 results
          resultCount: searchResults.length
        });

        processed++;
        successCount++;
      } catch (error) {
        console.error(`Error processing ${imageUrl}:`, error.message);
        results.push({
          imageUrl,
          success: false,
          error: error.message,
          results: [],
          resultCount: 0
        });
        processed++;
        errorCount++;

        // Send error event for this specific image
        sendEvent({
          type: 'image-error',
          imageUrl,
          error: error.message,
          current: processed,
          total: imageUrls.length
        });
      }
    }

    console.log(`✓ Batch search complete. Processed ${processed} images (${successCount} success, ${errorCount} errors)`);

    // Send individual result events (to avoid JSON size limits)
    console.log('Sending individual results via SSE...');
    for (let i = 0; i < results.length; i++) {
      sendEvent({
        type: 'result',
        index: i,
        result: results[i]
      });
    }

    // Send completion event (without full results to keep it small)
    console.log('Sending completion event...');
    sendEvent({
      type: 'complete',
      success: true,
      totalImages: imageUrls.length,
      successCount,
      errorCount,
      message: `Búsqueda completada. ${successCount} exitosas, ${errorCount} con errores.`
    });

    console.log('✓ All events sent, closing connection');
    res.end();

  } catch (error) {
    console.error('Batch Google Lens error:', error.message);

    // Only send error event if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al procesar las imágenes'
      });
    } else {
      // Send error event via SSE
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message || 'Error al procesar las imágenes'
      })}\n\n`);
      res.end();
    }
  }
});

export default router;
