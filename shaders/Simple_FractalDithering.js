// Simple_FractalDithering ShaderMaterial factory for Three.js (WebGL2 / GLSL3)
// Note: .vert/.frag files are plain text assets; importing them as modules requires
// bundler configuration (raw loader). To avoid MIME/import issues in the browser,
// this module fetches the shader sources at runtime by default.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";// import * as THREE from "three";

async function loadText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load shader: ${url}`);
  return await r.text();
}

// Create material by fetching shader files relative to this module when not provided.
// Options:
// - map: THREE.Texture
// - vertexShader / fragmentShader: strings (sources)
// - vertUrl / fragUrl: URLs to fetch shader sources
// Returns Promise<THREE.RawShaderMaterial>
export async function createFractalMaterial(opts = {}) {

    var vertSource = "";
    var fragSource = "";

    try {
        // changed
        //new URL('./Simple_FractalDithering.vert', import.meta.url)
        //new URL('./Simple_FractalDithering.frag', import.meta.url)
        // to
        //new URL('./Simple_FractalDithering.vert?raw', import.meta.url)
        //new URL('./Simple_FractalDithering.frag?raw', import.meta.url)

        vertSource = opts.vertexShader || opts.vertexShaderSource ||
            (opts.vertUrl ? await loadText(opts.vertUrl) : await loadText(new URL('./Simple_FractalDithering.vert?raw', import.meta.url)));
        fragSource = opts.fragmentShader || opts.fragmentShaderSource ||
            (opts.fragUrl ? await loadText(opts.fragUrl) : await loadText(new URL('./Simple_FractalDithering.frag?raw', import.meta.url)));
    }
    catch (e) {
        console.error(e);
        throw new Error('Failed to load shader sources. Check console for details.');
    }


  const uniforms = {
    uMainTex: { value: opts.map || new THREE.Texture() },
    uColor1: { value: new THREE.Vector4(0.2, 0.2, 0.098, 1.0) },
    uColor2: { value: new THREE.Vector4(0.898, 1.0, 1.0, 1.0) },
    uScale: { value: opts.scale ?? 3.5 },
    uClamp: { value: opts.clamp ?? new THREE.Vector2(0.2, 1.0) },
    uDotRadius: { value: opts.dotRadius ?? 0.8 },
    uInputExposure: { value: opts.inputExposure ?? 1.0 },
    uInputOffset: { value: opts.inputOffset ?? 0.0 },
    uAASmoothness: { value: opts.aaSmoothness ?? 1.5 },
    uAAStretch: { value: opts.aaStretch ?? 0.125 },
    uLevel: { value: opts.level ?? 2 },
    uQuantizeDots: { value: !!opts.quantizeDots },
    uShape: { value: opts.shape ?? 0 }
  };

  const material = new THREE.RawShaderMaterial({
    vertexShader: vertSource,
    fragmentShader: fragSource,
    uniforms,
    glslVersion: THREE.GLSL3,
    transparent: false,
  });

  return material;
}

// Synchronous helper when you already have shader sources as strings.
export function createFractalMaterialFromSources(vertexSource, fragmentSource, opts = {}) {
  const uniforms = {
    uMainTex: { value: opts.map || new THREE.Texture() },
    uColor1: { value: new THREE.Vector4(0.2, 0.2, 0.098, 1.0) },
    uColor2: { value: new THREE.Vector4(0.898, 1.0, 1.0, 1.0) },
    uScale: { value: opts.scale ?? 3.5 },
    uClamp: { value: opts.clamp ?? new THREE.Vector2(0.2, 1.0) },
    uDotRadius: { value: opts.dotRadius ?? 0.8 },
    uInputExposure: { value: opts.inputExposure ?? 1.0 },
    uInputOffset: { value: opts.inputOffset ?? 0.0 },
    uAASmoothness: { value: opts.aaSmoothness ?? 1.5 },
    uAAStretch: { value: opts.aaStretch ?? 0.125 },
    uLevel: { value: opts.level ?? 2 },
    uQuantizeDots: { value: !!opts.quantizeDots },
    uShape: { value: opts.shape ?? 0 }
  };

  return new THREE.RawShaderMaterial({
    vertexShader: vertexSource,
    fragmentShader: fragmentSource,
    uniforms,
    glslVersion: THREE.GLSL3,
    transparent: false,
  });
}
