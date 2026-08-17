# Vanshika Soner — Product Designer

A single-page portfolio. No framework, no build step: three files plus eight images.

**Concept.** Eight project cards float, scattered and tilted, across the home screen. As you
scroll one viewport, they settle into an editorial grid while the entire page inverts from
near-black to warm paper — and inverts back to ink at the contact section.

## Stack

Static HTML + CSS + vanilla JS. Everything is driven by one `requestAnimationFrame` loop in
`main.js` that damps the scroll position and writes CSS custom properties (`--bg`, `--fg`,
`--surface`, `--line`) plus a per-card `transform`. No dependencies, no bundler.

```
index.html      markup + copy
styles.css      type scale, grid, card system, theme variables
main.js         scroll engine (card settle + palette inversion + reveals)
*.jpg           project card imagery
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Vercel picks this up as a static site with zero configuration — no build command, no output
directory. Push to GitHub, import the repo, deploy.

## Notes

- Project imagery is captured from the public marketing sites of the products shown. This is a
  sample portfolio; swap in real case studies before using it commercially.
- Contact address in `index.html` is a placeholder (`hello@vanshikasoner.com`) — change it.
- `prefers-reduced-motion` is respected: cards render straight into the grid, drift and reveal
  animations are disabled, and the palette still tracks scroll.
