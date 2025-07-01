import { getEnv } from '@/lib/db';

/**
 * Sign a cookie value using HMAC-SHA256
 */
export async function signCookie(value: string): Promise<string> {
  const env = getEnv();
  const encoder = new TextEncoder();
  
  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.ADMIN_COOKIE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the value
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(value)
  );
  
  // Convert signature to base64
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  // Return value with signature
  return `${value}.${signatureBase64}`;
}

/**
 * Verify a signed cookie value
 */
export async function verifyCookie(signedValue: string): Promise<string | null> {
  try {
    const env = getEnv();
    const [value, signature] = signedValue.split('.');
    
    if (!value || !signature) {
      return null;
    }
    
    const encoder = new TextEncoder();
    
    // Import the secret key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.ADMIN_COOKIE_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Convert base64 signature back to ArrayBuffer
    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    // Verify the signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(value)
    );
    
    return isValid ? value : null;
  } catch (error) {
    console.error('Error verifying cookie:', error);
    return null;
  }
}