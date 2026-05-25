import { defineConfig } from 'vite';

// Vite config for development and GitHub Pages deployment
// - Uses a relative base ('./') so the built site can be served from any path
//   (GitHub Pages repository pages, custom domain, or local file server).
// - ?raw imports for shader files work out of the box with Vite.

// base: process.env.BASE_URL || './',
//    base: "/ThreeJS-PWA-ECS-Surface-Stable-Dithering-With-Vite/",
// 

export default defineConfig({
    base: process.env.BASE_URL || './',
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      // Mirror the importmap entries from index.html so bare imports like
      // import {EntityManager} from "entity_manager" work in Vite dev.
      //
      // Note: We intentionally keep the browser importmap in index.html for
      // non-bundled/static deployments (e.g. GitHub Pages without a build
      // step). Vite does not use that importmap during dev/build and resolves
      // bare imports itself, so we duplicate the mapping here as aliases.
      //
      // Alternative: Convert all imports to explicit relative paths and remove
      // both the importmap and these aliases. That is the most portable
      // approach but requires updating many import statements in the source.
      
      'entity_manager': '/classes/ECS/entity_manager.js',
      'entity': '/classes/ECS/entity.js',
      'entity_component': '/classes/ECS/entity_component.js',
      'player': '/entity components/player_controller.js',
          'camera': '/entity components/camera_controller_first_person.js',

          'url': 'url'
    }
  },
  build: {
    // keep default options; adjust outDir if you prefer a different folder
    outDir: 'dist',
    },
    assetsInclude: ['**/*.frag', '**/*.vert'], // treat as assets
});
