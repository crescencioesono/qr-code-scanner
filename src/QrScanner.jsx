import React, { useState, useEffect, useContext, useRef } from 'react';
import jsQR from 'jsqr';
import { Button, Typography, Box, Alert, Paper } from '@mui/material';
import { AuthContext } from './AuthContext';
import ScanHistory from './ScanHistory';

const QrScanner = ({ onLogout }) => {
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState([]);
  const [backCamera, setBackCamera] = useState(null);
  const { user } = useContext(AuthContext);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  // Verificar permisos de cámara y seleccionar cámara trasera
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission(false);
      setError('La API de cámara no está soportada en este navegador o entorno. Usa HTTPS y un navegador moderno.');
      return;
    }

    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Cámaras disponibles:', videoDevices);
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') || 
        device.label.toLowerCase().includes('trasera')
      ) || videoDevices[0];
      
      if (backCamera) {
        setBackCamera(backCamera);
        navigator.mediaDevices
          .getUserMedia({ video: { deviceId: backCamera.deviceId } })
          .then(() => setCameraPermission(true))
          .catch((err) => {
            setCameraPermission(false);
            setError(`No se puede acceder a la cámara trasera: ${err.message}. Asegúrate de usar HTTPS y otorgar permisos.`);
          });
      } else {
        setCameraPermission(false);
        setError('No se encontró una cámara trasera.');
      }
    }).catch(err => {
      setCameraPermission(false);
      setError(`Error al enumerar dispositivos: ${err.message}`);
    });
  }, []);

  // Iniciar flujo de video y escaneo
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current || !cameraPermission) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    navigator.mediaDevices
      .getUserMedia({
        video: { deviceId: backCamera ? backCamera.deviceId : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      .then(stream => {
        video.srcObject = stream;
        video.play();
        scan();
      })
      .catch(err => {
        setError(`Error al iniciar el flujo de video: ${err.message}`);
        setIsScanning(false);
      });

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          console.log('Código QR detectado:', code.data);
          setScanResult(code.data);
          setHistory((prev) => [
            { user: user.username, code: code.data, timestamp: new Date().toLocaleString('es-ES') },
            ...prev,
          ]);
          setIsScanning(false);
          if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
          }
        } else {
          console.log('No se detectó código QR en este frame');
          animationFrameRef.current = requestAnimationFrame(scan);
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(scan);
      }
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning, cameraPermission, backCamera, user.username]);

  const startScanning = () => {
    if (!cameraPermission) {
      setError('No se tienen permisos para acceder a la cámara. Por favor, habilítalos y usa HTTPS.');
      return;
    }
    setError('');
    setScanResult('');
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
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
          <>
            <video
              ref={videoRef}
              style={{ width: '100%', maxWidth: '400px', display: 'block' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <Button variant="contained" onClick={stopScanning}>
              Detener Escaneo
            </Button>
          </>
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