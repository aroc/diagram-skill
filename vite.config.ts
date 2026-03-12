import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import diagramPlugin from "./vite-plugin-diagram";
import { viteSingleFile } from "vite-plugin-singlefile";

const isStaticBuild = process.env.DIAGRAM_STATIC === "1";

export default defineConfig({
  plugins: [react(), diagramPlugin(), ...(isStaticBuild ? [viteSingleFile()] : [])],
  server: {
    port: 5174,
    strictPort: true,
    open: true,
  },
});
