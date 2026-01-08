import XLSX from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs';

// Stopwords (palabras comunes que no aportan valor al matching)
const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'un', 'una', 'con', 'para',
  'en', 'al', 'a', 'por', 'sin', 'que', 'su', 'se', 'le'
]);

/**
 * Parse uploaded file (CSV or Excel) and return array of objects
 * Supports both file path (disk storage) and buffer (memory storage)
 */
export function parseFile(filePathOrBuffer, originalName = '') {
  // Determine if we have a buffer or a file path
  const isBuffer = Buffer.isBuffer(filePathOrBuffer);
  const ext = isBuffer
    ? originalName.toLowerCase().split('.').pop()
    : filePathOrBuffer.toLowerCase().split('.').pop();

  if (ext === 'csv') {
    let fileContent;
    if (isBuffer) {
      fileContent = filePathOrBuffer.toString('utf8');
    } else {
      fileContent = fs.readFileSync(filePathOrBuffer, 'utf8');
    }
    const result = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep everything as strings for UPC
    });
    return result.data;
  } else if (ext === 'xlsx' || ext === 'xls') {
    let workbook;
    if (isBuffer) {
      workbook = XLSX.read(filePathOrBuffer, { type: 'buffer' });
    } else {
      workbook = XLSX.readFile(filePathOrBuffer);
    }
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  throw new Error(`Unsupported file format: ${ext}`);
}

/**
 * Normalize column names to expected format (UPC, Item)
 */
function normalizeData(data) {
  return data.map(row => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      const lowerKey = key.toLowerCase().trim();

      // Map common variations to standard names
      if (lowerKey === 'upc' || lowerKey === 'ean' || lowerKey === 'sku' || lowerKey === 'codigo' || lowerKey === 'codigo de barras') {
        normalizedRow.UPC = String(row[key] || '').trim();
      } else if (lowerKey === 'item' || lowerKey === 'description' || lowerKey === 'descripcion' || lowerKey === 'producto' || lowerKey === 'nombre') {
        normalizedRow.Item = String(row[key] || '').trim();
      } else {
        // Keep other columns as-is
        normalizedRow[key] = row[key];
      }
    });

    return normalizedRow;
  });
}

/**
 * Clean and prepare text for fuzzy matching
 */
function cleanText(text) {
  if (!text) return '';

  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim();
}

/**
 * Create inverted index from comparison data
 * Maps: word -> Set of indices that contain that word
 * Filters out stopwords and very short words to improve matching quality
 */
function createInvertedIndex(comparisonData) {
  const invertedIndex = new Map();

  comparisonData.forEach((item, idx) => {
    const words = new Set(
      item.cleanItem
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w))
    );

    for (const word of words) {
      if (!invertedIndex.has(word)) {
        invertedIndex.set(word, new Set());
      }
      invertedIndex.get(word).add(idx);
    }
  });

  return invertedIndex;
}

/**
 * Find best matches using inverted index (much faster than Fuse.js)
 */
function findBestMatches(pivotCleanText, invertedIndex, comparisonData, maxResults) {
  const words = new Set(
    pivotCleanText
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );

  if (words.size === 0) {
    return [];
  }

  const matchedRecords = new Map();

  // Count word matches for each candidate
  for (const word of words) {
    if (invertedIndex.has(word)) {
      for (const idx of invertedIndex.get(word)) {
        matchedRecords.set(idx, (matchedRecords.get(idx) || 0) + 1);
      }
    }
  }

  if (matchedRecords.size === 0) {
    return [];
  }

  // Sort by match count (descending) and take top N
  const sortedMatches = Array.from(matchedRecords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults);

  // Calculate scores
  const totalWords = words.size;
  return sortedMatches.map(([idx, wordMatchCount]) => {
    const score = Math.round((wordMatchCount / totalWords) * 100);
    return {
      item: comparisonData[idx],
      score: Math.min(score, 100)
    };
  });
}

/**
 * Perform fuzzy matching between pivot and comparison data
 * @param {Function} onProgress - Optional callback for progress updates (current, total, percentage)
 */
export function performFuzzyMatching(pivotData, comparisonData, matchCount = 4, onProgress = null) {
  // Normalize both datasets
  const normalizedPivot = normalizeData(pivotData);
  const normalizedComparison = normalizeData(comparisonData);

  // Prepare comparison data with cleaned text
  const comparisonWithClean = normalizedComparison.map((item, index) => ({
    ...item,
    cleanItem: cleanText(item.Item || ''),
    originalIndex: index
  }));

  console.log('Creating inverted index for faster matching...');
  const invertedIndex = createInvertedIndex(comparisonWithClean);
  console.log(`Inverted index created with ${invertedIndex.size} unique words`);

  // Create UPC lookup map for exact matches
  const upcMap = new Map();
  normalizedComparison.forEach((item, index) => {
    if (item.UPC) {
      upcMap.set(String(item.UPC).trim(), index);
    }
  });

  const results = [];
  const totalItems = normalizedPivot.length;

  for (let itemIndex = 0; itemIndex < normalizedPivot.length; itemIndex++) {
    const pivotItem = normalizedPivot[itemIndex];
    const currentItem = itemIndex + 1;

    const result = {
      UPC: pivotItem.UPC || '',
      Item: pivotItem.Item || '',
      matches: []
    };

    const pivotUPC = String(pivotItem.UPC || '').trim();

    // First, check for exact UPC match
    if (pivotUPC && upcMap.has(pivotUPC)) {
      const exactMatchIndex = upcMap.get(pivotUPC);
      const exactMatch = normalizedComparison[exactMatchIndex];

      result.matches.push({
        matchType: 'Identical',
        suggestedUPC: exactMatch.UPC || '',
        suggestedDescription: exactMatch.Item || '',
        score: 100,
        urlSKU: exactMatch['URL SKU'] || exactMatch.URL || '',
        image: exactMatch.Image || exactMatch.Imagen || '',
        finalPrice: exactMatch['Final Price'] || exactMatch.Price || exactMatch.Precio || ''
      });
    }

    // Then, find fuzzy matches using inverted index
    const cleanPivotItem = cleanText(pivotItem.Item || '');

    if (cleanPivotItem) {
      // Calculate how many more matches we need
      const remainingSlots = matchCount - result.matches.length;

      const fuzzyResults = findBestMatches(
        cleanPivotItem,
        invertedIndex,
        comparisonWithClean,
        remainingSlots + 5
      );

      for (let i = 0; i < fuzzyResults.length; i++) {
        const fuzzyMatch = fuzzyResults[i];
        const matchedItem = fuzzyMatch.item;

        // Skip if this UPC was already added as exact match
        if (result.matches.some(m => m.suggestedUPC === matchedItem.UPC)) {
          continue;
        }

        result.matches.push({
          matchType: 'Suggested',
          suggestedUPC: matchedItem.UPC || '',
          suggestedDescription: matchedItem.Item || '',
          score: fuzzyMatch.score,
          urlSKU: matchedItem['URL SKU'] || matchedItem.URL || '',
          image: matchedItem.Image || matchedItem.Imagen || '',
          finalPrice: matchedItem['Final Price'] || matchedItem.Price || matchedItem.Precio || ''
        });

        // Stop if we have enough matches
        if (result.matches.length >= matchCount) {
          break;
        }
      }
    }

    // Ensure we have exactly matchCount results (pad with empty if needed)
    while (result.matches.length < matchCount) {
      result.matches.push({
        matchType: 'Suggested',
        suggestedUPC: '',
        suggestedDescription: '',
        score: 0,
        urlSKU: '',
        image: '',
        finalPrice: ''
      });
    }

    // Trim to matchCount
    result.matches = result.matches.slice(0, matchCount);

    results.push(result);

    // Report progress (every item for small datasets, every 10 items for large ones, or at milestones)
    if (onProgress) {
      const percentage = Math.round((currentItem / totalItems) * 100);
      const shouldReport = totalItems <= 100 || currentItem % 10 === 0 || currentItem === totalItems;

      if (shouldReport) {
        onProgress(currentItem, totalItems, percentage);
      }
    }
  }

  return results;
}

/**
 * Clean up uploaded files
 */
export function cleanupFiles(files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      console.error(`Error deleting file ${file.path}:`, err);
    }
  }
}
