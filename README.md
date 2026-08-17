# Vanshika Soner — Product Designer

A single-page portfolio. No framework, no build step.

**Concept.** Twelve project cards — eight desktop product sites and four iOS apps in device
frames — float scattered and tilted across the home screen. One viewport of scroll settles them
into an editorial grid while the whole page inverts from near-black through a warm mid-tone to
paper, then back to ink at the contact section.

- Hero: *Clarity is the product.* / Conversion is the goal.
- Header (portrait + name) is first-screen only; it fades out as soon as you scroll.
- Thin scroll-progress rule at the top once you leave the hero.

## Files

```
index.html      markup + copy
styles.css      type scale, grid, card + iPhone frame system, theme variables
main.js         scroll engine (card settle, palette inversion, header, reveals)
avatar.jpg      profile portrait
*.jpg           desktop product-site captures
app-*.jpg       iOS app captures shown inside the CSS iPhone frame
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Static site, zero config on Vercel — no build command, no output directory. Push to `main` and
it redeploys.

## Layout notes

The work grid is a 4-column grid: desktop cards span 2 columns, app cards span 1, so phones sit
in pairs beside the wide web captures. Below 1080px it collapses to 2 columns (web full width,
two phones per row).

Scatter positions live in `SCATTER_WIDE` / `SCATTER_NARROW` in `main.js`. Each entry is
`{x, y, r, w, d}` — position as a fraction of the viewport, rotation, target on-screen width as
a fraction of viewport width, and pointer-parallax depth. Card scale is derived from `w` at
measure time, so the scatter holds its proportions across screen sizes.

## Notes

- Project imagery is captured from public marketing sites and App Store listings of the products
  shown. This is a sample portfolio — swap in real case studies before using it commercially.
- Contact: `vanshusoner@gmail.com` · [LinkedIn](https://www.linkedin.com/in/vanshika-soner/)
- `prefers-reduced-motion` is respected: cards render straight into the grid, drift and reveal
  animations are disabled, and the palette still tracks scroll.
