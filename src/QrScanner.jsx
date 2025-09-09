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
  const streamRef = useRef(null);

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

    const initializeCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Cámaras disponibles:', videoDevices);
        
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') || 
          device.label.toLowerCase().includes('trasera') ||
          device.label.toLowerCase().includes('environment')
        ) || videoDevices[videoDevices.length - 1]; // La última suele ser la trasera
        
        if (backCamera) {
          setBackCamera(backCamera);
          // Solo verificar permisos, no iniciar stream aún
          const testStream = await navigator.mediaDevices.getUserMedia({ 
            video: { deviceId: backCamera.deviceId } 
          });
          testStream.getTracks().forEach(track => track.stop()); // Detener stream de prueba
          setCameraPermission(true);
        } else {
          setCameraPermission(false);
          setError('No se encontró una cámara trasera.');
        }
      } catch (err) {
        setCameraPermission(false);
        setError(`Error al enumerar dispositivos: ${err.message}`);
      }
    };

    initializeCamera();
  }, []);

  // Función de escaneo mejorada
  const scan = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      // Asegurar que canvas tenga el tamaño correcto
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Dibujar el frame actual
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Configuración mejorada de jsQR
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth', // Cambiar a attemptBoth para mejor detección
        });

        if (code && code.data) {
          console.log('Código QR detectado:', code.data);
          setScanResult(code.data);
          setHistory((prev) => [
            { 
              user: user.username, 
              code: code.data, 
              timestamp: new Date().toLocaleString('es-ES'),
              id: Date.now()
            },
            ...prev,
          ]);
          stopScanning();
          return;
        }
      } catch (err) {
        console.error('Error al procesar imagen:', err);
      }
    }

    // Continuar escaneando
    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(scan);
    }
  };

  const startScanning = async () => {
    if (!cameraPermission) {
      setError('No se tienen permisos para acceder a la cámara. Por favor, habilítalos y usa HTTPS.');
      return;
    }
    
    try {
      setError('');
      setScanResult('');
      setIsScanning(true);

      const constraints = {
        video: {
          deviceId: backCamera ? { exact: backCamera.deviceId } : undefined,
          facingMode: backCamera ? undefined : { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté completamente cargado
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            console.log('Video iniciado correctamente');
            // Dar tiempo para que el video se estabilice antes de comenzar a escanear
            setTimeout(() => {
              if (isScanning) {
                scan();
              }
            }, 500);
          }).catch(err => {
            console.error('Error al reproducir video:', err);
            setError('Error al reproducir video: ' + err.message);
            setIsScanning(false);
          });
        };
      }
    } catch (err) {
      console.error('Error al iniciar el flujo de video:', err);
      setError(`Error al iniciar el flujo de video: ${err.message}`);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    // Cancelar animación
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Detener stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Limpiar video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

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
          <Typography sx={{ wordBreak: 'break-all' }}>{scanResult}</Typography>
        </Paper>
      )}
      
      <Box sx={{ mb: 2 }}>
        {isScanning ? (
          <>
            <video
              ref={videoRef}
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                display: 'block',
                border: '2px solid #1976d2',
                borderRadius: '8px'
              }}
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <Button 
              variant="contained" 
              color="error"
              onClick={stopScanning}
              sx={{ mt: 1 }}
            >
              Detener Escaneo
            </Button>
          </>
        ) : (
          <Button 
            variant="contained" 
            onClick={startScanning}
            disabled={!cameraPermission}
          >
            Iniciar Escaneo
          </Button>
        )}
      </Box>
      
      <ScanHistory history={history} />
    </Box>
  );
};

export default QrScanner;