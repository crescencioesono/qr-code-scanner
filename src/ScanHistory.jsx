import React from 'react';
import { Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

const ScanHistory = ({ history }) => {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Historial de Escaneos</Typography>
      {history.length === 0 ? (
        <Typography>No hay escaneos previos.</Typography>
      ) : (
        <List>
          {history.map((entry, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`Código: ${entry.code}`}
                secondary={`Usuario: ${entry.user} | Fecha: ${entry.timestamp}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ScanHistory;