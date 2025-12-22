import React from 'react';
import { FuzzyResult } from '../types';
import './ResultsTable.css';

interface ResultsTableProps {
  results: FuzzyResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  if (results.length === 0) {
    return null;
  }

  // Get max matches count
  const maxMatches = Math.max(...results.map((r) => r.matches.length));

  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>UPC Pivote</th>
            <th>Descripcion Pivote</th>
            {Array.from({ length: maxMatches }, (_, i) => (
              <React.Fragment key={i}>
                <th>Tipo {i + 1}</th>
                <th>UPC Sugerido {i + 1}</th>
                <th>Descripcion {i + 1}</th>
                <th>Score {i + 1}</th>
                <th>Precio {i + 1}</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, rowIndex) => (
            <tr key={rowIndex}>
              <td>{result.UPC}</td>
              <td className="description-cell">{result.Item}</td>
              {Array.from({ length: maxMatches }, (_, i) => {
                const match = result.matches[i];
                return (
                  <React.Fragment key={i}>
                    <td>
                      {match && (
                        <span
                          className={`match-type ${
                            match.matchType === 'Identical'
                              ? 'identical'
                              : 'suggested'
                          }`}
                        >
                          {match.matchType === 'Identical'
                            ? 'Identico'
                            : 'Sugerido'}
                        </span>
                      )}
                    </td>
                    <td>{match?.suggestedUPC || ''}</td>
                    <td className="description-cell">
                      {match?.suggestedDescription || ''}
                    </td>
                    <td>
                      {match && (
                        <span
                          className={`score ${
                            match.score >= 80
                              ? 'high'
                              : match.score >= 60
                              ? 'medium'
                              : 'low'
                          }`}
                        >
                          {match.score}%
                        </span>
                      )}
                    </td>
                    <td>{match?.finalPrice || ''}</td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
