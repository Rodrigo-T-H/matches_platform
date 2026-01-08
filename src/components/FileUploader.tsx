import React, { useCallback } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  label: string;
  description: string;
  acceptedFormats: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  description,
  acceptedFormats,
  file,
  onFileSelect,
  error,
}) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelect(droppedFile);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
  };

  return (
    <div className="file-uploader">
      <label className="file-uploader-label">{label}</label>
      <p className="file-uploader-description">{description}</p>

      {!file ? (
        <div
          className={`file-drop-zone ${error ? 'error' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="file-drop-content">
            <svg
              className="file-icon"
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
            <p className="file-drop-text">
              Arrastra y suelta tu archivo aqui, o{' '}
              <label className="file-browse-link">
                busca en tu computadora
                <input
                  type="file"
                  accept={acceptedFormats}
                  onChange={handleFileInput}
                  hidden
                />
              </label>
            </p>
            <p className="file-formats">Formatos aceptados: {acceptedFormats}</p>
          </div>
        </div>
      ) : (
        <div className="file-selected">
          <div className="file-info">
            <svg
              className="file-check-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="file-name">{file.name}</span>
            <span className="file-size">
              ({(file.size / 1024).toFixed(2)} KB)
            </span>
          </div>
          <button
            type="button"
            className="file-remove-btn"
            onClick={handleRemoveFile}
          >
            Eliminar
          </button>
        </div>
      )}

      {error && <p className="file-error">{error}</p>}
    </div>
  );
};

export default FileUploader;
