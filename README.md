# Flowtown

A Claude Code skill that generates interactive architecture diagrams. Describe a system or point it at a codebase, and it produces a draggable, editable Excalidraw diagram — automatically laid out with [ELK.js](https://eclipse.dev/elk/).

## Features

### Two Workflows

**Code Analysis** — Analyzes your project's architecture (entry points, module boundaries, data flow, key dependencies) and generates a diagram from the codebase structure.

**Socratic / Conceptual** — Guides you through a conversation to build a diagram from scratch. Useful for brainstorming system designs, explaining ideas, or mapping out concepts that aren't tied to code.

### Interactive Diagrams

- Drag nodes to rearrange the layout
- Edit labels directly on the canvas
- Export to PNG or SVG via the Excalidraw menu
- Zoom, pan, and scroll freely
- Automatic hierarchical layout via ELK.js (top-to-bottom or left-to-right)

### Dual Renderers

- **Excalidraw** (default) — Hand-drawn aesthetic, fully interactive canvas with drag-and-drop
- **React Flow** — Smooth curved connections, minimap, and grid background

Switch between them from the sidebar or with the `?renderer=flow` URL parameter.

### Theming

Three built-in themes, selectable from the sidebar:

| Theme | Style |
|---|---|
| **Blueprint** | Clean, modern. Warm/cool alternating group colors, medium corner radius. |
| **Graphite** | Technical, precise. Cool grays, thin strokes, sharp corners — like an engineering drawing. |
| **Sandstone** | Organic, warm. Earth tones (sage, clay, sand, moss), generous corner radius. |

### Live Reload

The viewer watches `diagram.json` for changes and hot-reloads the diagram automatically. Your viewport position and manual edits are preserved across updates — just save the file and the diagram updates in-place.

### History & Snapshots

Save named snapshots of your diagram from the sidebar. Browse, download, or delete saved diagrams at any time.

### PNG Export

Generate a high-resolution PNG image of your diagram using Puppeteer:

```bash
npm run build:png
```

By default this reads `diagram.json` and writes `diagram.png`. You can customize the output:

```bash
npm run build:png -- -o architecture.png          # Custom output path
npm run build:png -- -r flow -t graphite          # ReactFlow renderer, Graphite theme
npm run build:png -- -d ./my-diagram.json -s 3    # Different diagram, 3x scale
npm run build:png -- --background transparent     # Transparent background
npm run build:png -- --width 2560 --height 1440   # Custom viewport size
```

| Option | Default | Description |
|---|---|---|
| `-d, --diagram` | `diagram.json` | Path to diagram JSON |
| `-o, --output` | `diagram.png` | Output PNG path |
| `-r, --renderer` | `excalidraw` | `excalidraw` or `flow` |
| `-t, --theme` | `blueprint` | `blueprint`, `graphite`, or `sandstone` |
| `-s, --scale` | `2` | Device scale factor (higher = more pixels) |
| `-p, --padding` | `40` | Padding in pixels around the diagram |
| `--background` | `white` | CSS color or `transparent` |
| `--width` | `1920` | Viewport width in pixels |
| `--height` | `1080` | Viewport height in pixels |

The Excalidraw renderer uses Excalidraw's native export API for pixel-perfect text rendering.

### Static Export

Generate a self-contained HTML file you can open in any browser without a server:

```bash
npm run build:static -- --output ./my-diagram
```

The output folder contains `index.html` with all JS/CSS inlined and the diagram data embedded. Fully interactive — no dev server needed.

## Installation

```bash
npm install
```

## Usage

### As a Claude Code Skill

Trigger the skill with phrases like:
- "diagram my codebase"
- "visualize the architecture"
- "help me diagram a system"
- "concept diagram"

Claude will choose the appropriate workflow, generate a `diagram.json`, start the viewer, and iterate with you.

### Standalone

```bash
npm run dev
```

Opens the viewer at [http://localhost:5174](http://localhost:5174). Create or edit `diagram.json` in the project root and the diagram renders automatically.

## Diagram Format

Diagrams are defined as JSON with nodes, edges, and optional groups:

```json
{
  "direction": "DOWN",
  "groups": [
    {
      "id": "frontend",
      "label": "Frontend",
      "children": ["ui", "state"]
    }
  ],
  "nodes": [
    { "id": "ui", "label": "React App" },
    { "id": "state", "label": "State Management" },
    { "id": "api", "label": "API Server", "description": "Handles all HTTP requests" }
  ],
  "edges": [
    { "from": "ui", "to": "state", "label": "user actions" },
    { "from": "state", "to": "api", "label": "API calls" }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `direction` | No | `"DOWN"` (default, top-to-bottom) or `"RIGHT"` (left-to-right) |
| `groups` | No | Colored containers that visually cluster related nodes |
| `nodes` | Yes | All nodes in the diagram (at least one) |
| `nodes[].description` | No | Optional subtitle text displayed below the node label |
| `edges` | No | Connections between nodes, with optional labels |

### Tips

- Use `"DOWN"` for layered architectures, `"RIGHT"` for pipelines and sequences
- Keep diagrams to 15-25 nodes for readability
- Every node ID referenced in `edges` or `groups.children` must exist in `nodes`
- A node can belong to at most one group
- Keep node labels under ~25 characters to avoid overlapping

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with live reload on port 5174 |
| `npm run build` | TypeScript check + production Vite build |
| `npm run build:png` | Export a PNG image using Puppeteer |
| `npm run build:static` | Export a self-contained HTML bundle |

### Static Export Options

```bash
npm run build:static -- --output <dir>    # Target folder (default: dist)
npm run build:static -- --diagram <file>  # Path to diagram JSON (default: diagram.json)
```

## Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Excalidraw** — Primary interactive diagram canvas
- **React Flow** — Alternative graph renderer
- **ELK.js** — Automatic hierarchical graph layout
- **Puppeteer** — Headless Chrome for PNG export
- **Vite** — Dev server and build tool

## License

Apache 2.0
