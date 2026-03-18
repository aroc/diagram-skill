import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { buildSvg } from "./lib/diagram.js";
import { getTheme, THEME_NAMES } from "./lib/themes.js";

// ─── Types ───────────────────────────────────────────────────────────

interface PngOptions {
  diagramPath: string;
  output: string;
  theme: string;
  scale: number;
  background: string;
}

// ─── CLI argument parsing ────────────────────────────────────────────

function parseArgs(args: string[]): PngOptions {
  const opts: PngOptions = {
    diagramPath: "diagram.json",
    output: "diagram.png",
    theme: "slate",
    scale: 3,
    background: "white",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: npm run build:png -- [options]

Options:
  -d, --diagram <file>       Path to .json diagram file (default: "diagram.json")
  -o, --output <file>        Output PNG path (default: "diagram.png")
  -t, --theme <name>         Theme: ${THEME_NAMES.join(", ")} (default: "slate")
  -s, --scale <number>       DPI multiplier (default: 3)
  --background <color>       Background color or "transparent" (default: "white")
  -h, --help                 Show this help message

Examples:
  npm run build:png
  npm run build:png -- -d architecture.json -o architecture.png -t sandstone
  npm run build:png -- -t figjam -s 4
  npm run build:png -- --background transparent
`);
      process.exit(0);
    }

    if (arg === "--diagram" || arg === "-d") {
      if (!next || next.startsWith("-")) {
        console.error(`Error: ${arg} requires a file path`);
        process.exit(1);
      }
      opts.diagramPath = next;
      i++;
    } else if (arg === "--output" || arg === "-o") {
      if (!next || next.startsWith("-")) {
        console.error(`Error: ${arg} requires a file path`);
        process.exit(1);
      }
      opts.output = next;
      i++;
    } else if (arg === "--theme" || arg === "-t") {
      if (!next || next.startsWith("-")) {
        console.error(`Error: ${arg} requires a theme name. Must be one of: ${THEME_NAMES.join(", ")}`);
        process.exit(1);
      }
      if (!THEME_NAMES.includes(next)) {
        console.error(`Error: invalid theme "${next}". Must be one of: ${THEME_NAMES.join(", ")}`);
        process.exit(1);
      }
      opts.theme = next;
      i++;
    } else if (arg === "--scale" || arg === "-s") {
      if (!next || next.startsWith("-")) {
        console.error(`Error: ${arg} requires a number`);
        process.exit(1);
      }
      const n = Number(next);
      if (isNaN(n) || n <= 0) {
        console.error(`Error: scale must be a positive number, got "${next}"`);
        process.exit(1);
      }
      opts.scale = n;
      i++;
    } else if (arg === "--background") {
      if (!next) {
        console.error(`Error: --background requires a color value`);
        process.exit(1);
      }
      opts.background = next;
      i++;
    } else if (arg.startsWith("-")) {
      console.error(`Error: unrecognized option "${arg}". Run with --help for usage.`);
      process.exit(1);
    }
  }

  return opts;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const resolvedDiagramPath = path.resolve(opts.diagramPath);
  const resolvedOutput = path.resolve(opts.output);

  if (!fs.existsSync(resolvedDiagramPath)) {
    console.error(`Error: diagram file not found: ${resolvedDiagramPath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(resolvedDiagramPath, "utf-8").trim();
  if (!source) {
    console.error("Error: diagram file is empty");
    process.exit(1);
  }

  console.log(`Diagram:    ${resolvedDiagramPath}`);
  console.log(`Output:     ${resolvedOutput}`);
  console.log(`Theme:      ${opts.theme}`);
  console.log(`Scale:      ${opts.scale}x`);
  console.log(`Background: ${opts.background}`);
  console.log();

  // Layout + render SVG
  console.log("Computing layout...");
  const theme = getTheme(opts.theme);
  const svg = await buildSvg(source, theme, opts.background);

  // Convert to PNG
  console.log("Rendering PNG...");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: opts.scale },
    font: {
      loadSystemFonts: true,
    },
    ...(opts.background === "transparent" ? { background: "rgba(0, 0, 0, 0)" } : {}),
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Ensure output directory exists
  const outputDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutput, pngBuffer);

  const sizeKb = (pngBuffer.length / 1024).toFixed(1);
  console.log(`\nPNG exported: ${resolvedOutput}`);
  console.log(`File size:    ${sizeKb} KB`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
