import cryptoShim from './cryptoShim';
import { Buffer } from 'buffer';

// Clave secreta en Base64 (debe coincidir con la del backend)
const QR_SECRET_BASE64 = 'jLYmfwqoInnIJGoEk5JKH/Hm1QudN/atoPicX82Xk94=';

export async function decryptQRData(encryptedData) {
  try {
    const secretBuffer = Buffer.from(QR_SECRET_BASE64, 'base64');
  if (secretBuffer.length !== 32) {
    throw new Error(`La clave secreta debe ser de 32 bytes, longitud actual: ${secretBuffer.length}`);
  }
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new TypeError('Los datos cifrados deben ser una cadena no vacía');
    }

    console.log('Descifrando QR, datos de entrada:', encryptedData);
    console.log('Longitud de entrada:', encryptedData.length);

    // Decodificar Base64 URL-safe
    let payload;
    try {
      payload = Buffer.from(encryptedData, 'base64');
    } catch (err) {
      console.error('Error al decodificar Base64:', err.message);
      throw new Error(`Formato Base64 inválido: ${err.message}`);
    }
    console.log('Longitud del payload decodificado:', payload.length);
    if (payload.length < 16 + 32) {
      throw new RangeError('Payload cifrado demasiado corto (mínimo 48 bytes)');
    }

    // Extraer IV (16 bytes), HMAC (32 bytes) y datos cifrados
    const iv = payload.slice(0, 16);
    const hmacDigest = payload.slice(-32);
    const encrypted = payload.slice(16, -32);
    console.log('IV:', iv.toString('hex'));
    console.log('Encrypted length:', encrypted.length);
    console.log('HMAC recibido:', hmacDigest.toString('hex'));

    // Verificar HMAC usando timingSafeEqual
    const hmac = cryptoShim.createHmac('sha256', secretBuffer);
    const hmacUpdate = await hmac.update(Buffer.concat([iv, encrypted]));
    const calculatedHmac = hmacUpdate.digest();
    console.log('HMAC calculado:', calculatedHmac.toString('hex'));

    if (!timingSafeEqual(hmacDigest, calculatedHmac)) {
      throw new Error('Verificación HMAC fallida');
    }

    // Descifrar datos con AES-256-CBC
    let decrypted;
    try {
      const decipher = cryptoShim.createDecipheriv('aes-256-cbc', secretBuffer, iv);
      const update = await decipher.update(encrypted);
      const final = typeof decipher.final === 'function' ? await decipher.final() : Buffer.alloc(0);
      decrypted = Buffer.concat([update, final]);
    } catch (err) {
      console.error('Error al descifrar datos:', err.message);
      throw new Error(`Error de descifrado AES: ${err.message}`);
    }
    console.log('Datos descifrados:', decrypted.toString('hex'));

    // Convertir a string y parsear JSON
    const result = decrypted.toString('utf-8');
    console.log('Resultado descifrado (string):', result);
    try {
      const parsed = JSON.parse(result);
      console.log('Resultado parseado como JSON:', parsed);
      return parsed;
    } catch (parseError) {
      console.log('El resultado no es JSON, devolviendo como string');
      return result;
    }
  } catch (error) {
    console.error('Error descifrando QR:', error.message, 'Stack:', error.stack);
    throw new Error(`Error descifrando datos del QR: ${error.message}`);
  }
}

// Función auxiliar para comparación segura de HMAC
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}