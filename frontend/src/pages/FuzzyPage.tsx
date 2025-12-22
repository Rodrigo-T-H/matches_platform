import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import ResultsTable from '../components/ResultsTable';
import { processFuzzyMatchingWithProgress } from '../services/api';
import { FuzzyResult } from '../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './FuzzyPage.css';

const FuzzyPage: React.FC = () => {
  const [pivotFile, setPivotFile] = useState<File | null>(null);
  const [comparisonFile, setComparisonFile] = useState<File | null>(null);
  const [matchCount, setMatchCount] = useState<number>(4);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<FuzzyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState<{
    totalPivot: number;
    totalComparison: number;
    processingTime: number;
  } | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [progressCurrent, setProgressCurrent] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(0);

  const handleProcess = async () => {
    if (!pivotFile || !comparisonFile) {
      setError('Por favor selecciona ambos archivos');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProcessingStats(null);
    setProgressMessage('');
    setProgressPercentage(0);
    setProgressCurrent(0);
    setProgressTotal(0);

    try {
      const response = await processFuzzyMatchingWithProgress(
        pivotFile,
        comparisonFile,
        matchCount,
        (current, total, percentage, message) => {
          setProgressCurrent(current);
          setProgressTotal(total);
          setProgressPercentage(percentage);
          setProgressMessage(message);
        }
      );

      if (response.success) {
        setResults(response.results);
        setProcessingStats({
          totalPivot: response.totalPivot,
          totalComparison: response.totalComparison,
          processingTime: response.processingTime,
        });
        setProgressMessage('¡Procesamiento completado!');
      } else {
        setError(response.error || 'Error procesando los archivos');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexion con el servidor'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResults = () => {
    if (results.length === 0) return;

    // Transform results to flat structure for Excel
    const flatResults = results.map((result) => {
      const row: Record<string, string | number> = {
        'UPC Pivote': result.UPC,
        'Descripcion Pivote': result.Item,
      };

      result.matches.forEach((match, index) => {
        const num = index + 1;
        row[`Tipo Comparacion ${num}`] = match.matchType === 'Identical' ? 'Identico' : 'Sugerido';
        row[`UPC Sugerido ${num}`] = match.suggestedUPC;
        row[`Descripcion Sugerido ${num}`] = match.suggestedDescription;
        row[`Puntuacion ${num}`] = match.score;
        row[`URL SKU ${num}`] = match.urlSKU || '';
        row[`Imagen ${num}`] = match.image || '';
        row[`Precio Final ${num}`] = match.finalPrice || '';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(flatResults);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const date = new Date().toISOString().split('T')[0];
    saveAs(blob, `fuzzy_matching_results_${date}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    // Create template data
    const templateData = [
      { UPC: '7501234567890', Item: 'Ejemplo Producto 1' },
      { UPC: '7501234567891', Item: 'Ejemplo Producto 2' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Set column widths
    worksheet['!cols'] = [{ wch: 15 }, { wch: 50 }];

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, 'template_fuzzy_matching.xlsx');
  };

  return (
    <div className="fuzzy-page">
      <div className="page-header">
        <div>
          <h1>Fuzzy Matching de Productos</h1>
          <p className="page-description">
            Compara listados de productos para encontrar coincidencias basadas en
            similitud de descripciones. Ideal para comparar marcas propias,
            productos de diferentes cadenas, o encontrar productos equivalentes.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleDownloadTemplate}
        >
          Descargar Template
        </button>
      </div>

      <div className="upload-section">
        <div className="upload-grid">
          <FileUploader
            label="Archivo Pivote"
            description="Este es el archivo base con los productos que deseas comparar. Cada producto sera comparado contra el archivo de comparacion."
            acceptedFormats=".csv, .xlsx, .xls"
            file={pivotFile}
            onFileSelect={setPivotFile}
          />

          <FileUploader
            label="Archivo de Comparacion"
            description="Este archivo contiene los productos contra los cuales se buscaran coincidencias para cada producto del archivo pivote."
            acceptedFormats=".csv, .xlsx, .xls"
            file={comparisonFile}
            onFileSelect={setComparisonFile}
          />
        </div>

        <div className="options-section">
          <div className="option-group">
            <label htmlFor="matchCount">Cantidad de coincidencias por producto:</label>
            <select
              id="matchCount"
              value={matchCount}
              onChange={(e) => setMatchCount(Number(e.target.value))}
            >
              <option value={2}>2 coincidencias</option>
              <option value={3}>3 coincidencias</option>
              <option value={4}>4 coincidencias</option>
              <option value={5}>5 coincidencias</option>
            </select>
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
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="progress-info">
              <span className="progress-text">{progressMessage}</span>
              {progressTotal > 0 && (
                <span className="progress-stats">
                  {progressCurrent} / {progressTotal} ({progressPercentage}%)
                </span>
              )}
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button
            type="button"
            onClick={handleProcess}
            disabled={!pivotFile || !comparisonFile || isProcessing}
            className="btn-primary"
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Procesando...
              </>
            ) : (
              'Procesar Archivos'
            )}
          </button>

          {results.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadResults}
              className="btn-success"
            >
              Descargar Resultados
            </button>
          )}
        </div>
      </div>

      {processingStats && (
        <div className="stats-section">
          <div className="stat-card">
            <span className="stat-value">{processingStats.totalPivot}</span>
            <span className="stat-label">Productos Pivote</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{processingStats.totalComparison}</span>
            <span className="stat-label">Productos Comparacion</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {(processingStats.processingTime / 1000).toFixed(2)}s
            </span>
            <span className="stat-label">Tiempo de Proceso</span>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="results-section">
          <h2>Resultados ({results.length} productos procesados)</h2>
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  );
};

export default FuzzyPage;
