const cryptoShim = {
  createHmac: (algorithm, key) => {
    if (algorithm !== 'sha256') {
      throw new Error('Only sha256 is supported for HMAC');
    }
    return {
      update: async (data) => {
        const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
        return {
          digest: () => new Uint8Array(signature),
        };
      },
    };
  },
  createDecipheriv: (algorithm, key, iv) => {
    if (algorithm !== 'aes-256-cbc') {
      throw new Error('Only aes-256-cbc is supported');
    }
    return {
      update: async (data) => {
        const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-CBC' },
          false,
          ['decrypt']
        );
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-CBC', iv },
          cryptoKey,
          data
        );
        return new Uint8Array(decrypted);
      },
      final: () => new Uint8Array(0), // AES-CBC decryption is done in one step
    };
  },
};

export default cryptoShim;