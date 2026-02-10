import { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

const DIAGRAM_FILE = "diagram.mermaid";
const DEBOUNCE_MS = 150;

export default function diagramPlugin(): Plugin {
  const diagramPath = path.resolve(process.cwd(), DIAGRAM_FILE);

  return {
    name: "vite-plugin-diagram",

    configureServer(server) {
      // Serve diagram.mermaid at /api/diagram
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/api/diagram") return next();

        if (!fs.existsSync(diagramPath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No diagram.mermaid file found" }));
          return;
        }

        const content = fs.readFileSync(diagramPath, "utf-8");

        // Treat empty files the same as missing
        if (!content.trim()) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "diagram.mermaid is empty" }));
          return;
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.end(content);
      });

      // Watch diagram.mermaid for changes with debounce to coalesce
      // rapid filesystem events (editors often trigger multiple events per save)
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const watcher = fs.watch(
        path.dirname(diagramPath),
        { persistent: false },
        (_eventType, filename) => {
          if (filename === DIAGRAM_FILE || filename === null) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              server.ws.send({ type: "custom", event: "diagram:update" });
            }, DEBOUNCE_MS);
          }
        }
      );

      server.httpServer?.on("close", () => {
        watcher.close();
        if (debounceTimer) clearTimeout(debounceTimer);
      });
    },
  };
}
