# Perfume Bottle Configurator

A web app for designing a 3D-printed shell and cap around a standard,
refillable glass perfume bottle, and exporting files you can print right
away. One of three configurable 3D-printed products in our workshop project
(with a keycap and an eyewear configurator). See [PLAN.md](PLAN.md) for the
brief and [CASES.md](CASES.md) for the reference cases.

**Choose a silhouette → adjust proportions → pick a texture → design the cap → add initials or a mark → preview → 3D print → assemble and refine.**

**Live site:** https://fu07579779260-ux.github.io/perfume-bottle-configurator/

## What it does

- Glass bottles: 10, 30 and 50 ml presets or your own sizes, with spray pump
- Six silhouettes: Column, Teardrop, Faceted Prism (with twist), Pebble, Exoskeleton Frame, Coral (brain-coral grooves and pores)
- Three ways in: top-loaded cup (optional friction ribs), bottom-loaded sleeve with a screw-thread or snap base cap, two halves with dowels or magnets
- Textures: fluted, facets, waves, cellular openwork, plus viewing windows
- Caps: follow the body, cylinder, sphere, faceted gem, sculptural (bud, coral branch, free organic); friction, snap or magnet fit
- Personalisation: raised or engraved text (Chinese too), uploaded logos (SVG / PNG), an engraved design number, style presets, colours and finishes
- Advanced mode: draw the outline with control points, combine any texture, texture zones
- Printing: FDM, resin or a print service, printer presets, one list of checks (walls, overhangs, bed size, joints)
- Fit test rings, and fit feedback after a test print that adjusts the clearances for the next version
- Exports: STL (all parts laid out), 3MF, parts ZIP, Rhino 3DM with the glass bottle, spec sheet PDF, design card PNG with QR code
- My designs: versions, comparison, notes and photos; share links, parameter codes, JSON files
- Interface in English and Chinese

Everything runs in the browser: no account, no server, nothing uploaded.

## Run it on your computer

Needs [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

| Command | What it does |
|---|---|
| `npm test` | Unit tests (geometry, exports, model, storage) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. On GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` then tests, builds and publishes the site to
   `https://<account>.github.io/<repository-name>/` (see `.github/workflows/deploy-pages.yml`).

The site loads no fonts, libraries or models from other servers: the display font, the geometry
kernel (manifold-3d) and rhino3dm are bundled, and text relief uses the device's own fonts, so it
also works in mainland China.

## Tech stack

Vite · React · TypeScript · Tailwind CSS · shadcn/ui · React Three Fiber + drei · rhino3dm ·
manifold-3d (solid geometry) · jsPDF · JSZip · qrcode · idb-keyval
