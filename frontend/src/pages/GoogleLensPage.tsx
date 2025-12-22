import React, { useState } from 'react';
import { searchGoogleLens, uploadImageAndSearch } from '../services/api';
import { GoogleLensResult } from '../types';
import BatchGoogleLens from '../components/BatchGoogleLens';
import './GoogleLensPage.css';

const GoogleLensPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'url' | 'upload'>('url');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GoogleLensResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setImagePreview(e.target.value);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSearch = async () => {
    if (searchMode === 'url' && !imageUrl) {
      setError('Por favor ingresa una URL de imagen');
      return;
    }

    if (searchMode === 'upload' && !imageFile) {
      setError('Por favor selecciona una imagen');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      let response;

      if (searchMode === 'url') {
        console.log('Searching Google Lens with URL:', imageUrl);
        response = await searchGoogleLens(imageUrl);
      } else if (imageFile) {
        console.log('Uploading image for search:', imageFile.name);
        response = await uploadImageAndSearch(imageFile);
      }

      console.log('Google Lens API response:', response);

      if (response?.success) {
        console.log('Results received:', response.results.length);
        setResults(response.results);
        if (response.results.length === 0) {
          setError('No se encontraron resultados para esta imagen');
        }
      } else {
        console.error('API returned error:', response?.error);
        setError(response?.error || 'Error al buscar la imagen');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexion con el servidor'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setResults([]);
    setError(null);
  };

  return (
    <div className="google-lens-page">
      <div className="page-header">
        <h1>Google Lens - Busqueda Visual</h1>
        <p className="page-description">
          Sube una imagen o proporciona una URL para encontrar productos similares
          en diferentes tiendas y paginas web. Ideal para encontrar competidores
          o productos equivalentes basados en la imagen del producto.
        </p>
      </div>

      <div className="search-section">
        <div className="search-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${searchMode === 'url' ? 'active' : ''}`}
            onClick={() => setSearchMode('url')}
          >
            Buscar por URL
          </button>
          <button
            type="button"
            className={`mode-btn ${searchMode === 'upload' ? 'active' : ''}`}
            onClick={() => setSearchMode('upload')}
          >
            Subir Imagen
          </button>
        </div>

        {searchMode === 'url' ? (
          <div className="url-input-section">
            <label htmlFor="imageUrl">URL de la imagen:</label>
            <input
              id="imageUrl"
              type="text"
              value={imageUrl}
              onChange={handleImageUrlChange}
              placeholder="https://ejemplo.com/imagen-producto.jpg"
              className="url-input"
            />
          </div>
        ) : (
          <div className="upload-section">
            <div
              className="image-drop-zone"
              onClick={() => document.getElementById('imageInput')?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="image-preview"
                />
              ) : (
                <div className="drop-placeholder">
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>Haz clic para seleccionar una imagen</p>
                  <p className="file-hint">PNG, JPG, WEBP hasta 10MB</p>
                </div>
              )}
            </div>
            <input
              id="imageInput"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </div>
        )}

        {searchMode === 'url' && imagePreview && (
          <div className="preview-section">
            <h3>Vista previa:</h3>
            <img
              src={imagePreview}
              alt="Preview"
              className="url-preview-image"
              onError={() => setImagePreview(null)}
            />
          </div>
        )}

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

        <div className="action-buttons">
          <button
            type="button"
            onClick={handleSearch}
            disabled={
              isSearching ||
              (searchMode === 'url' && !imageUrl) ||
              (searchMode === 'upload' && !imageFile)
            }
            className="btn-primary"
          >
            {isSearching ? (
              <>
                <span className="spinner"></span>
                Buscando...
              </>
            ) : (
              <>
                <svg
                  className="search-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Buscar Productos Similares
              </>
            )}
          </button>

          {(imageUrl || imageFile || results.length > 0) && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="results-section">
          <h2>Productos Similares Encontrados ({results.length})</h2>
          <div className="results-grid">
            {results.map((result, index) => (
              <div key={index} className="result-card">
                {result.thumbnail && (
                  <div className="result-thumbnail">
                    <img src={result.thumbnail} alt={result.title} />
                  </div>
                )}
                <div className="result-content">
                  <h3 className="result-title">{result.title}</h3>
                  <p className="result-source">{result.source}</p>
                  {result.price && (
                    <p className="result-price">{result.price}</p>
                  )}
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="result-link"
                  >
                    Ver producto
                    <svg
                      className="external-link-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Search Section */}
      <BatchGoogleLens />
    </div>
  );
};

export default GoogleLensPage;
