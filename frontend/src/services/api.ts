import axios from 'axios';
import { FuzzyProcessingResponse, GoogleLensResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for large file processing
});

// Progress callback type
export type ProgressCallback = (current: number, total: number, percentage: number, message: string) => void;

// Fuzzy Matching API with SSE progress
export const processFuzzyMatchingWithProgress = async (
  pivotFile: File,
  comparisonFile: File,
  matchCount: number = 4,
  onProgress?: ProgressCallback
): Promise<FuzzyProcessingResponse> => {
  const formData = new FormData();
  formData.append('pivotFile', pivotFile);
  formData.append('comparisonFile', comparisonFile);
  formData.append('matchCount', matchCount.toString());

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/fuzzy/process`;

    console.log('Starting fuzzy matching request to:', url);
    console.log('Files:', pivotFile.name, 'vs', comparisonFile.name);
    console.log('Match count:', matchCount);

    xhr.open('POST', url, true);

    let buffer = '';

    xhr.onprogress = () => {
      const text = xhr.responseText.substring(buffer.length);
      buffer = xhr.responseText;

      const lines = text.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            console.log('SSE received:', data);

            if (data.type === 'start') {
              onProgress?.(0, 0, 0, data.message);
            } else if (data.type === 'parsing') {
              onProgress?.(0, 0, 0, data.message);
            } else if (data.type === 'progress') {
              onProgress?.(data.current, data.total, data.percentage, data.message);
            } else if (data.type === 'complete') {
              resolve(data);
            } else if (data.type === 'error') {
              reject(new Error(data.error || 'Error desconocido'));
            }
          } catch (err) {
            console.error('Error parsing SSE data:', err);
          }
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Error de red al procesar archivos'));
    };

    xhr.onabort = () => {
      reject(new Error('Procesamiento cancelado'));
    };

    xhr.send(formData);
  });
};

// Legacy method without progress (for backwards compatibility)
export const processFuzzyMatching = async (
  pivotFile: File,
  comparisonFile: File,
  matchCount: number = 4
): Promise<FuzzyProcessingResponse> => {
  return processFuzzyMatchingWithProgress(pivotFile, comparisonFile, matchCount);
};

// Google Lens API
export const searchGoogleLens = async (imageUrl: string): Promise<GoogleLensResponse> => {
  console.log('=== GOOGLE LENS SEARCH REQUEST ===');
  console.log('Full URL:', `${API_BASE_URL}/google-lens/search`);
  console.log('Image URL:', imageUrl);

  const response = await api.post<GoogleLensResponse>('/google-lens/search', {
    imageUrl,
  });

  console.log('Response status:', response.status);
  console.log('Response data:', response.data);

  return response.data;
};

export const uploadImageAndSearch = async (imageFile: File): Promise<GoogleLensResponse> => {
  console.log('=== GOOGLE LENS UPLOAD SEARCH REQUEST ===');
  console.log('Full URL:', `${API_BASE_URL}/google-lens/upload-search`);
  console.log('Image file:', imageFile.name, 'Size:', imageFile.size);

  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await api.post<GoogleLensResponse>('/google-lens/upload-search', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  console.log('Response status:', response.status);
  console.log('Response data:', response.data);

  return response.data;
};

// Batch Google Lens search
export interface BatchSearchResult {
  imageUrl: string;
  success: boolean;
  results: any[];
  resultCount: number;
  error?: string;
}

export interface BatchSearchResponse {
  success: boolean;
  totalImages: number;
  successCount: number;
  errorCount: number;
  results: BatchSearchResult[];
  message?: string;
}

export const batchSearchGoogleLens = async (
  imageUrls: string[],
  onProgress?: ProgressCallback
): Promise<BatchSearchResponse> => {
  console.log('=== BATCH GOOGLE LENS SEARCH REQUEST ===');
  console.log('Total images:', imageUrls.length);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/google-lens/batch-search`;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    let buffer = '';
    const accumulatedResults: BatchSearchResult[] = [];

    xhr.onprogress = () => {
      const text = xhr.responseText.substring(buffer.length);
      buffer = xhr.responseText;

      const lines = text.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            console.log('SSE received:', data.type);

            if (data.type === 'start') {
              onProgress?.(0, data.totalImages, 0, data.message);
            } else if (data.type === 'progress') {
              onProgress?.(data.current, data.total, data.percentage, data.message);
            } else if (data.type === 'result') {
              // Accumulate individual results
              accumulatedResults[data.index] = data.result;
              console.log(`Result ${data.index + 1} received`);
            } else if (data.type === 'image-error') {
              console.warn(`Error en imagen ${data.imageUrl}:`, data.error);
              // Continue processing, don't reject
            } else if (data.type === 'complete') {
              // Add accumulated results to response
              console.log(`Complete event received. Total results: ${accumulatedResults.length}`);
              resolve({
                ...data,
                results: accumulatedResults
              });
            } else if (data.type === 'error') {
              reject(new Error(data.error || 'Error desconocido'));
            }
          } catch (err) {
            console.error('Error parsing SSE data:', err);
          }
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Error de red al procesar imágenes'));
    };

    xhr.onabort = () => {
      reject(new Error('Procesamiento cancelado'));
    };

    xhr.send(JSON.stringify({ imageUrls }));
  });
};

// Download template
export const downloadTemplate = (templateName: string): void => {
  window.open(`${API_BASE_URL}/templates/${templateName}`, '_blank');
};

export default api;
