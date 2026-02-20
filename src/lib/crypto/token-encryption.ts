import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'half-trip-token-enc-v1';

/**
 * Derives a 256-bit encryption key from the TOKEN_ENCRYPTION_KEY env var.
 * Uses scrypt for key derivation from a potentially shorter passphrase.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY environment variable is required for token encryption. ' +
        'Generate one with: openssl rand -hex 32'
    );
  }
  return scryptSync(secret, SALT, KEY_LENGTH);
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Returns a base64-encoded string: IV (12 bytes) + ciphertext + auth tag (16 bytes).
 *
 * Used to encrypt OAuth refresh/access tokens before storing in the database.
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // IV + ciphertext + tag
  const combined = Buffer.concat([iv, encrypted, tag]);
  return combined.toString('base64');
}

/**
 * Decrypts a base64-encoded token encrypted with encryptToken().
 * Throws on invalid ciphertext or tampered data (GCM auth tag verification).
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Checks if a value looks like an encrypted token (base64 with minimum length).
 * Used during transition to detect already-encrypted vs plaintext tokens.
 */
export function isEncryptedToken(value: string): boolean {
  // Encrypted tokens are base64 and at least IV + tag bytes long
  const minLength = Math.ceil((IV_LENGTH + TAG_LENGTH) / 3) * 4; // ~40 chars base64
  if (value.length < minLength) return false;

  // Check if it's valid base64
  try {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length >= IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Safely decrypts a token, returning the original value if decryption fails.
 * This handles the transition period where some tokens may still be plaintext.
 */
export function safeDecryptToken(value: string): string {
  // If no encryption key is configured, return as-is
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    return value;
  }

  try {
    return decryptToken(value);
  } catch {
    // Likely a plaintext token from before encryption was enabled
    return value;
  }
}

/**
 * Encrypts a token if TOKEN_ENCRYPTION_KEY is configured.
 * Returns plaintext if no key is set (graceful degradation).
 */
export function safeEncryptToken(plaintext: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    return plaintext;
  }
  return encryptToken(plaintext);
}
