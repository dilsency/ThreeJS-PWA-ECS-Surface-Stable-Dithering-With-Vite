Deployment notes — GitHub Pages
================================

Summary
-------
- Added `vite.config.js` to set `base` and include shader files as assets.

Files changed (local only)
--------------------------
- `vite.config.js` — sets `base` to the repo path and `assetsInclude: ['**/*.frag','**/*.vert']` so Vite copies shader files into `dist/assets`.

Build & preview
-----------------
1. Build production bundle:

```bash
npm run build
```

2. Preview the production build locally (serves at the configured `base` path):

```bash
npm run preview
```

Deployment to GitHub Pages
--------------------------
- If your project is published at `https://<user>.github.io/<repo>/`, set `base` in `vite.config.js` to `'/<repo>/'`.
- Deploy the `dist` directory to GitHub Pages (gh-pages branch or the `gh-pages` action). Shaders will be available under `assets/` with hashed filenames (e.g. `assets/Simple_FractalDithering-*.frag`).

Notes on shaders
-----------------
- The project imports or fetches `.vert`/`.frag` shader files at runtime. Vite can either bundle them as plain text (using `?raw`) or copy them as assets into `dist`.
- You can alternatively place shader files into a `public/` folder to guarantee stable, unhashed URLs (e.g. `/shaders/Simple_FractalDithering.frag`). This avoids runtime lookup of hashed asset names.

No commits
----------
- This file is created locally. I did not perform any git commits; review and commit as you prefer.
