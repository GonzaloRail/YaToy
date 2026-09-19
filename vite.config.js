import { defineConfig } from "vite";

export default defineConfig({
  // Al desplegar en GitHub Pages se reemplazará por "/YaToy/".
  base: process.env.GITHUB_ACTIONS ? "/YaToy/" : "/",
});
