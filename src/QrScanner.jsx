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
  const [isVideoReady, setIsVideoReady] = useState(false);
  const { user } = useContext(AuthContext);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const isMounted = useRef(true);

  // Cargar historial desde localStorage
  useEffect(() => {
    console.log('Cargando historial desde localStorage');
    const storedHistory = localStorage.getItem('qrHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
      console.log('Historial cargado:', JSON.parse(storedHistory));
    } else {
      console.log('No se encontró historial en localStorage');
    }
  }, []);

  // Guardar historial en localStorage
  useEffect(() => {
    if (history.length > 0) {
      console.log('Guardando historial en localStorage:', history);
      localStorage.setItem('qrHistory', JSON.stringify(history));
    }
  }, [history]);

  // Verificar permisos de cámara y seleccionar cámara trasera
  useEffect(() => {
    console.log('Iniciando verificación de permisos de cámara');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('API de cámara no soportada');
      setCameraPermission(false);
      setError('La API de cámara no está soportada en este navegador o entorno. Usa HTTPS y un navegador moderno.');
      return;
    }

    const initializeCamera = async () => {
      try {
        console.log('Enumerando dispositivos de video');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Cámaras disponibles:', videoDevices);
        
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') || 
          device.label.toLowerCase().includes('trasera') ||
          device.label.toLowerCase().includes('environment')
        ) || videoDevices[videoDevices.length - 1];
        
        if (backCamera) {
          console.log('Cámara trasera seleccionada:', backCamera);
          setBackCamera(backCamera);
          console.log('Verificando permisos con deviceId:', backCamera.deviceId);
          const testStream = await navigator.mediaDevices.getUserMedia({ 
            video: { deviceId: backCamera.deviceId } 
          });
          console.log('Permisos de cámara obtenidos');
          testStream.getTracks().forEach(track => track.stop());
          setCameraPermission(true);
        } else {
          console.error('No se encontró cámara trasera');
          setCameraPermission(false);
          setError('No se encontró una cámara trasera.');
        }
      } catch (err) {
        console.error('Error al enumerar dispositivos o verificar permisos:', err.name, err.message);
        setCameraPermission(false);
        setError(`Error al enumerar dispositivos: ${err.message}`);
      }
    };

    initializeCamera();
  }, []);

  // Función de escaneo
  const scan = () => {
    console.log('Iniciando función scan, isScanning:', isScanning, 'isMounted:', isMounted.current, 'isVideoReady:', isVideoReady);
    if (!isScanning || !isMounted.current || !videoRef.current || !canvasRef.current || !isVideoReady) {
      console.log('Escaneo detenido: condiciones no cumplidas', { 
        isScanning, 
        isMounted: isMounted.current,
        videoRef: !!videoRef.current, 
        canvasRef: !!canvasRef.current,
        isVideoReady
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    console.log('Procesando frame de video, readyState:', video.readyState);
    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      console.log('Video listo, dimensiones:', { width: video.videoWidth, height: video.videoHeight });
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Dibujando frame en canvas');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        console.log('Obteniendo datos de imagen del canvas');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        console.log('Datos de imagen obtenidos, dimensiones:', { width: imageData.width, height: imageData.height });
        
        console.log('Ejecutando jsQR');
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
          locate: true
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
        } else {
          console.log('No se detectó código QR en este frame');
        }
      } catch (err) {
        console.error('Error al procesar imagen con jsQR:', err.name, err.message);
      }
    } else {
      console.log('Video no listo, readyState:', video.readyState, 'dimensiones:', { 
        width: video.videoWidth, 
        height: video.videoHeight 
      });
    }

    if (isScanning && isMounted.current) {
      console.log('Solicitando próximo frame');
      animationFrameRef.current = requestAnimationFrame(scan);
    } else {
      console.log('Escaneo detenido, no se solicita próximo frame', { isScanning, isMounted: isMounted.current });
    }
  };

  const startScanning = async () => {
    if (!cameraPermission) {
      console.error('Intento de escaneo sin permisos de cámara');
      setError('No se tienen permisos para acceder a la cámara. Por favor, habilítalos y usa HTTPS.');
      return;
    }
    
    // Usar variable local para isScanning
    let localIsScanning = true;
    console.log('Iniciando escaneo, localIsScanning:', localIsScanning);
    setError('');
    setScanResult('');
    setIsScanning(true);
    setIsVideoReady(false);

    try {
      const constraints = {
        video: {
          deviceId: backCamera ? { exact: backCamera.deviceId } : undefined,
          facingMode: backCamera ? undefined : { ideal: 'environment' },
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        }
      };
      console.log('Restricciones de video:', constraints);

      console.log('Solicitando flujo de video');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log('Flujo de video obtenido:', stream);
      
      if (videoRef.current && isMounted.current) {
        console.log('Asignando stream al elemento video');
        videoRef.current.srcObject = stream;
        
        console.log('Esperando metadatos del video');
        videoRef.current.onloadedmetadata = () => {
          console.log('Metadatos del video cargados:', { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
          });
          console.log('Intentando reproducir video, localIsScanning:', localIsScanning, 'state isScanning:', isScanning);
          videoRef.current.play().then(() => {
            console.log('Video iniciado correctamente');
            console.log('Estado de localIsScanning tras play:', localIsScanning);
            console.log('Estado de state isScanning tras play:', isScanning);
            if (localIsScanning && isMounted.current) {
              console.log('Estableciendo isVideoReady: true');
              setIsVideoReady(true);
              console.log('Iniciando bucle de escaneo');
              animationFrameRef.current = requestAnimationFrame(scan);
            } else {
              console.log('No se inicia bucle de escaneo', { localIsScanning, stateIsScanning: isScanning, isMounted: isMounted.current });
            }
          }).catch(err => {
            console.error('Error al reproducir video:', err.name, err.message);
            setError('Error al reproducir video: ' + err.message);
            console.log('Estableciendo localIsScanning y state isScanning: false debido a error en play');
            localIsScanning = false;
            setIsScanning(false);
            setIsVideoReady(false);
          });
        };
        videoRef.current.onerror = (err) => {
          console.error('Error en el elemento video:', err);
          setError('Error en el elemento video: ' + (err.message || 'Desconocido'));
          console.log('Estableciendo localIsScanning y state isScanning: false debido a error en video');
          localIsScanning = false;
          setIsScanning(false);
          setIsVideoReady(false);
        };
        // Verificar estado inicial del video
        console.log('Estado inicial del video, readyState:', videoRef.current.readyState);
      } else {
        console.error('videoRef.current no está definido o componente desmontado');
        setError('Error: Elemento de video no disponible o componente desmontado');
        console.log('Estableciendo localIsScanning y state isScanning: false debido a videoRef no definido');
        localIsScanning = false;
        setIsScanning(false);
        setIsVideoReady(false);
      }
    } catch (err) {
      console.error('Error al iniciar el flujo de video:', err.name, err.message);
      setError(`Error al iniciar el flujo de video: ${err.message}`);
      console.log('Estableciendo localIsScanning y state isScanning: false debido a error en getUserMedia');
      localIsScanning = false;
      setIsScanning(false);
      setIsVideoReady(false);
    }
  };

  const stopScanning = () => {
    console.log('Deteniendo escaneo');
    setIsScanning(false);
    setIsVideoReady(false);
    console.log('isScanning establecido a false, isVideoReady establecido a false');
    
    if (animationFrameRef.current) {
      console.log('Cancelando requestAnimationFrame');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      console.log('Deteniendo tracks del stream');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      console.log('Limpiando srcObject del video');
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    isMounted.current = true;
    return () => {
      console.log('Limpiando componente al desmontar');
      isMounted.current = false;
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
              disabled={!isVideoReady}
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