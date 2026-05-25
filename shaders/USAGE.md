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

Notes:
- If you use a bundler that supports importing raw text (e.g. Vite's `?raw`), you can fetch shader sources with that instead and use `createFractalMaterialFromSources(vertSource, fragSource, opts)`.

  // Vite example (raw import):
  // import vertSource from './Simple_FractalDithering.vert?raw';
  // import fragSource from './Simple_FractalDithering.frag?raw';
  // const mat = createFractalMaterialFromSources(vertSource, fragSource, { map: texture });
- If you run into shader compilation errors referencing `#version`, make sure you create the material with `glslVersion: THREE.GLSL3` (the factory does this already) and use a WebGL2 renderer context.

