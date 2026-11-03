import type { DesignConfig } from './config'
import { encodeShareParam } from './serialize'

// A short code that names a design, engraved on its base (like the numbered
// Flowerbomb edition). The same design always gets the same code; any change
// to it gives a new one.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base 32: no I, L, O, U

/** e.g. "PB-7K3QX" */
export function designCode(config: DesignConfig): string {
  // FNV-1a over the share payload (the logo file name is left out of it)
  const text = encodeShareParam(config).param
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += ALPHABET[h & 31]
    h >>>= 5
  }
  return `PB-${code}`
}
