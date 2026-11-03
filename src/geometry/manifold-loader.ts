import Module, { type ManifoldToplevel } from 'manifold-3d'
import wasmUrl from 'manifold-3d/manifold.wasm?url'

let ready: Promise<ManifoldToplevel> | undefined

/** Load the manifold geometry kernel (WASM, bundled with the site) once, on first use. */
export function loadManifold(): Promise<ManifoldToplevel> {
  ready ??= Module({ locateFile: () => wasmUrl }).then((wasm) => {
    wasm.setup()
    return wasm
  })
  return ready
}
