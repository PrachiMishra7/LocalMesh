/**
 * LocalMesh End-to-End Encryption Utilities using the Web Crypto API
 * Uses AES-GCM for encrypting WebRTC DataChannel payloads.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;

/**
 * Derives a CryptoKey from a user-provided password using PBKDF2.
 */
export async function deriveKeyFromPassword(password: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  
  // 1. Convert password to key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // 2. Derive AES-GCM key
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a Uint8Array payload using AES-GCM.
 * Returns a new Uint8Array where the first 12 bytes are the IV, followed by the ciphertext.
 */
export async function encryptPayload(key: CryptoKey, payload: Uint8Array): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv
    },
    key,
    payload as unknown as BufferSource // Cast for TS
  );

  // Pack the IV and Ciphertext together: [IV (12 bytes)][Ciphertext]
  const cipherArray = new Uint8Array(cipherBuffer);
  const result = new Uint8Array(iv.length + cipherArray.length);
  result.set(iv, 0);
  result.set(cipherArray, iv.length);
  
  return result;
}

/**
 * Decrypts a Uint8Array payload that was encrypted with encryptPayload.
 */
export async function decryptPayload(key: CryptoKey, encryptedPayload: Uint8Array): Promise<Uint8Array> {
  if (encryptedPayload.length < 12) {
    throw new Error('Invalid encrypted payload (too short to contain IV)');
  }

  // Copy into fresh Uint8Arrays backed by clean ArrayBuffers so SubtleCrypto accepts them
  const iv = new Uint8Array(encryptedPayload.subarray(0, 12));
  const cipherText = new Uint8Array(encryptedPayload.subarray(12));

  const plainBuffer = await window.crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv
    },
    key,
    cipherText
  );

  return new Uint8Array(plainBuffer);
}
