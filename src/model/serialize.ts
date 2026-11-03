import { DEFAULT_CONFIG, type DesignConfig, type Section } from './config'
import { sanitizeConfig } from './sanitize'

export const FILE_FORMAT = 'perfume-configurator'
export const FILE_VERSION = 1

// ---------- JSON design file ----------

export function toDesignFile(config: DesignConfig, savedAt = new Date()): string {
  return JSON.stringify(
    { format: FILE_FORMAT, version: FILE_VERSION, savedAt: savedAt.toISOString(), config },
    null,
    2,
  )
}

export type ParseResult =
  | { ok: true; config: DesignConfig }
  | { ok: false; error: 'invalid-json' | 'not-a-design' | 'newer-version' }

export function parseDesignFile(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'not-a-design' }
  const file = data as { format?: unknown; version?: unknown; config?: unknown }
  if (file.format !== FILE_FORMAT || typeof file.config !== 'object') return { ok: false, error: 'not-a-design' }
  if (typeof file.version === 'number' && file.version > FILE_VERSION) return { ok: false, error: 'newer-version' }
  return { ok: true, config: sanitizeConfig(file.config) }
}

// ---------- Share link and parameter code ----------

// Profile points are arrays, so values are compared by their JSON form
const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

/** Keep only the fields that differ from the defaults. */
function diffFromDefaults(config: DesignConfig) {
  const diff: Partial<Record<Section, Record<string, unknown>>> = {}
  for (const section of Object.keys(DEFAULT_CONFIG) as Section[]) {
    const defaults = DEFAULT_CONFIG[section] as unknown as Record<string, unknown>
    const values = config[section] as unknown as Record<string, unknown>
    for (const key of Object.keys(defaults)) {
      if (!same(values[key], defaults[key])) (diff[section] ??= {})[key] = values[key]
    }
  }
  return diff
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(param: string): string {
  const base64 = param.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

/**
 * Encode a design for the `c` URL parameter. Uploaded logos can't travel in a
 * link, so their name is dropped and `droppedLogo` tells the UI to warn.
 */
export function encodeShareParam(config: DesignConfig): { param: string; droppedLogo: boolean } {
  const droppedLogo = config.personal.logoName !== null
  const shareable = { ...config, personal: { ...config.personal, logoName: null } }
  return { param: toBase64Url(JSON.stringify(diffFromDefaults(shareable))), droppedLogo }
}

/** Decode a `c` parameter; returns null when it is unreadable. */
export function decodeShareParam(param: string): DesignConfig | null {
  try {
    return sanitizeConfig(JSON.parse(fromBase64Url(param)))
  } catch {
    return null
  }
}

/** Full share URL, e.g. https://…/perfume-bottle-configurator/#/configure?c=… */
export function buildShareUrl(config: DesignConfig, pageUrl: string) {
  const { param, droppedLogo } = encodeShareParam(config)
  const base = pageUrl.split('#')[0]
  return { url: `${base}#/configure?c=${param}`, droppedLogo }
}

/** Read the `c` parameter from a location hash such as "#/configure?c=…". */
export function readShareParam(hash: string): string | null {
  const query = hash.split('?')[1]
  return query ? new URLSearchParams(query).get('c') : null
}

// The parameter code is the same payload with a version prefix, short enough
// to print on the spec sheet and paste into the app by hand.
const CODE_PREFIX = 'PB1-'

export function toParameterCode(config: DesignConfig): { code: string; droppedLogo: boolean } {
  const { param, droppedLogo } = encodeShareParam(config)
  return { code: CODE_PREFIX + param, droppedLogo }
}

/** Accepts a parameter code, or a whole share link pasted by mistake. */
export function parseParameterCode(input: string): DesignConfig | null {
  const text = input.trim()
  if (text.startsWith(CODE_PREFIX)) return decodeShareParam(text.slice(CODE_PREFIX.length))
  const param = readShareParam(text.includes('#') ? text.slice(text.indexOf('#')) : '')
  return param ? decodeShareParam(param) : null
}
