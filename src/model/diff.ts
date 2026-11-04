import { DEFAULT_CONFIG, type DesignConfig, type Section } from './config'

// What changed between two versions of a design, field by field.

export interface Change {
  section: Section
  key: string
  from: unknown
  to: unknown
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

export function diffConfigs(a: DesignConfig, b: DesignConfig): Change[] {
  const changes: Change[] = []
  for (const section of Object.keys(DEFAULT_CONFIG) as Section[]) {
    const from = a[section] as unknown as Record<string, unknown>
    const to = b[section] as unknown as Record<string, unknown>
    for (const key of Object.keys(DEFAULT_CONFIG[section])) {
      if (!same(from[key], to[key])) changes.push({ section, key, from: from[key], to: to[key] })
    }
  }
  return changes
}
