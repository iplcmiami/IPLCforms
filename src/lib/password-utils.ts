/**
 * Edge Runtime compatible password hashing utilities using Web Crypto API
 * Supports both bcrypt (legacy) and PBKDF2 (new) formats for migration compatibility
 * New passwords use PBKDF2, existing bcrypt passwords are verified using bcrypt-edge
 */

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(value => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, '0');
    return paddedHexCode;
  });
  return hexCodes.join('');
}

// Helper function to convert hex string to ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Hash a password using PBKDF2 with Web Crypto API
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hex encoded hash with salt prefix
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Import password as key material
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // 100k iterations for security
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );
  
  // Combine salt and hash
  const saltHex = arrayBufferToHex(salt.buffer);
  const hashHex = arrayBufferToHex(derivedBits);
  
  // Return format: salt:hash (for easy splitting during verification)
  return `${saltHex}:${hashHex}`;
}

/**
 * Compare a plain text password with a hashed password
 * Supports both bcrypt (legacy) and PBKDF2 (new) formats
 * @param password - Plain text password to verify
 * @param hashedPassword - Previously hashed password (bcrypt or salt:hash format)
 * @returns Promise<boolean> - True if password matches
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // Detect hash format
    if (isBcryptHash(hashedPassword)) {
      // Handle bcrypt format ($2a$10$... or $2b$10$...)
      return await compareBcryptPassword(password, hashedPassword);
    } else {
      // Handle PBKDF2 format (salt:hash)
      return await comparePBKDF2Password(password, hashedPassword);
    }
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

/**
 * Check if a hash is in bcrypt format
 * @param hash - Hash string to check
 * @returns boolean - True if hash is bcrypt format
 */
function isBcryptHash(hash: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$ followed by cost and salt
  return /^\$2[abxy]\$\d{2}\$.{53}$/.test(hash);
}

/**
 * Compare password using bcrypt-edge for legacy compatibility
 * @param password - Plain text password
 * @param hashedPassword - Bcrypt hash
 * @returns Promise<boolean> - True if password matches
 */
async function compareBcryptPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // Dynamic import bcrypt-edge for Edge Runtime compatibility
    const { compareSync } = await import('bcrypt-edge');
    
    // bcrypt-edge only provides synchronous functions, so we wrap in Promise.resolve
    return Promise.resolve(compareSync(password, hashedPassword));
  } catch (error) {
    console.error('bcrypt-edge comparison error:', error);
    return false;
  }
}

/**
 * Compare password using PBKDF2
 * @param password - Plain text password
 * @param hashedPassword - PBKDF2 hash in salt:hash format
 * @returns Promise<boolean> - True if password matches
 */
async function comparePBKDF2Password(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // Split the stored hash into salt and hash components
    const [saltHex, hashHex] = hashedPassword.split(':');
    if (!saltHex || !hashHex) {
      return false;
    }
    
    // Convert hex salt back to ArrayBuffer
    const salt = hexToArrayBuffer(saltHex);
    
    // Import password as key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // Derive bits using same parameters
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // Same iterations as hashing
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // Same bit length as hashing
    );
    
    // Convert derived bits to hex for comparison
    const newHashHex = arrayBufferToHex(derivedBits);
    
    // Timing-safe comparison (constant time)
    return timingSafeEqual(newHashHex, hashHex);
  } catch (error) {
    console.error('PBKDF2 comparison error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns boolean - True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}