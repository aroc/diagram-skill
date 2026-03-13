import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────

interface PngOptions {
  diagramPath: string;
  output: string;
  renderer: "excalidraw" | "flow";
  theme: string;
  scale: number;
  padding: number;
  background: string;
  width: number;
  height: number;
}

// ─── CLI argument parsing ────────────────────────────────────────────

const VALID_RENDERERS = ["excalidraw", "flow"] as const;
const VALID_THEMES = ["blueprint", "graphite", "sandstone"] as const;

function parseArgs(args: string[]): PngOptions {
  const opts: PngOptions = {
    diagramPath: "diagram.json",
    output: "diagram.png",
    renderer: "excalidraw",
    theme: "blueprint",
    scale: 2,
    padding: 40,
    background: "white",
    width: 1920,
    height: 1080,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: npm run build:png -- [options]

Options:
  -d, --diagram <file>       Path to diagram JSON (default: "diagram.json")
  -o, --output <file>        Output PNG path (default: "diagram.png")
  -r, --renderer <type>      "excalidraw" or "flow" (default: "excalidraw")
  -t, --theme <name>         "blueprint", "graphite", "sandstone" (default: "blueprint")
  -s, --scale <number>       Device scale factor / DPI multiplier (default: 2)
  -p, --padding <number>     Padding in pixels around diagram (default: 40)
  --background <color>       CSS color or "transparent" (default: "white")
  --width <number>           Viewport width in px (default: 1920)
  --height <number>          Viewport height in px (default: 1080)
  -h, --help                 Show this help message

Examples:
  npm run build:png
  npm run build:png -- -r flow -t graphite -o architecture.png
  npm run build:png -- -d ./my-diagram.json -s 3 --background transparent
  npm run build:png -- --width 2560 --height 1440 -t sandstone
`);
      process.exit(0);
    }

    if ((arg === "--diagram" || arg === "-d") && next) {
      opts.diagramPath = next;
      i++;
    } else if ((arg === "--output" || arg === "-o") && next) {
      opts.output = next;
      i++;
    } else if ((arg === "--renderer" || arg === "-r") && next) {
      if (!VALID_RENDERERS.includes(next as any)) {
        console.error(`Error: invalid renderer "${next}". Must be one of: ${VALID_RENDERERS.join(", ")}`);
        process.exit(1);
      }
      opts.renderer = next as PngOptions["renderer"];
      i++;
    } else if ((arg === "--theme" || arg === "-t") && next) {
      if (!VALID_THEMES.includes(next as any)) {
        console.error(`Error: invalid theme "${next}". Must be one of: ${VALID_THEMES.join(", ")}`);
        process.exit(1);
      }
      opts.theme = next;
      i++;
    } else if ((arg === "--scale" || arg === "-s") && next) {
      const n = Number(next);
      if (isNaN(n) || n <= 0) {
        console.error(`Error: scale must be a positive number, got "${next}"`);
        process.exit(1);
      }
      opts.scale = n;
      i++;
    } else if ((arg === "--padding" || arg === "-p") && next) {
      const n = Number(next);
      if (isNaN(n) || n < 0) {
        console.error(`Error: padding must be a non-negative number, got "${next}"`);
        process.exit(1);
      }
      opts.padding = n;
      i++;
    } else if (arg === "--background" && next) {
      opts.background = next;
      i++;
    } else if (arg === "--width" && next) {
      const n = Number(next);
      if (isNaN(n) || n <= 0) {
        console.error(`Error: width must be a positive number, got "${next}"`);
        process.exit(1);
      }
      opts.width = n;
      i++;
    } else if (arg === "--height" && next) {
      const n = Number(next);
      if (isNaN(n) || n <= 0) {
        console.error(`Error: height must be a positive number, got "${next}"`);
        process.exit(1);
      }
      opts.height = n;
      i++;
    }
  }

  return opts;
}

// ─── Main ────────────────────────────────────────────────────────────

const SKILL_DIR = path.resolve(import.meta.dirname, "..");
const INLINE_DATA_PATH = path.join(SKILL_DIR, "src", "lib", "inline-data.ts");

const DEFAULT_CONTENT = `// This file is the default (dev/serve mode) version.
// During a static build, scripts/build-static.ts overwrites this file
// with the diagram JSON string, then restores it after the build.
export const INLINE_DIAGRAM_JSON: string | null = null;
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Resolve paths relative to cwd
  const resolvedDiagramPath = path.resolve(opts.diagramPath);
  const resolvedOutput = path.resolve(opts.output);

  // 1. Validate diagram file
  if (!fs.existsSync(resolvedDiagramPath)) {
    console.error(`Error: diagram file not found: ${resolvedDiagramPath}`);
    process.exit(1);
  }

  const diagramJson = fs.readFileSync(resolvedDiagramPath, "utf-8").trim();
  if (!diagramJson) {
    console.error("Error: diagram file is empty");
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(diagramJson);
    if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      console.error("Error: diagram must have at least one node in the 'nodes' array");
      process.exit(1);
    }
  } catch (e) {
    console.error(`Error: diagram file is not valid JSON: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  console.log(`Diagram:    ${resolvedDiagramPath}`);
  console.log(`Output:     ${resolvedOutput}`);
  console.log(`Renderer:   ${opts.renderer}`);
  console.log(`Theme:      ${opts.theme}`);
  console.log(`Scale:      ${opts.scale}x`);
  console.log(`Viewport:   ${opts.width}x${opts.height}`);
  console.log(`Background: ${opts.background}`);
  console.log(`Padding:    ${opts.padding}px`);
  console.log();

  // 2. Build static HTML to a temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "diagram-png-"));

  // Inject diagram JSON into inline-data.ts
  const escapedJson = JSON.stringify(diagramJson);
  const injectedContent = `// AUTO-GENERATED by build-png.ts — do not edit\nexport const INLINE_DIAGRAM_JSON: string | null = ${escapedJson};\n`;
  fs.writeFileSync(INLINE_DATA_PATH, injectedContent);

  try {
    console.log("Building static HTML...");
    const buildResult = spawnSync("npx", ["vite", "build", "--base", "./", "--outDir", tempDir], {
      cwd: SKILL_DIR,
      stdio: "inherit",
      env: { ...process.env, DIAGRAM_STATIC: "1" },
    });

    if (buildResult.status !== 0) {
      console.error("Error: Vite build failed");
      process.exit(buildResult.status ?? 1);
    }
  } finally {
    // Always restore inline-data.ts
    fs.writeFileSync(INLINE_DATA_PATH, DEFAULT_CONTENT);
  }

  // 3. Screenshot with Puppeteer
  console.log("\nRendering diagram...");

  let puppeteer: typeof import("puppeteer");
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.error("Error: puppeteer is not installed. Run: npm install -D puppeteer");
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: opts.scale,
    });

    // Load the static HTML with renderer and theme as URL params
    const htmlPath = path.join(tempDir, "index.html");
    const url = `file://${htmlPath}?renderer=${opts.renderer}&theme=${opts.theme}`;
    await page.goto(url, { waitUntil: "networkidle0" });

    // Wait for diagram content to render
    const contentSelector =
      opts.renderer === "excalidraw"
        ? ".excalidraw canvas"
        : ".react-flow__viewport";

    await page.waitForSelector(contentSelector, { timeout: 15_000 });

    // Wait for all fonts to load (critical for Excalidraw's Virgil/hand-drawn font)
    await page.evaluate(() => document.fonts.ready);

    // Allow settling time for async rendering (zoom-to-fit, layout)
    await new Promise((r) => setTimeout(r, 2000));

    // Ensure output directory exists
    const outputDir = path.dirname(resolvedOutput);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (opts.renderer === "excalidraw") {
      // Use Excalidraw's native exportToBlob API for pixel-perfect text rendering.
      // This avoids font measurement mismatches that cause text clipping in screenshots.
      // Use page.evaluate with a string to avoid tsx __name compilation issues
      const exportScript = `
        (async () => {
          const api = window.__EXCALIDRAW_API__;
          const exportFn = window.__EXCALIDRAW_EXPORT__;
          if (!api) throw new Error("Excalidraw API not available");
          if (!exportFn) throw new Error("Excalidraw export function not available");

          const elements = api.getSceneElements();
          const appState = api.getAppState();
          const files = api.getFiles();

          const blob = await exportFn({
            elements,
            appState: {
              ...appState,
              exportBackground: ${opts.background !== "transparent"},
              viewBackgroundColor: "${opts.background === "transparent" ? "transparent" : opts.background}",
              exportWithDarkMode: false,
            },
            files,
            maxWidthOrHeight: Math.max(${opts.width}, ${opts.height}) * ${opts.scale},
            exportPadding: ${opts.padding},
          });

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })()
      `;
      const dataUrl = await page.evaluate(exportScript) as string;

      // Write the data URL to file
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(resolvedOutput, Buffer.from(base64Data, "base64"));
    } else {
      // ReactFlow: use Puppeteer screenshot approach
      // Inject CSS to hide all UI chrome for a clean screenshot
      await page.addStyleTag({
        content: `
          /* Hide sidebar */
          .app-layout .sidebar { display: none !important; }
          .diagram-panel { width: 100vw !important; margin: 0 !important; }
          .app-layout { grid-template-columns: 0 1fr !important; }

          /* Hide ReactFlow UI chrome and grid background */
          .react-flow__controls { display: none !important; }
          .react-flow__minimap { display: none !important; }
          .react-flow__background { display: none !important; }

          /* Background override */
          ${opts.background === "transparent" ? "" : `
          body { background: ${opts.background} !important; }
          .diagram-panel { background: ${opts.background} !important; }
          .react-flow { background: ${opts.background} !important; }
          `}
        `,
      });

      // Trigger re-fit after layout change
      await page.evaluate(() => {
        window.dispatchEvent(new Event("resize"));
      });
      await new Promise((r) => setTimeout(r, 1000));

      await page.screenshot({
        path: resolvedOutput,
        type: "png",
        omitBackground: opts.background === "transparent",
        clip: {
          x: 0,
          y: 0,
          width: opts.width,
          height: opts.height,
        },
      });
    }

    const stats = fs.statSync(resolvedOutput);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`\nPNG exported: ${resolvedOutput}`);
    if (opts.renderer === "excalidraw") {
      console.log(`File size:    ${sizeKb} KB`);
    } else {
      console.log(`Resolution:   ${opts.width * opts.scale}x${opts.height * opts.scale} pixels`);
      console.log(`File size:    ${sizeKb} KB`);
    }
  } finally {
    await browser.close();
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
