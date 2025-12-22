import express from 'express';
import { upload } from '../config/multer.js';
import { parseFile, performFuzzyMatching, cleanupFiles } from '../services/fuzzyService.js';

const router = express.Router();

/**
 * POST /api/fuzzy/process
 * Process two files and return fuzzy matching results with SSE progress updates
 */
router.post('/process', upload.fields([
  { name: 'pivotFile', maxCount: 1 },
  { name: 'comparisonFile', maxCount: 1 }
]), async (req, res) => {
  console.log('=== FUZZY PROCESS REQUEST RECEIVED ===');
  const startTime = Date.now();
  const files = [];

  try {
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');

    // Validate files
    if (!req.files?.pivotFile?.[0] || !req.files?.comparisonFile?.[0]) {
      console.log('ERROR: Missing files');
      return res.status(400).json({
        success: false,
        error: 'Se requieren ambos archivos: pivotFile y comparisonFile'
      });
    }

    const pivotFile = req.files.pivotFile[0];
    const comparisonFile = req.files.comparisonFile[0];

    files.push(pivotFile, comparisonFile);

    // Get match count from request
    const matchCount = parseInt(req.body.matchCount) || 4;

    if (matchCount < 1 || matchCount > 10) {
      return res.status(400).json({
        success: false,
        error: 'matchCount debe estar entre 1 y 10'
      });
    }

    console.log(`Processing files: ${pivotFile.originalname} vs ${comparisonFile.originalname}`);
    console.log(`Match count: ${matchCount}`);

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper to send SSE messages
    const sendProgress = (current, total, percentage) => {
      const data = {
        type: 'progress',
        current,
        total,
        percentage,
        message: `Procesando ${current} de ${total} productos (${percentage}%)`
      };
      console.log(`Progress: ${current}/${total} (${percentage}%)`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const sendComplete = (results, stats) => {
      const data = {
        type: 'complete',
        success: true,
        results,
        ...stats
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.end();
    };

    const sendError = (errorMessage) => {
      const data = {
        type: 'error',
        success: false,
        error: errorMessage
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.end();
    };

    // Send initial progress
    res.write(`data: ${JSON.stringify({ type: 'start', message: 'Iniciando procesamiento...' })}\n\n`);

    // Parse files
    console.log('Parsing pivot file:', pivotFile.path);
    const pivotData = parseFile(pivotFile.path);
    console.log('Pivot data parsed:', pivotData.length, 'items');

    console.log('Parsing comparison file:', comparisonFile.path);
    const comparisonData = parseFile(comparisonFile.path);
    console.log('Comparison data parsed:', comparisonData.length, 'items');

    console.log(`Pivot items: ${pivotData.length}, Comparison items: ${comparisonData.length}`);

    // Validate parsed data
    if (!pivotData || pivotData.length === 0) {
      sendError('El archivo pivote está vacío o no tiene el formato correcto');
      cleanupFiles(files);
      return;
    }

    if (!comparisonData || comparisonData.length === 0) {
      sendError('El archivo de comparación está vacío o no tiene el formato correcto');
      cleanupFiles(files);
      return;
    }

    // Send parsing complete
    res.write(`data: ${JSON.stringify({
      type: 'parsing',
      message: `Archivos parseados: ${pivotData.length} productos pivote, ${comparisonData.length} productos de comparación`
    })}\n\n`);

    // Perform fuzzy matching with progress callback
    console.log('Starting fuzzy matching...');
    const results = performFuzzyMatching(
      pivotData,
      comparisonData,
      matchCount,
      sendProgress
    );

    const processingTime = Date.now() - startTime;

    console.log(`Processing completed in ${processingTime}ms`);
    console.log(`Total results: ${results.length}`);

    // Clean up files
    cleanupFiles(files);

    // Send completion
    sendComplete(results, {
      totalPivot: pivotData.length,
      totalComparison: comparisonData.length,
      processingTime
    });

  } catch (error) {
    console.error('Error processing fuzzy matching:', error);

    // Clean up files on error
    cleanupFiles(files);

    // If headers already sent (SSE mode), send error via SSE
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        success: false,
        error: error.message || 'Error al procesar los archivos'
      })}\n\n`);
      res.end();
    } else {
      // Otherwise send normal JSON error
      res.status(500).json({
        success: false,
        error: error.message || 'Error al procesar los archivos'
      });
    }
  }
});

export default router;
