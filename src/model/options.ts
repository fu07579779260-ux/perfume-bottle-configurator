// The six base silhouettes (PLAN.md §4.3)
export const SILHOUETTES = ['column', 'teardrop', 'prism', 'pebble', 'exoskeleton', 'coral'] as const

export type Silhouette = (typeof SILHOUETTES)[number]
