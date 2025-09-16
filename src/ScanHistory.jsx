import React from 'react';
import { Typography, Box, Paper, Button } from '@mui/material';

const ScanHistory = ({ history, showAllScans, toggleShowAllScans }) => {
  // Obtener el escaneo más reciente (mayor id)
  const latestScan = history.length > 0 ? history.reduce((latest, scan) => 
    scan.id > latest.id ? scan : latest, history[0]) : null;

  // Mostrar solo el escaneo más reciente o todos según showAllScans
  const displayedHistory = showAllScans ? history : latestScan ? [latestScan] : [];

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>Historial de Escaneos</Typography>
      {history.length === 0 ? (
        <Typography variant="body1">No hay escaneos registrados.</Typography>
      ) : (
        <>
          {displayedHistory.map((scan) => {
            const data = JSON.parse(scan.code);
            return (
              <Paper key={scan.id} sx={{ p: 2, mb: 1, maxWidth: '400px' }}>
                <Typography variant="subtitle1">Usuario: {scan.user}</Typography>
                <Typography variant="body2">Fecha: {scan.timestamp}</Typography>
                <Typography variant="body2">Tipo: {data.tipo}</Typography>
                <Typography variant="body2">Marca: {data.marca}</Typography>
                <Typography variant="body2">Modelo: {data.modelo}</Typography>
                <Typography variant="body2">Serie: {data.serie}</Typography>
                <Typography variant="body2">Código: {data.codigo}</Typography>
                <Typography variant="body2">
                  URL: <a href={data.url} target="_blank" rel="noopener noreferrer">{data.url}</a>
                </Typography>
              </Paper>
            );
          })}
          {history.length > 1 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={toggleShowAllScans}
              sx={{ mt: 1 }}
            >
              {showAllScans ? 'Ver menos' : 'Ver más'}
            </Button>
          )}
        </>
      )}
    </Box>
  );
};

export default ScanHistory;