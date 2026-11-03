import { useEffect, useMemo, useState } from 'react'
import { loadManifold } from '@/geometry/manifold-loader'
import type { MeshData } from '@/geometry/mesh'
import { hasOpenings } from '@/geometry/openings'
import { cutShell, previewParts, type Part } from '@/geometry/parts'
import type { DesignConfig } from '@/model/config'

/** Wait this long after the last change before cutting, so dragging a slider stays smooth. */
const SETTLE_MS = 120

/**
 * Parts for the preview. The uncut shell shows at once; when the design has
 * openwork or windows, the geometry kernel cuts them a moment later and the
 * cut shell takes its place. The last cut stays on screen while the next one
 * is worked out, so the view doesn't flicker.
 */
export function useShellParts(config: DesignConfig): { parts: Part[]; cutting: boolean } {
  const parts = useMemo(() => previewParts(config), [config])
  const openings = useMemo(() => hasOpenings(config), [config])
  const [cut, setCut] = useState<{ config: DesignConfig; mesh: MeshData } | null>(null)

  useEffect(() => {
    if (!openings) return
    let cancelled = false
    const timer = setTimeout(() => {
      loadManifold()
        .then((wasm) => {
          if (cancelled) return
          const mesh = cutShell(wasm, config)
          if (mesh) setCut({ config, mesh })
        })
        .catch((error) => console.error('Could not cut the openings', error))
    }, SETTLE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [config, openings])

  if (!openings || !cut) return { parts, cutting: openings }
  return {
    parts: parts.map((p) => (p.id === 'shell' ? { ...p, mesh: cut.mesh } : p)),
    cutting: cut.config !== config,
  }
}
