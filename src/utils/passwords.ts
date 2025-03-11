import * as argon2 from 'argon2-browser';
import { randomBytes } from 'crypto';

/**
 * Hashes a password using Argon2id algorithm
 * @param password - The plain text password to hash
 * @returns A promise that resolves to the encoded hash string
 */
async function hashPassword(password: string): Promise<string> {
  const result = await argon2.hash({
    pass: password,
    salt: randomBytes(16),
    time: 3,
    mem: 4096,
    hashLen: 32,
    parallelism: 1,
    type: argon2.ArgonType.Argon2id,
  });

  return result.encoded;
}

/**
 * Verifies a password against its hash
 * @param hash - The encoded hash string to verify against
 * @param plain - The plain text password to verify
 * @returns A promise that resolves to true if the password matches, false otherwise
 */
async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    const result = await argon2.verify({
      pass: plain,
      encoded: hash,
    });
    return result.verified;
  } catch (error) {
    return false;
  }
}

export { verifyPassword, hashPassword };
