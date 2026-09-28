import { randomInt } from 'node:crypto'
import { REFERENCE_PREFIX } from '../config.js'

/** No 0/O or 1/I, so a reference is easy to read aloud and type back in. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LENGTH = 6

export function generateReference(): string {
  let code = ''
  for (let index = 0; index < LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)]
  }
  return `${REFERENCE_PREFIX}-${code}`
}

/** Accepts what customers actually type: any case, with or without the dash or prefix. */
export function normalizeReference(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const code = compact.startsWith(REFERENCE_PREFIX) && compact.length > LENGTH ? compact.slice(REFERENCE_PREFIX.length) : compact
  return `${REFERENCE_PREFIX}-${code}`
}
