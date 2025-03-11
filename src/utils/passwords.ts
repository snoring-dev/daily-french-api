import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

/**
 * Hashes a password using Argon2id algorithm
 * @param password - The plain text password to hash
 * @returns A promise that resolves to the encoded hash string
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return argon2.hash(password, {
    type: argon2.argon2id,
    salt,
    memoryCost: 4096,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
}

/**
 * Verifies a password against its hash
 * @param hash - The encoded hash string to verify against
 * @param plain - The plain text password to verify
 * @returns A promise that resolves to true if the password matches, false otherwise
 */
async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch (error) {
    return false;
  }
}

export { verifyPassword, hashPassword };
