import { useEffect, useMemo, useState } from 'react'
import type { Marks } from '@/geometry/marks'
import { loadManifold } from '@/geometry/manifold-loader'
import { hasOpenings } from '@/geometry/openings'
import { finishedPreview, needsKernel, previewParts, type Part } from '@/geometry/parts'
import type { DesignConfig } from '@/model/config'

/** Wait this long after the last change before cutting, so dragging a slider stays smooth. */
const SETTLE_MS = 120

/**
 * Parts for the preview. The plain parts show at once; when the design has
 * openings or marks, the geometry kernel adds them a moment later and the
 * finished parts take their place. The last result stays on screen while the
 * next one is worked out, so the view doesn't flicker.
 */
export function useShellParts(config: DesignConfig, marks: Marks): { parts: Part[]; cutting: boolean } {
  const parts = useMemo(() => previewParts(config), [config])
  const kernel = useMemo(() => needsKernel(config, marks, hasOpenings(config)), [config, marks])
  const [done, setDone] = useState<{ config: DesignConfig; marks: Marks; parts: Part[] } | null>(null)

  useEffect(() => {
    if (!kernel) return
    let cancelled = false
    const timer = setTimeout(() => {
      loadManifold()
        .then((wasm) => {
          if (!cancelled) setDone({ config, marks, parts: finishedPreview(wasm, config, marks) })
        })
        .catch((error) => console.error('Could not finish the preview', error))
    }, SETTLE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [config, marks, kernel])

  if (!kernel || !done) return { parts, cutting: kernel }
  return { parts: done.parts, cutting: done.config !== config || done.marks !== marks }
}
