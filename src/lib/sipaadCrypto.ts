import { SipaadHashCalculation } from '../types';

/**
 * Calculates SHA-512 in browser or Node environment.
 */
export async function sha512(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback or Node.js environment
  try {
    // Dynamic import for Node.js if in server context
    const crypto = await import('node:crypto');
    return crypto.createHash('sha512').update(input, 'utf8').digest('hex');
  } catch {
    // Basic polyfill if needed
    throw new Error('WebCrypto/Crypto is not available in this runtime');
  }
}

/**
 * Generates an integer salt between 100000 and 99999999
 */
export function generateRandomSalt(): number {
  return Math.floor(10000000 + Math.random() * 89999999);
}

/**
 * Executes the exact Sipaad / UTCMS security hashing algorithm:
 * 1. Generate Random Salt (int)
 * 2. Hash Password with SHA512
 * 3. HashedValue = SHA512(CompanyCode + SHA512(Password) + Salt)
 */
export async function computeSipaadSecurityHash(
  companyCode: string,
  plainPassword: string,
  explicitSalt?: number
): Promise<SipaadHashCalculation> {
  const salt = explicitSalt ?? generateRandomSalt();
  const passwordSha512 = await sha512(plainPassword);
  const rawConcatenated = `${companyCode}${passwordSha512}${salt}`;
  const hashedValue = await sha512(rawConcatenated);

  return {
    companyCode,
    passwordSha512,
    salt,
    hashedValue,
    calculatedAt: new Date().toISOString(),
    rawStringBeforeFinalHash: rawConcatenated,
  };
}

/**
 * Ensures critical JSON rule for UTCMS/Sipaad:
 * Optional fields with null or undefined values MUST be serialized with explicit `null`,
 * NEVER omitted from the JSON payload.
 */
export function formatSipaadJsonPayload<T extends Record<string, unknown>>(
  payload: T,
  optionalKeys: string[]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...payload };

  for (const key of optionalKeys) {
    if (sanitized[key] === undefined || sanitized[key] === null || sanitized[key] === '') {
      sanitized[key] = null;
    }
  }

  return sanitized;
}
