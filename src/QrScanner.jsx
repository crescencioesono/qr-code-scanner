import React, { useState, useEffect, useContext, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { Button, Typography, Box, Alert, Paper, Input } from '@mui/material';
import { AuthContext } from './AuthContext';
import ScanHistory from './ScanHistory';
import { decryptQRData } from './decryptQR';

const QrScannerComponent = ({ onLogout }) => {
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState([]);
  const [backCamera, setBackCamera] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showAllScans, setShowAllScans] = useState(false);
  const { user } = useContext(AuthContext);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const streamRef = useRef(null);
  const isMounted = useRef(true);
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);

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
    return () => {
      console.log('Limpiando verificación de cámara');
    };
  }, []);

  // Iniciar escaneo
  const startScanning = async () => {
    if (!cameraPermission) {
      console.error('Intento de escaneo sin permisos de cámara');
      setError('No se tienen permisos para acceder a la cámara. Por favor, habilítalos y usa HTTPS.');
      return;
    }

    let localIsScanning = true;
    console.log('Iniciando escaneo, localIsScanning:', localIsScanning, 'state isScanning:', true);
    setError('');
    setScanResult('');
    setIsScanning(true);
    setIsVideoReady(false);

    // Limpieza de recursos previos
    if (qrScannerRef.current) {
      console.log('Limpiando qr-scanner previo');
      qrScannerRef.current.stop();
      qrScannerRef.current = null;
    }
    if (streamRef.current) {
      console.log('Limpiando stream previo');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      console.log('Limpiando videoRef previo');
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }

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

      if (!isMounted.current) {
        console.error('Componente desmontado antes de asignar stream');
        setError('Error: Componente desmontado');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      if (videoRef.current) {
        console.log('Asignando stream al elemento video');
        videoRef.current.srcObject = stream;

        console.log('Esperando metadatos del video');
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current || !isMounted.current) {
            console.error('videoRef.current es null o componente desmontado en onloadedmetadata');
            setError('Error: Elemento de video no disponible o componente desmontado');
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            return;
          }
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
              qrScannerRef.current = new QrScanner(videoRef.current, async (result) => {
                console.log('Código QR detectado:', result.data);
                try {
                  const decryptedData = await decryptQRData(result.data);
                  console.log('Datos descifrados:', decryptedData);
                  setScanResult(JSON.stringify(decryptedData, null, 2));
                  setHistory((prev) => [
                    {
                      user: user.username,
                      code: JSON.stringify(decryptedData),
                      timestamp: new Date().toLocaleString('es-ES'),
                      id: Date.now()
                    },
                    ...prev,
                  ]);
                  stopScanning();
                  // Limpiar scanResult después de 5 segundos
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                  }
                  timeoutRef.current = setTimeout(() => {
                    setScanResult('');
                  }, 5000);
                } catch (error) {
                  console.error('Error al descifrar QR:', error.message);
                  setError('Error al descifrar el código QR: ' + error.message);
                  stopScanning();
                }
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
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
                }
              });
            } else {
              console.error('No se inicia bucle de escaneo', {
                localIsScanning,
                stateIsScanning: isScanning,
                isMounted: isMounted.current
              });
              setError('Error: Escaneo interrumpido porque el componente se desmontó o el video no está disponible');
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
              }
            }
          }).catch(err => {
            console.error('Error al reproducir video:', err.name, err.message);
            setError('Error al reproducir video: ' + err.message);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
          });
        };
        videoRef.current.onerror = (err) => {
          console.error('Error en el elemento video:', err);
          setError('Error en el elemento video: ' + (err.message || 'Desconocido'));
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };
        console.log('Estado inicial del video, readyState:', videoRef.current ? videoRef.current.readyState : 'videoRef.current es null');
      } else {
        console.error('videoRef.current no está definido');
        setError('Error: Elemento de video no disponible');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    } catch (err) {
      console.error('Error al iniciar el flujo de video:', err.name, err.message);
      setError(`Error al iniciar el flujo de video: ${err.message}`);
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        setIsScanning(false);
        setIsVideoReady(false);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopScanning = () => {
    console.log('Deteniendo escaneo');
    setIsScanning(false);
    setIsVideoReady(false);
    console.log('isScanning establecido a false, isVideoReady establecido a false');

    if (qrScannerRef.current) {
      console.log('Deteniendo y destruyendo qr-scanner');
      qrScannerRef.current.stop();
      qrScannerRef.current = null;
    }

    if (streamRef.current) {
      console.log('Deteniendo tracks del stream');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      console.log('Limpiando srcObject y eventos del video');
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
      console.log('Video stream cleared');
      const overlay = videoRef.current.parentElement?.querySelector('.scan-region-highlight');
      if (overlay) {
        console.log('Eliminando overlay de qr-scanner');
        overlay.remove();
      }
    }
  };

  // Manejar subida de archivo
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No se seleccionó ningún archivo');
      setError('Por favor, selecciona una imagen');
      return;
    }

    console.log('Archivo seleccionado:', file.name);
    setError('');
    setScanResult('');

    try {
      const result = await QrScanner.scanImage(file);
      console.log('Código QR detectado:', result);
      try {
        const decryptedData = await decryptQRData(result);
        console.log('Datos descifrados:', decryptedData);
        setScanResult(JSON.stringify(decryptedData, null, 2));
        setHistory((prev) => [
          {
            user: user.username,
            code: JSON.stringify(decryptedData),
            timestamp: new Date().toLocaleString('es-ES'),
            id: Date.now()
          },
          ...prev,
        ]);
        // Limpiar scanResult después de 5 segundos
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setScanResult('');
        }, 5000);
      } catch (error) {
        console.error('Error al descifrar QR:', error.message);
        setError('Error al descifrar el código QR: ' + error.message);
      }
    } catch (err) {
      console.error('Error al escanear imagen:', err.message);
      setError('Error al escanear la imagen: ' + err.message);
    } finally {
      // Resetear el input para permitir subir la misma imagen de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Alternar mostrar todos los escaneos
  const toggleShowAllScans = () => {
    setShowAllScans((prev) => !prev);
  };

  // Cleanup al desmontar
  useEffect(() => {
    isMounted.current = true;
    console.log('Componente montado, isMounted: true');
    return () => {
      console.log('Componente desmontado, limpiando');
      isMounted.current = false;
      if (streamRef.current || qrScannerRef.current) {
        stopScanning();
      }
      // Limpiar timeout si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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
        <Paper sx={{ p: 2, mb: 2, maxWidth: '400px', overflow: 'hidden' }}>
          <Typography variant="h6">Resultado:</Typography>
          <Typography
            component="pre"
            sx={{
              overflowWrap: 'break-word',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}
          >
            {scanResult}
          </Typography>
        </Paper>
      )}

      <Box sx={{ mb: 2, position: 'relative' }}>
        {isScanning && (
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
              sx={{ mt: 1, mr: 1 }}
              disabled={!isVideoReady}
            >
              Detener Escaneo
            </Button>
          </>
        )}
        {!isScanning && (
          <>
            <Button
              variant="contained"
              onClick={startScanning}
              disabled={cameraPermission === false}
              sx={{ mr: 1 }}
            >
              Iniciar Escaneo
            </Button>
            <Button
              variant="contained"
              component="label"
              color="primary"
            >
              Subir Imagen
              <Input
                type="file"
                inputRef={fileInputRef}
                sx={{ display: 'none' }}
                inputProps={{ accept: 'image/*' }}
                onChange={handleFileUpload}
              />
            </Button>
          </>
        )}
      </Box>

      <ScanHistory history={history} showAllScans={showAllScans} toggleShowAllScans={toggleShowAllScans} />
    </Box>
  );
};

export default QrScannerComponent;