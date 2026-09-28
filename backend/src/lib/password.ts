import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * Password hashing with scrypt from Node's standard library (no native add-ons).
 * Stored format: `scrypt$<log2 N>$<r>$<p>$<salt b64>$<hash b64>`, so the cost
 * parameters can be raised later without invalidating existing hashes.
 */

const LOG_N = 15
const R = 8
const P = 3
const KEY_LENGTH = 32
const MAX_MEMORY = 128 * 1024 * 1024

function derive(password: string, salt: Buffer, logN: number, r: number, p: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, length, { N: 2 ** logN, r, p, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, LOG_N, R, P, KEY_LENGTH)
  return ['scrypt', LOG_N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, logN, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !logN || !r || !p || !salt || !hash) return false

  const expected = Buffer.from(hash, 'base64')
  const actual = await derive(password, Buffer.from(salt, 'base64'), Number(logN), Number(r), Number(p), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** A valid hash of a random value, used to keep login timing uniform for unknown emails. */
export const DUMMY_HASH: Promise<string> = hashPassword(randomBytes(18).toString('base64'))
