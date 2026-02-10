import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import diagramPlugin from "./vite-plugin-diagram";

export default defineConfig({
  plugins: [react(), diagramPlugin()],
  server: {
    port: 5174,
    strictPort: true,
    open: true,
  },
});
