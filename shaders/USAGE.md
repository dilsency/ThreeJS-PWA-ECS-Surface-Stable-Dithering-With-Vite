Usage example - Simple_FractalDithering (Three.js, WebGL2)

This shows how to create a WebGL2 renderer, load a texture, and create the fractal dithering material using the async factory provided by shaders/Simple_FractalDithering.js.

Important: the shader .vert/.frag files are fetched at runtime by the factory. Ensure your development server serves these files (text/plain is fine) and that you run from a server (not file://).

Example (ES module):

```js
import * as THREE from 'three';
import { createFractalMaterial } from './Simple_FractalDithering.js';

async function init() {
  // Create a WebGL2 context to ensure GLSL 3.0 (GLSL ES 3.00)
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  const renderer = new THREE.WebGLRenderer({ canvas, context });
  document.body.appendChild(renderer.domElement);

  // Simple scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 2);

  // Load a texture (example)
  const loader = new THREE.TextureLoader();
  const texture = await new Promise((res, rej) => loader.load('path/to/your/texture.jpg', res, undefined, rej));

  // Create the material (fetches shader files relative to this module)
  const material = await createFractalMaterial({ map: texture, level: 3 });

  // Geometry & mesh
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Resize handling
  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}

init().catch(console.error);
```

Lighting modes:
- By default (`lighting` unset/false) the dither pattern is driven purely by the texture's albedo (unlit).
- Pass `lighting: true` to instead drive it from the scene's first directional light (half-lambert `N·L`) combined with that light's shadow map, e.g. `createFractalMaterial({ map: texture, lighting: true })`.
- For the lit mode to have any visible effect you also need, as usual in Three.js: a `THREE.DirectionalLight` added to the scene, `renderer.shadowMap.enabled = true` if you want shadows, the light's `castShadow = true`, and the mesh's `receiveShadow = true` (and `castShadow = true` on any occluders).
- Pass `debugNormals: true` (only meaningful with `lighting: true`) to bypass the dithering and instead output the mesh's view-space normal as an RGB color (same convention as `THREE.MeshNormalMaterial`) — useful for checking that shading looks right before debugging the dither pattern on top of it.

Colors:
- `color1` is the background color shown where no dot/symbol appears (i.e. darker/lower-luminance areas); `color2` is the color of the dots/symbols themselves, which appear more densely as luminance increases.
- Both accept a `THREE.Color`, a hex number (`0xff8800`), a CSS color string (`"orange"`), or an `[r, g, b, (a)]` array. Defaults match the original Unity shader (`color1`: dark olive, `color2`: near-white). Example: `createFractalMaterial({ map: texture, color1: 0x00008b, color2: 0xff8000 })`.

Notes:
- If you use a bundler that supports importing raw text (e.g. Vite's `?raw`), you can fetch shader sources with that instead and use `createFractalMaterialFromSources(vertSource, fragSource, opts)`.

  // Vite example (raw import):
  // import vertSource from './Simple_FractalDithering.vert?raw';
  // import fragSource from './Simple_FractalDithering.frag?raw';
  // const mat = createFractalMaterialFromSources(vertSource, fragSource, { map: texture });
- If you run into shader compilation errors referencing `#version`, make sure you create the material with `glslVersion: THREE.GLSL3` (the factory does this already) and use a WebGL2 renderer context.

