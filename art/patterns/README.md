# Huayu Lah — Peranakan SVG patterns

Five original editable vector patterns, rebuilt from the approved concept direction. These are simplified vector interpretations, not a pixel-for-pixel trace of the generated concept board. All artwork consists of SVG paths, circles and groups. No raster images, fonts, scripts, external assets or runtime dependencies are embedded in the SVG files.

| Asset | Native viewBox | Repeat | Suggested use |
|---|---|---|---|
| 01-bloom.svg | 256 × 256 | Both axes | Small feature areas and headers |
| 02-quiet-sage.svg | 256 × 256 | Both axes | Page background behind opaque white cards |
| 03a-floral-border.svg | 256 × 96 | Horizontal only | Card bottom strip, 36px high |
| 03b-scallop-border.svg | 128 × 64 | Horizontal only | Slim card trim, 24px high |
| 04-soft-geometry.svg | 256 × 256 | Both axes | Section decorations and map edges |

## Quick start

Unzip all files into one folder and open preview.html to see responsive repeats. preview.png is a static overview. Copy the SVG files and patterns.css into the app's public assets, or adapt the relative URLs to your bundler. The CSS includes background-size values preserving each asset's aspect ratio. SVGs scale cleanly at any resolution.

For a card strip, add `<div class="peranakan-floral-border" aria-hidden="true"></div>` after the card content. Set `overflow: hidden` on the rounded parent card. Use these as decorative CSS backgrounds; do not place meaningful information inside the pattern or reduce opacity on a parent containing text. Use `<img alt="">` if rendering them as decorative images instead.

## Palette and editing

- Ivory: #F6F6EF
- Jade: #458362
- Coral: #D84B3E
- Muted gold: #E6B841
- Sage: #B9CBB6
- Pale sage: #DDE8DD

Open in a vector editor or edit the hex fills/strokes directly. Backgrounds are intentionally opaque ivory. To create a transparent variant, remove only the first full-canvas `<rect>` in the chosen SVG. CSS variables from the host page do not cross into an externally loaded SVG; edit the SVG colors or inline the SVG if runtime theming is required.

Keep Quiet Sage at its supplied pale colors for large areas. Use the stronger patterns sparingly so the mascot and learning content remain prominent. Square patterns have matching opposite boundaries; border strips match left/right only. Align repeat sizes to whole CSS pixels where practical to reduce browser antialiasing seams. If inlining multiple copies, note that these SVGs contain no IDs and cannot collide.

## Validation

Each SVG was XML-parsed and rendered in a repeated layout for visual review. No app repository was changed. The supplied preview is standalone and makes no network requests.
