import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  // This configuration tells Vite to treat all files ending in .glsl
  // as assets. This allows you to import their raw text content directly
  // into your JavaScript files for use with THREE.ShaderMaterial.
  assetsInclude: ["**/*.glsl"],

  // Configuration settings go here.
  // For a basic project relying on default behavior (like yours),
  // this file is often minimal.
});
