# Flowtown

A Claude Code skill that generates architecture diagrams from JSON graph definitions. Describe a system or point it at a codebase, and it produces a crisp PNG — laid out by ELK.js and rendered at 3x DPI via resvg.

## Features

### Two Workflows

**Code Analysis** — Analyzes your project's architecture (entry points, module boundaries, data flow, key dependencies) and generates a diagram from the codebase structure.

**Socratic / Conceptual** — Guides you through a conversation to build a diagram from scratch. Useful for brainstorming system designs, explaining ideas, or mapping out concepts that aren't tied to code.

### Three Themes

| Theme | Look | Best for |
|---|---|---|
| **Slate** | Clean blue nodes, grey lines | Technical docs, architecture reviews |
| **Sandstone** | Warm earth tones, cream/gold | Presentations, reports |
| **FigJam** | Bright sticky-note colors, playful | Workshops, collaborative sessions |

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

Claude will choose the appropriate workflow, write a `.json` file, build the PNG, and iterate with you.

### Build PNG

```bash
npm run build:png -- -d diagram.json -o diagram.png -t slate
npm run build:png -- -d diagram.json -o diagram.png -t sandstone
npm run build:png -- -d diagram.json -o diagram.png -t figjam
```

| Option | Default | Description |
|---|---|---|
| `-d, --diagram` | `diagram.json` | Path to `.json` diagram file |
| `-o, --output` | `diagram.png` | Output PNG path |
| `-t, --theme` | `slate` | `sandstone`, `slate`, or `figjam` |
| `-s, --scale` | `3` | DPI multiplier (higher = more pixels) |
| `--background` | `white` | Background color or `transparent` |

## JSON Schema

Diagrams use a simple JSON format with nodes, edges, and optional groups:

```json
{
  "direction": "DOWN",
  "groups": [
    { "id": "backend", "label": "Backend", "children": ["api", "db"] }
  ],
  "nodes": [
    { "id": "app", "label": "Frontend" },
    { "id": "api", "label": "API Server" },
    { "id": "db", "label": "Database" }
  ],
  "edges": [
    { "from": "app", "to": "api" },
    { "from": "api", "to": "db" }
  ]
}
```

## Tech Stack

- **ELK.js** — Layered graph layout (orthogonal edge routing)
- **d3-shape** — Edge path generation
- **resvg-js** — SVG to PNG conversion (Rust-based, fast)
- **TypeScript** + **tsx** — Script runtime

## License

Apache 2.0
