import axios from 'axios';
import fs from 'fs';

/**
 * Delay utility for rate limiting
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search Google Lens via Oxylabs API using image URL with retry logic
 */
export async function searchByImageUrl(imageUrl, retries = 2) {
  const username = process.env.OXYLABS_USERNAME;
  const password = process.env.OXYLABS_PASSWORD;

  if (!username || !password) {
    throw new Error('Oxylabs credentials not configured. Please set OXYLABS_USERNAME and OXYLABS_PASSWORD in .env');
  }

  const payload = {
    source: 'google_lens',
    query: imageUrl,
    geo_location: process.env.OXYLABS_GEO_LOCATION || 'Mexico',
    parse: true
  };

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${retries} for ${imageUrl}`);
        await delay(2000 * attempt); // Exponential backoff: 2s, 4s, 6s
      }

      console.log(`Calling Oxylabs API... (attempt ${attempt + 1}/${retries + 1})`);

      const response = await axios.post(
        'https://realtime.oxylabs.io/v1/queries',
        payload,
        {
          auth: {
            username,
            password
          },
          timeout: 180000 // 180 second timeout (3 minutes) for batch processing
        }
      );

      const parsedResults = parseOxylabsResponse(response.data);
      console.log(`✓ Google Lens search complete. Found ${parsedResults.length} results`);

      return parsedResults;
    } catch (error) {
      lastError = error;
      console.error(`Oxylabs API error (attempt ${attempt + 1}):`, error.response?.data || error.message);

      // Don't retry for authentication or payment errors
      if (error.response?.status === 401) {
        throw new Error('Credenciales de Oxylabs inválidas');
      }

      if (error.response?.status === 402) {
        throw new Error('Saldo insuficiente en cuenta de Oxylabs');
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw new Error(`Error al buscar imagen después de ${retries + 1} intentos: ${error.message}`);
      }

      // Otherwise, continue to next retry
      console.log(`Will retry in ${2000 * (attempt + 1)}ms...`);
    }
  }

  // This should never be reached, but just in case
  throw new Error(`Error al buscar imagen: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Search Google Lens via Oxylabs API using uploaded image
 * Note: Oxylabs requires a URL, so we need to host the image temporarily
 * For now, this will return an error asking to use URL mode
 */
export async function searchByUploadedImage(filePath) {
  // Oxylabs Google Lens API requires a URL, not a file upload
  // Options to handle this:
  // 1. Upload image to a temporary hosting service
  // 2. Use a local server to serve the image
  // 3. Use a different API that supports direct file upload

  // For now, we'll throw an informative error
  throw new Error(
    'La búsqueda por imagen subida no está disponible actualmente. ' +
    'Por favor, usa una URL de imagen pública. ' +
    'Puedes subir tu imagen a un servicio como Imgur o usar la URL directa del producto.'
  );

  // Future implementation could look like this:
  // 1. Upload to temporary image hosting
  // 2. Get public URL
  // 3. Call searchByImageUrl with that URL
  // 4. Clean up temporary image
}

/**
 * Parse Oxylabs response into standardized format
 */
function parseOxylabsResponse(data) {
  const results = [];

  try {
    // Oxylabs returns results in different structures
    const content = data.results?.[0]?.content;

    if (!content) {
      return results;
    }

    // Try to extract from different possible locations
    // Oxylabs may nest results in content.results.organic or directly in content.organic
    const nestedResults = content.results || {};

    const allMatches = [
      ...(content.visual_matches || []),
      ...(content.products || []),
      ...(content.organic || []),
      ...(content.inline_shopping || []),
      ...(content.related_content || []),
      // Also check nested structure
      ...(nestedResults.visual_matches || []),
      ...(nestedResults.products || []),
      ...(nestedResults.organic || []),
      ...(nestedResults.inline_shopping || []),
      ...(nestedResults.related_content || [])
    ];

    for (const match of allMatches) {
      if (!match) continue;

      // Avoid duplicates
      if (results.some(r => r.link === match.link || r.link === match.url)) {
        continue;
      }

      const result = {
        title: match.title || match.name || 'Sin título',
        link: match.link || match.url || '',
        source: extractDomain(match.link || match.url) || match.source || match.domain || 'Desconocido',
        thumbnail: match.thumbnail || match.image || match.url_thumbnail || '',
        price: formatPrice(match.price)
      };

      if (result.link) {
        results.push(result);
      }
    }

  } catch (error) {
    console.error('Error parsing Oxylabs response:', error);
  }

  // Limit to first 20 results
  return results.slice(0, 20);
}

/**
 * Format price from different possible structures
 */
function formatPrice(price) {
  if (!price) return '';

  if (typeof price === 'string') {
    return price;
  }

  if (price.value) {
    const currency = price.currency || '$';
    return `${currency}${price.value}`;
  }

  return '';
}

/**
 * Extract domain name from URL
 */
function extractDomain(url) {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Clean up uploaded image file
 */
export function cleanupImageFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Error deleting image file ${filePath}:`, err);
  }
}
