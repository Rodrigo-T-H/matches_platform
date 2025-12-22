import React, { useState } from 'react';
import { batchSearchGoogleLens, BatchSearchResult } from '../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './BatchGoogleLens.css';

interface ImageData {
  url: string;
  upc?: string;
  item?: string;
}

const BatchGoogleLens: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<BatchSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract URLs and additional columns (UPC, Item)
        const extractedData = extractDataFromFile(jsonData as any[][]);

        if (extractedData.length === 0) {
          setError('No se encontraron URLs válidas en el archivo. Asegúrate de que haya una columna llamada "URL", "Image URL", "url", o similar.');
          setImageData([]);
          return;
        }

        setImageData(extractedData);
        console.log(`Found ${extractedData.length} URLs in file with additional data`);
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Error al leer el archivo. Asegúrate de que sea un archivo CSV o Excel válido.');
        setImageData([]);
      }
    };

    reader.onerror = () => {
      setError('Error al cargar el archivo');
      setImageData([]);
    };

    reader.readAsBinaryString(file);
  };

  const extractDataFromFile = (data: any[][]): ImageData[] => {
    if (data.length === 0) return [];

    // Get header row (first row)
    const headers = data[0];

    // Find column indices
    let urlColumnIndex = -1;
    let upcColumnIndex = -1;
    let itemColumnIndex = -1;

    const urlPatterns = ['url', 'image url', 'imageurl', 'imagen', 'link', 'enlace'];
    const upcPatterns = ['upc', 'ean', 'sku', 'codigo', 'código'];
    const itemPatterns = ['item', 'description', 'descripcion', 'descripción', 'producto', 'nombre', 'name'];

    headers.forEach((header, index) => {
      const headerLower = String(header).toLowerCase().trim();

      // Find URL column
      if (urlColumnIndex === -1 && urlPatterns.some(pattern => headerLower.includes(pattern))) {
        urlColumnIndex = index;
      }

      // Find UPC column
      if (upcColumnIndex === -1 && upcPatterns.some(pattern => headerLower.includes(pattern))) {
        upcColumnIndex = index;
      }

      // Find Item column
      if (itemColumnIndex === -1 && itemPatterns.some(pattern => headerLower.includes(pattern))) {
        itemColumnIndex = index;
      }
    });

    // If no URL column found by name, try to find column with URL-like values
    if (urlColumnIndex === -1) {
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const sampleValue = data[1]?.[colIndex];
        if (sampleValue && String(sampleValue).match(/^https?:\/\//)) {
          urlColumnIndex = colIndex;
          break;
        }
      }
    }

    if (urlColumnIndex === -1) {
      return [];
    }

    // Extract data from all identified columns
    const extractedData: ImageData[] = [];
    for (let i = 1; i < data.length; i++) {
      const url = data[i][urlColumnIndex];
      if (url && String(url).trim().length > 0) {
        const urlStr = String(url).trim();
        // Validate it's a URL
        if (urlStr.match(/^https?:\/\/.+/)) {
          const imageData: ImageData = {
            url: urlStr
          };

          // Add UPC if column exists
          if (upcColumnIndex !== -1 && data[i][upcColumnIndex]) {
            imageData.upc = String(data[i][upcColumnIndex]).trim();
          }

          // Add Item if column exists
          if (itemColumnIndex !== -1 && data[i][itemColumnIndex]) {
            imageData.item = String(data[i][itemColumnIndex]).trim();
          }

          extractedData.push(imageData);
        }
      }
    }

    return extractedData;
  };

  const handleBatchSearch = async () => {
    if (imageData.length === 0) {
      setError('Por favor carga un archivo con URLs de imágenes');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: imageData.length });

    try {
      const urls = imageData.map(img => img.url);

      // Progress callback for SSE
      const handleProgress = (current: number, total: number, percentage: number, message: string) => {
        console.log(`Progress: ${current}/${total} (${percentage}%) - ${message}`);
        setProgress({ current, total });
      };

      const response = await batchSearchGoogleLens(urls, handleProgress);

      if (response.success) {
        setResults(response.results);
        setProgress({ current: response.totalImages, total: response.totalImages });

        // Show summary message
        if (response.errorCount > 0) {
          setError(
            `Búsqueda completada con advertencias: ${response.successCount} imágenes procesadas exitosamente, ${response.errorCount} fallaron. ` +
            `Revisa los resultados para ver los detalles.`
          );
        }
      } else {
        setError('Error al procesar las imágenes');
      }
    } catch (err) {
      console.error('Batch search error:', err);

      // Provide more specific error messages
      let errorMessage = 'Error de conexión con el servidor';

      if (err instanceof Error) {
        if (err.message.includes('Credenciales de Oxylabs')) {
          errorMessage = 'Error: Credenciales de Oxylabs inválidas. Por favor verifica la configuración del backend.';
        } else if (err.message.includes('Saldo insuficiente')) {
          errorMessage = 'Error: Saldo insuficiente en la cuenta de Oxylabs.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Error: Timeout al procesar las imágenes. Intenta con menos imágenes o verifica tu conexión.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    if (results.length === 0) return;

    // Create Excel data
    const excelData: any[] = [];

    results.forEach((result) => {
      const imageUrl = result.imageUrl;

      // Find the original image data (UPC and Item)
      const originalData = imageData.find(img => img.url === imageUrl);

      if (result.success && result.results.length > 0) {
        // Add top 15 results for each image
        result.results.forEach((match, index) => {
          excelData.push({
            'Image URL': imageUrl,
            'UPC': originalData?.upc || '',
            'Item': originalData?.item || '',
            'Result #': index + 1,
            'Title': match.title || '',
            'Link': match.link || '',
            'Source': match.source || '',
            'Price': match.price || '',
            'Thumbnail': match.thumbnail || ''
          });
        });
      } else {
        // Add row indicating no results or error
        excelData.push({
          'Image URL': imageUrl,
          'UPC': originalData?.upc || '',
          'Item': originalData?.item || '',
          'Result #': 0,
          'Title': result.error || 'No se encontraron resultados',
          'Link': '',
          'Source': '',
          'Price': '',
          'Thumbnail': ''
        });
      }
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const columnWidths = [
      { wch: 50 }, // Image URL
      { wch: 15 }, // UPC
      { wch: 40 }, // Item
      { wch: 10 }, // Result #
      { wch: 50 }, // Title
      { wch: 50 }, // Link
      { wch: 20 }, // Source
      { wch: 15 }, // Price
      { wch: 50 }, // Thumbnail
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Google Lens Results');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Save file
    saveAs(data, `google_lens_batch_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleClear = () => {
    setUploadedFile(null);
    setImageData([]);
    setResults([]);
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  return (
    <div className="batch-google-lens">
      <h2>Búsqueda por Lotes</h2>
      <p className="batch-description">
        Sube un archivo CSV o Excel con una columna de URLs de imágenes para buscar productos similares
        para todas las imágenes a la vez. Los resultados se descargarán en un archivo Excel con el top 15 de cada imagen.
      </p>

      <div className="batch-upload-section">
        <label htmlFor="batchFile" className="upload-label">
          Seleccionar archivo CSV o Excel:
        </label>
        <div className="file-input-wrapper">
          <input
            id="batchFile"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="file-input"
          />
          <label htmlFor="batchFile" className="file-input-button">
            <svg
              className="upload-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {uploadedFile ? uploadedFile.name : 'Seleccionar archivo...'}
          </label>
        </div>

        {imageData.length > 0 && (
          <div className="url-count success">
            ✓ {imageData.length} URLs encontradas en el archivo
            {imageData.some(img => img.upc) && ' (con UPC)'}
            {imageData.some(img => img.item) && ' (con Item)'}
          </div>
        )}

        <div className="file-format-hint">
          <strong>Formato esperado:</strong> El archivo debe tener una columna con encabezado como "URL", "Image URL", "imagen", o similar.
          <br />
          <strong>Opcional:</strong> Puedes incluir columnas "UPC" y/o "Item" para agregar información adicional en los resultados.
        </div>
      </div>

      {error && (
        <div className="error-message">
          <svg
            className="error-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="progress-section">
          <div className="progress-text">
            Procesando imagen {progress.current} de {progress.total}...
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="batch-actions">
        <button
          type="button"
          onClick={handleBatchSearch}
          disabled={isProcessing || imageData.length === 0}
          className="btn-primary"
        >
          {isProcessing ? (
            <>
              <span className="spinner"></span>
              Procesando...
            </>
          ) : (
            'Buscar Productos Similares'
          )}
        </button>

        {results.length > 0 && !isProcessing && (
          <>
            <button
              type="button"
              onClick={downloadResults}
              className="btn-success"
            >
              <svg
                className="download-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Descargar Resultados (Excel)
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
            >
              Limpiar
            </button>
          </>
        )}
      </div>

      {results.length > 0 && !isProcessing && (
        <div className="batch-results-summary">
          <h3>Resumen de Resultados</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total de imágenes:</span>
              <span className="stat-value">{results.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Exitosas:</span>
              <span className="stat-value success">{results.filter(r => r.success).length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Con errores:</span>
              <span className="stat-value error">{results.filter(r => !r.success).length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total de resultados:</span>
              <span className="stat-value">
                {results.reduce((sum, r) => sum + r.resultCount, 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchGoogleLens;
