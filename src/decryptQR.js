import cryptoShim from './cryptoShim';
import { Buffer } from 'buffer';

// Clave secreta (debe coincidir con QR_SECRET en el backend, 32 bytes)
const QR_SECRET = "jLYmfwqolnnlJGoEk5JKH/Hm1QudN/atoPicX82Xk94=";
if (!QR_SECRET) {
  throw new Error('REACT_APP_QR_SECRET no está definida en .env');
}
const secretBuffer = Buffer.from(QR_SECRET, 'utf8');
// if (secretBuffer.length !== 32) {
//   throw new Error(`REACT_APP_QR_SECRET debe ser una clave de 32 bytes, longitud actual: ${secretBuffer.length}`);
// }

export async function decryptQRData(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new TypeError('Los datos cifrados deben ser una cadena no vacía');
    }

    console.log('Descifrando QR, longitud de entrada:', encryptedData.length);
    
    // Decodificar Base64
    const payload = Buffer.from(encryptedData, 'base64');
    console.log('Longitud del payload decodificado:', payload.length);
    if (payload.length < 16 + 32) {
      throw new RangeError('Payload cifrado demasiado corto (mínimo 48 bytes)');
    }

    // Extraer IV (16 bytes), HMAC (32 bytes) y datos cifrados
    const iv = payload.slice(0, 16);
    const hmacDigest = payload.slice(-32);
    const encrypted = payload.slice(16, -32);
    console.log('IV:', iv.toString('hex'), 'Encrypted length:', encrypted.length, 'HMAC:', hmacDigest.toString('hex'));

    // Verificar HMAC
    const hmac = cryptoShim.createHmac('sha256', secretBuffer);
    const hmacUpdate = await hmac.update(Buffer.concat([iv, encrypted]));
    const calculatedHmac = hmacUpdate.digest();
    if (Buffer.compare(hmacDigest, calculatedHmac) !== 0) {
      throw new Error('Verificación HMAC fallida');
    }

    // Descifrar datos
    const decipher = cryptoShim.createDecipheriv('aes-256-cbc', secretBuffer, iv);
    let decrypted = await decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    console.log('Datos descifrados (con padding):', decrypted.toString('hex'));

    // Quitar padding PKCS7
    const paddingLength = decrypted[decrypted.length - 1];
    if (paddingLength < 1 || paddingLength > 16) {
      throw new RangeError(`Padding inválido: ${paddingLength} bytes`);
    }
    const unpadded = decrypted.slice(0, -paddingLength);
    console.log('Datos sin padding:', unpadded.toString('hex'));

    // Convertir a string y parsear JSON si es un objeto
    const result = unpadded.toString('utf-8');
    console.log('Resultado descifrado (string):', result);
    try {
      const parsed = JSON.parse(result);
      console.log('Resultado parseado como JSON:', parsed);
      return parsed;
    } catch {
      console.log('El resultado no es JSON, devolviendo como string');
      return result;
    }
  } catch (error) {
    console.error('Error descifrando QR:', error.message, 'Stack:', error.stack);
    throw new Error(`Error descifrando datos del QR: ${error.message}`);
  }
}