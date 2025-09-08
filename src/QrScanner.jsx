import React, { useState, useEffect, useContext } from 'react';
import { QrReader } from 'react-qr-reader';
import { Button, Typography, Box, Alert, Paper } from '@mui/material';
import { AuthContext } from './AuthContext';
import ScanHistory from './ScanHistory';

const QrScanner = ({ onLogout }) => {
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState([]);
  const { user } = useContext(AuthContext);

  // Cargar historial desde localStorage
  useEffect(() => {
    const storedHistory = localStorage.getItem('qrHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Guardar historial en localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('qrHistory', JSON.stringify(history));
    }
  }, [history]);

  // Verificar permisos de cámara
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission(false);
      setError('La API de cámara no está soportada en este navegador o entorno. Usa HTTPS y un navegador moderno.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(() => setCameraPermission(true))
      .catch((err) => {
        setCameraPermission(false);
        setError(`No se puede acceder a la cámara trasera: ${err.message}. Asegúrate de usar HTTPS y otorgar permisos.`);
      });
  }, []);

  const handleScan = (data) => {
    if (data) {
      setScanResult(data);
      setHistory((prev) => [
        { user: user.username, code: data, timestamp: new Date().toLocaleString('es-ES') },
        ...prev,
      ]);
      setIsScanning(false);
    }
  };

  const handleError = (err) => {
    setError('Error al escanear: ' + err.message);
    setIsScanning(false);
  };

  const startScanning = () => {
    if (!cameraPermission) {
      setError('No se tienen permisos para acceder a la cámara. Por favor, habilítalos y usa HTTPS.');
      return;
    }
    setError('');
    setScanResult('');
    setIsScanning(true);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Escáner de Códigos QR</Typography>
      <Typography variant="subtitle1">Usuario: {user.username}</Typography>
      <Button
        variant="contained"
        color="secondary"
        onClick={onLogout}
        sx={{ mb: 2 }}
      >
        Cerrar Sesión
      </Button>
      {cameraPermission === false && (
        <Alert severity="error">
          No se tienen permisos para acceder a la cámara. Habilítalos en la configuración y usa HTTPS.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {scanResult && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Resultado:</Typography>
          <Typography>{scanResult}</Typography>
        </Paper>
      )}
      <Box sx={{ mb: 2 }}>
        {isScanning ? (
          <QrReader
            delay={300}
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%', maxWidth: '400px' }}
            constraints={{ facingMode: 'environment' }}
          />
        ) : (
          <Button variant="contained" onClick={startScanning}>
            Iniciar Escaneo
          </Button>
        )}
      </Box>
      <ScanHistory history={history} />
    </Box>
  );
};

export default QrScanner;