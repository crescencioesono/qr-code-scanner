import React from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';

const ScanHistory = ({ history }) => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Historial de Escaneos
      </Typography>
      {history.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No hay escaneos en el historial.
        </Typography>
      ) : (
        history.map((entry) => {
          let parsedData = {};
          try {
            parsedData = JSON.parse(entry.code);
          } catch (error) {
            console.error('Error parsing history entry code:', error.message, 'Entry:', entry);
            parsedData = { error: 'Datos inválidos o no disponibles' };
          }

          // Format the fecha field to dd/mm/yyyy
          let formattedFecha = 'N/A';
          if (parsedData.fecha) {
            try {
              const date = new Date(parsedData.fecha);
              if (!isNaN(date)) {
                formattedFecha = date.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
              }
            } catch (error) {
              console.error('Error formatting fecha:', error.message, 'Fecha:', parsedData.fecha);
            }
          }

          return (
            <Paper
              key={entry.id}
              sx={{
                p: 2,
                mb: 2,
                maxWidth: '400px',
                overflow: 'hidden',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Escaneo por {entry.user}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Fecha: {entry.timestamp}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {parsedData.error ? (
                <Typography color="error">{parsedData.error}</Typography>
              ) : (
                <>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {parsedData.tipo || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Marca:</strong> {parsedData.marca || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Modelo:</strong> {parsedData.modelo || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Número de serie:</strong> {parsedData.serie || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Código de homologación:</strong> {parsedData.codigo || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha:</strong> {formattedFecha}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      overflowWrap: 'break-word',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <strong>URL:</strong>{' '}
                    <a
                      href={parsedData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {parsedData.url || 'N/A'}
                    </a>
                  </Typography>
                </>
              )}
            </Paper>
          );
        })
      )}
    </Box>
  );
};

export default ScanHistory;