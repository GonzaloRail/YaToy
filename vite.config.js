import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Al desplegar en GitHub Pages se reemplazará por "/YaToy/".
  base: process.env.GITHUB_ACTIONS ? "/YaToy/" : "/",
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
      },
    },
  },
});
