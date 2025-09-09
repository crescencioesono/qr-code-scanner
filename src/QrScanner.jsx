import React, { useState, useEffect, useContext, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { Button, Typography, Box, Alert, Paper } from '@mui/material';
import { AuthContext } from './AuthContext';
import ScanHistory from './ScanHistory';

const QrScannerComponent = ({ onLogout }) => {
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState([]);
  const [backCamera, setBackCamera] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const { user } = useContext(AuthContext);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
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

  // Iniciar escaneo
  const startScanning = async () => {
    if (!cameraPermission) {
      console.error('Intento de escaneo sin permisos de cámara');
      setError('No se tienen permisos para acceder a la cámara. Por favor, habilítalos y usa HTTPS.');
      return;
    }

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
              console.log('Inicializando QrScanner');
              qrScannerRef.current = new QrScanner(videoRef.current, (result) => {
                console.log('Código QR detectado:', result.data);
                setScanResult(result.data);
                setHistory((prev) => [
                  { 
                    user: user.username, 
                    code: result.data, 
                    timestamp: new Date().toLocaleString('es-ES'),
                    id: Date.now()
                  },
                  ...prev,
                ]);
                stopScanning();
              }, {
                maxScansPerSecond: 30,
                highlightScanRegion: true,
                highlightCodeOutline: true
              });
              console.log('Iniciando bucle de escaneo con qr-scanner');
              qrScannerRef.current.start().then(() => {
                console.log('Escaneo iniciado correctamente');
              }).catch(err => {
                console.error('Error al iniciar qr-scanner:', err.name, err.message);
                setError('Error al iniciar el escáner: ' + err.message);
                localIsScanning = false;
                setIsScanning(false);
                setIsVideoReady(false);
              });
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

    if (qrScannerRef.current) {
      console.log('Deteniendo qr-scanner');
      qrScannerRef.current.stop();
      qrScannerRef.current = null;
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

export default QrScannerComponent;