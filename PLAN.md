# Perfume Bottle Configurator — Plan

## 1. Goal

A web app that lets people design a personalised, 3D-printable shell and cap
for a standard glass perfume bottle. They leave with files they can print
right away and assemble around the glass bottle.

The app shows the full personalisation flow for the workshop:

> choose a silhouette → adjust proportions → pick a surface texture → design
> the cap → add initials / brand mark → preview the model → 3D print →
> assemble around the glass bottle → refine based on feedback

It is one of three configurable 3D-printed consumer products our team is
documenting. The other two are a keycap configurator and an eyewear
configurator. This app focuses on how a bottle's silhouette, proportions,
surface and cap express a person's style or a brand's identity.

The glass inner bottle stays the same for every design and can be replaced or
refilled (screw neck, removable pump). The printed shell and cap carry the
design. This follows the Formula 1 × Ross Lovegrove "Engineered" collection
and the Viktor&Rolf Flowerbomb printed edition (see `CASES.md`).

## 2. Users

All four groups use the app. The main focus is **people who will actually
print the result**, so every export must be printable and dimensionally
reliable.

1. **Workshop participants.** They design a bottle on site, print it and
   assemble it. The app must be quick to learn and fun to use.
2. **Consumers.** They want a bottle with their own style, for themselves or
   as a gift.
3. **Niche / independent perfume brands.** They want a branded shell quickly,
   for small batches.
4. **Design students and designers.** They explore forms and continue in
   Rhino.

## 3. Inputs → Process → Outputs

**Inputs**
- Glass inner bottle: preset (10 / 30 / 50 ml) or custom dimensions
- Assembly method: bottom-loaded with base cap, top-loaded cup, or two halves
- Silhouette preset and proportions (advanced: profile control points)
- Surface texture(s), viewing windows
- Cap form and cap fit type
- Personalisation: style preset, text relief (EN / 中文), logo (SVG / PNG),
  design number, colour and finish, liquid colour
- Print technology (FDM / resin / print service), material, fit clearance
- Fit feedback after a test print
- Optional: imported JSON configuration, share link or parameter code

**Process**
1. Build the inner cavity from the glass bottle dimensions plus the fit
   clearance.
2. Build the outer shell from the silhouette profile and proportions
   (revolved, polygonal or free-form, depending on the silhouette).
3. Apply the surface texture (displacement, facets or openwork), windows and
   the coral pattern (seeded).
4. Split the shell for the chosen assembly method and add the fit features
   (base cap thread / snap, friction ribs, half-shell snaps or magnet pockets).
5. Build the cap around the pump clearance, either following the body or
   using its own form, and add the chosen cap fit.
6. Add text relief, logo and the design number.
7. Check the design against the minimum wall, hole and overhang rules for the
   chosen technology and show warnings.
8. Show a live 3D preview: printed shell in the chosen colour and finish,
   refractive glass and coloured liquid inside.

**Outputs**
- **STL**: one file per printed part (shell or shell halves, base cap, cap)
- **3MF**: all parts in one file as separate objects, with colours
- **3DM**: Rhino file with named layers per part (plus a reference layer for
  the glass bottle)
- **Separate shell / cap export**, bundled as a ZIP when several parts are
  exported
- **Design card / spec sheet (PNG + PDF)**: render, parameter table, glass
  bottle spec, print settings, post-processing tips, design number, QR code
- **Fit test rings**: short slices of the neck and body fit, for a quick test
  print before the full shell
- **JSON configuration**, **share link** and **parameter code**

## 4. Parameters

Lengths are in millimetres. Every slider has a number input next to it.

### 4.1 Glass inner bottle

The preset dimensions below are placeholders. They are replaced by measured
values of the bottles we actually buy (build step 4).

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Bottle preset | enum | 10 ml, 30 ml, 50 ml, Custom | 30 ml |
| Body diameter | mm | 15 – 60 | 10 ml: 20 · 30 ml: 30 · 50 ml: 36 |
| Body height (base to shoulder) | mm | 40 – 150 | 10 ml: 60 · 30 ml: 70 · 50 ml: 85 |
| Shoulder radius | mm | 0 – 10 | 3 |
| Neck finish | enum | 13/415, 15/415, 18/415, Custom | 10 ml: 13/415 · 30 / 50 ml: 18/415 |
| Neck height | mm | 5 – 20 | 10 |
| Pump collar diameter | mm | 10 – 30 | per neck finish |
| Pump height above neck (incl. actuator) | mm | 10 – 40 | 22 |

### 4.2 Assembly and fit

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Assembly method | enum | Bottom-loaded + base cap, Top-loaded cup, Two halves | recommended per silhouette |
| Base cap fixing (bottom-loaded) | enum | Screw thread, Snap | Screw thread |
| Half-shell joint (two halves) | enum | Snaps, Magnets (Ø × h) | Snaps |
| Magnet size | mm | Ø 3 – 8 × 1 – 3 | 5 × 2 |
| Fit clearance (shell ↔ glass) | mm | 0.2 – 0.6, step 0.05 | FDM 0.35 · resin 0.25 |
| Friction ribs (top-loaded) | count | 0 – 6 | 3 |

### 4.3 Silhouette and proportions

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Silhouette | enum | Column, Teardrop, Faceted Prism, Pebble, Exoskeleton Frame, Coral | Column |
| Shell height (without cap) | mm | bottle height + 5 – + 40 | + 15 |
| Shoulder height | % of shell height | 50 – 90 | 80 |
| Shoulder width | mm | bottle Ø + 4 – + 40 | + 12 |
| Base width | mm | bottle Ø + 4 – + 40 | + 12 |
| Corner radius | mm | 0 – 15 | 4 |
| Cross-section ratio (Pebble, Column) | – | 0.5 – 1.0 (depth / width) | 1.0 (Pebble 0.65) |
| Sides (Faceted Prism) | count | 5 – 12 | 6 |
| Twist (Faceted Prism) | ° | 0 – 90 | 0 |
| Strut count (Exoskeleton) | count | 3 – 12 | 6 |
| Strut width (Exoskeleton) | mm | technology min. – 8 | 4 |
| Hole density (Coral) | – | 0 – 1 | 0.5 |
| Groove depth (Coral) | mm | 0 – 3 | 1.2 |
| Growth seed (Coral) | integer | 0 – 9999, plus a "new seed" button | random |
| Profile control points (advanced) | points | 4 – 10 points on the side profile, dragged in a 2D editor | from the preset |

Each silhouette has a name and a one-line inspiration note, for example
"Coral: the slow growth of a shallow reef".

### 4.4 Surface texture and windows

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Texture | enum | Smooth, Fluted, Facets, Waves, Cellular openwork | Smooth |
| Flute count / depth | count / mm | 8 – 48 / 0.3 – 3 | 24 / 1.0 |
| Facet count | count | 6 – 40 | 16 |
| Wave direction | enum | Horizontal, Spiral | Horizontal |
| Wave length / amplitude | mm | 4 – 30 / 0.3 – 3 | 12 / 1.0 |
| Cell size (openwork) | mm | 6 – 25 | 12 |
| Cell rim width (openwork) | mm | technology min. – 6 | 2.5 |
| Texture zones (advanced) | enum | Whole shell, Lower part only, Two bands (upper / lower texture) | Whole shell |
| Zone split height (advanced) | % of shell height | 20 – 80 | 50 |
| Windows | count | 0 – 6 | 0 |
| Window shape | enum | Slot, Arch, Ellipse | Slot |
| Window width / height | mm | 4 – 20 / 10 – shell height − 10 | 8 / 40 |

**Allowed combinations.** In the default mode, each silhouette only offers the
textures that suit it (Exoskeleton and Coral use their own structure and take
no extra texture). In the advanced mode, any combination is allowed, and
risky ones show a warning.

### 4.5 Cap

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Cap form | enum | Follow body, Cylinder, Sphere, Faceted Gem, Sculptural (bud / coral branch / free organic) | Follow body |
| Cap height | mm | 15 – 60 (never lower than the pump clearance) | 30 |
| Cap width | % of shoulder width | 40 – 110 | 70 |
| Cap fit | enum | Friction, Snap, Magnet | Friction |
| Cap clearance | mm | 0.2 – 0.6 | same as the shell clearance |

### 4.6 Personalisation

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Style preset | enum | Minimal, Vintage, Natural, Futuristic, Luxury (each sets silhouette, texture, cap, colour) | — |
| Text | string | up to 2 lines × 12 characters (Latin or Chinese) | — |
| Text mode | enum | Raised, Engraved | Engraved |
| Text size / depth | mm | 3 – 15 / 0.4 – 1.5 | 6 / 0.8 |
| Text position | enum | Front, Back, Base, Cap top | Back |
| Logo | file | SVG, or black-and-white PNG (traced to outlines), ≤ 2 MB | — |
| Logo size / position | mm / enum | 5 – 40 / Front, Back, Cap top | 15 / Cap top |
| Design number | toggle | auto-generated code engraved on the base | on |
| Shell / cap colour | colour | free hex, plus swatches for common filament colours | sand #E6D8BF |
| Finish | enum | Matte, Silk, Translucent, Metallic | Matte |
| Liquid colour | colour | free hex | pale amber |

### 4.7 Manufacturing

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Technology | enum | FDM, Resin (SLA/DLP), Print service (SLS nylon) | FDM |
| Printer preset | enum | Generic per technology; Bambu Lab X1 / P1S / A1, Prusa MK4 (FDM); Elegoo / Anycubic resin; Generic SLS service | Generic FDM (Bambu-class) |
| Material | enum | FDM: PLA, PETG · Resin: Standard, Tough · SLS: PA12 | PLA |

## 5. Constraints

**Fit**
- The shell cavity is always the glass bottle plus the fit clearance. No
  setting may make the shell intersect the glass.
- The cap must clear the pump and actuator by at least 2 mm.
- For "Two halves", the shell may be narrower than the bottle above or below
  it. For the other methods, the opening must let the bottle pass, so the app
  warns if the profile closes in too much.

**Technology defaults** (applied when the technology changes; the user can
override them)

| Technology | Min. wall | Min. hole / window | Min. strut / rim | Max. overhang | Default clearance | Notes |
|---|---|---|---|---|---|---|
| FDM | 1.6 mm | 2.0 mm | 2.0 mm | 45° (support-free goal) | 0.35 mm | print shell upright; coarse textures only |
| Resin | 1.0 mm | 1.0 mm | 1.2 mm | supported | 0.25 mm | drain holes for closed parts; wash and cure |
| SLS service | 1.2 mm | 1.5 mm | 1.5 mm | no supports | 0.30 mm | powder escape for enclosed spaces |

**Validation**
- Warnings, not hard blocks, with a short reason and a fix suggestion
  (e.g. "Holes are too small for FDM; use ≥ 2 mm").
- Minimum wall thickness and hole size are enforced as slider minimums.

**Fit feedback**
- After a test print, the user reports the shell fit (too tight / just right /
  too loose) and the cap fit (falls off / just right / won't open).
  The app adjusts the clearance by ±0.05–0.1 mm and saves a new version.

**Platform and data**
- Fully static app: runs locally and on GitHub Pages, with no backend.
- Must work in mainland China: no Google Fonts and no external CDNs. All
  fonts (including a Chinese font for text relief) are bundled and
  lazy-loaded.
- All saved designs, versions, notes and photos stay in the browser
  (IndexedDB). Photos are never uploaded.
- Share links and parameter codes encode the full configuration. Uploaded
  logos are not included in links; the user is warned when this happens.

**Language**
- English and Chinese UI, **English by default**, switchable at any time.

## 6. Tech stack

**Core (fixed; do not change without asking):**
- Vite + React + TypeScript + Tailwind CSS
- UI components: shadcn/ui
- 3D: React Three Fiber + drei (glass with `MeshTransmissionMaterial`)
- Rhino export: rhino3dm

**Proposed additions (to confirm when the step comes up):**
- `manifold-3d` (WASM): booleans for the cavity, windows, openwork, splits,
  text and logo
- `opentype.js`: glyph outlines for Latin and Chinese text relief
- `jspdf`: spec sheet PDF
- `qrcode`: QR codes for share links
- `jszip`: multi-part export and 3MF packaging
- `idb-keyval`: IndexedDB storage for designs, versions and photos

**Built in-house (no extra library):**
- Profile, revolve and polygon-section generators per silhouette
- Seeded noise for the coral pattern and cellular openwork
- 3MF writer (XML + ZIP)
- EN / 中文 string dictionary and language context
- STL export through three.js `STLExporter`

## 7. Pages

The app uses hash routing so that it works on GitHub Pages.

| Route | Page | Purpose |
|---|---|---|
| `#/` | Home | The "glass bottle + printed shell" idea, the flow, example designs, start button |
| `#/configure` | Configurator | 3D preview beside a step panel: Bottle → Silhouette → Proportions → Texture → Cap → Personalise → Print & export. Any step can be reopened at any time. An **Advanced** switch unlocks control points, free texture combinations and texture zones. |
| `#/inspiration` | Inspiration | The reference cases from `CASES.md`, each with what it inspired in the app |
| `#/guide` | Print & assembly guide | Printing per technology, fit test rings, post-processing (sanding, painting, metallic spray), how to insert the bottle and fit the cap |
| `#/my-designs` | My designs | Saved designs with version history (v1, v2…), parameter diff, notes, photos, fit feedback, and reopen / duplicate / delete |

A header holds the language switch (EN / 中文) and links to all pages.

**Visual style:** ocean / organic nature. Soft blue-greens, sand and off-white,
flowing curves and gentle motion. The preview shows the bottle in soft light
with refractive glass and coloured liquid. It must look clearly different from
the keycap configurator (industrial technical drawing) and the vase
configurator.

## 8. Out of scope

- User accounts, login and cloud storage
- Online ordering and payment (the app only prepares files for a print
  service)
- Filling, selling or buying perfume
- Designing the glass bottle itself or the pump
- Slicing / G-code generation and sending jobs to printers
- Multi-user collaborative editing

## 9. Build order

Each step should run and be checked in the browser before the next one starts.

1. **Scaffold.** Vite + React + TS, Tailwind, shadcn/ui, hash router and
   empty pages. Set up git and push to a new `perfume-configurator` repo.
2. **Design tokens and layout.** Ocean / organic theme, bundled local fonts,
   app shell, navigation and EN / 中文 dictionary (English default).
3. **State model.** Typed `BottleConfig` with defaults and ranges from §4,
   plus a reducer and URL / JSON / parameter-code (de)serialisation.
4. **Glass bottle presets.** Measure the bought 10 / 30 / 50 ml bottles,
   replace the placeholder values, and add custom dimensions.
5. **3D viewport.** R3F canvas, lighting, and the glass bottle with
   refractive glass, liquid and pump.
6. **Column shell.** Revolved profile from the proportions, inner cavity with
   clearance, wall thickness check.
7. **STL export and first test print.** Column shell, top-loaded, on FDM;
   check the fit.
8. **Fit test rings** export, and tune the default clearances.
9. **Other silhouettes.** Teardrop, Faceted Prism, Pebble.
10. **Assembly methods.** Bottom-loaded with base cap (thread / snap), and
    two halves (snaps / magnet pockets).
11. **Cap.** Follow-body cap, then Cylinder, Sphere, Faceted Gem and
    Sculptural; friction / snap / magnet fits.
12. **Textures.** Smooth, Fluted, Facets, Waves; allowed-combination rules.
13. **Openwork and windows.** Cellular openwork and viewing windows.
14. **Exoskeleton Frame** silhouette.
15. **Coral** silhouette with grooves, holes and the growth seed.
16. **Manufacturing panel.** Technology, printer presets, materials;
    technology defaults and validation warnings.
17. **Personalisation.** Text relief (Latin, then Chinese), logo, design
    number, style presets, colour / finish and liquid colour.
18. **Advanced mode.** Profile control-point editor, free texture
    combinations with warnings, texture zones.
19. **More exports.** 3MF, 3DM via rhino3dm, separate parts as ZIP, design
    card PNG and spec sheet PDF with QR code.
20. **Save and share.** Local autosave, My designs page, versions and diff,
    notes and photos, JSON import / export, share link and parameter code.
21. **Fit feedback.** Feedback form that adjusts the clearance and saves a new
    version.
22. **Content pages.** Home, Inspiration and Print & assembly guide, with
    a story line for each silhouette and post-processing tips.
23. **Print validation.** Print each silhouette with FDM and resin; adjust
    the minimums and default clearances based on the results.
24. **Deploy.** GitHub Pages workflow; check local `npm run dev`, the
    production build and access from mainland China.
