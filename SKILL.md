---
name: flowtown
description: Generate architecture diagrams from codebases or through guided conceptual exploration. Renders JSON graph definitions as crisp PNGs via ELK layout and resvg.
triggers:
  - flowtown
  - diagram
  - architecture
  - visualize
  - architecture diagram
  - visualize codebase
  - flowchart
  - system diagram
  - draw architecture
  - graph
  - codebase map
  - concept diagram
  - explain visually
  - conceptual diagram
  - brainstorm diagram
  - help me diagram
  - design diagram
---

# Diagram Generator

You are an expert at analyzing codebases and producing clear architecture diagrams, as well as guiding users through conceptual diagram creation.

**`<skill-dir>`** refers to the directory containing this SKILL.md file. All file paths below are relative to it.

## How This Skill Works

This skill generates PNG diagrams from JSON graph definitions. You write a `.json` file describing nodes, edges, and groups, run the build script, and open the resulting PNG. ELK.js handles layout, d3-shape draws edge paths, and resvg-js converts the SVG to a high-DPI PNG.

## Approach

Adapt your approach based on the user's request:

- **Diagramming a codebase** — Analyze the project's top-level architecture before generating. Focus on the 2-3 main layers and key boundaries. Look at entry points, config files, routing, key dependencies, module boundaries, and data flow. Don't enumerate every file.
- **Diagramming a concept** — Ask a few focused questions to understand what the user wants to visualize (components, groupings, relationships, direction of flow). Summarize what the diagram would contain and confirm before generating. Start simple (8-15 nodes) and iterate.
- **When ambiguous** — Ask: "Would you like me to analyze your codebase, or walk through the concept together?"

## Steps

### 1. Write the JSON File

Write a `.json` file to `<skill-dir>/diagram.json` using the `GraphDefinition` schema.

**Schema:**

```typescript
interface GraphDefinition {
  direction?: "DOWN" | "RIGHT";  // default: "DOWN"
  groups?: GroupDef[];
  nodes: NodeDef[];
  edges?: EdgeDef[];
}

interface GroupDef {
  id: string;
  label: string;
  children: string[];  // node IDs belonging to this group
}

interface NodeDef {
  id: string;
  label: string;
}

interface EdgeDef {
  from: string;
  to: string;
  label?: string;
}
```

**Example:**

```json
{
  "direction": "DOWN",
  "groups": [
    { "id": "backend", "label": "Backend Services", "children": ["api", "auth", "handler"] },
    { "id": "storage", "label": "Storage Layer", "children": ["db", "cache"] }
  ],
  "nodes": [
    { "id": "app", "label": "Frontend App" },
    { "id": "api", "label": "API Gateway" },
    { "id": "auth", "label": "Auth Check" },
    { "id": "handler", "label": "Handler" },
    { "id": "db", "label": "Database" },
    { "id": "cache", "label": "Redis Cache" },
    { "id": "queue", "label": "Message Queue" }
  ],
  "edges": [
    { "from": "app", "to": "api" },
    { "from": "api", "to": "auth" },
    { "from": "auth", "to": "handler", "label": "authorized" },
    { "from": "handler", "to": "db" },
    { "from": "handler", "to": "cache", "label": "optional" },
    { "from": "handler", "to": "queue", "label": "critical" }
  ]
}
```

**Best Practices:**

- Keep labels concise (under ~25 characters)
- Use groups for logical grouping (frontend, backend, storage, etc.)
- Use edge labels to describe what flows between components
- Limit to 10-20 nodes for readability
- Use `"DOWN"` for layered architectures, `"RIGHT"` for pipelines/sequences
- Every node ID should be short but meaningful (e.g., `api`, `db`, `authSvc`)
- All nodes referenced in edges or group children must exist in the `nodes` array
- Group IDs must not collide with node IDs

### 2. Choose a Theme

Three themes are available. Pick the best fit for the diagram's purpose, or let the user specify with `-t`.

| Theme | Look | Best for |
|---|---|---|
| **slate** | Clean blue nodes, grey lines | Technical docs, architecture reviews |
| **sandstone** | Warm earth tones, cream/gold | Presentations, reports |
| **figjam** | Bright sticky-note colors, playful | Workshops, collaborative sessions |

Default is **slate** if not specified.

### 3. Build the PNG

```bash
cd <skill-dir> && npm install && npm run build:png -- -d <diagram-path> -o <output-path> -t <theme>
```

**Options:**

| Option | Default | Description |
|---|---|---|
| `-d, --diagram` | `diagram.json` | Path to `.json` diagram file |
| `-o, --output` | `diagram.png` | Output PNG path |
| `-t, --theme` | `slate` | `sandstone`, `slate`, or `figjam` |
| `-s, --scale` | `3` | DPI multiplier (higher = more pixels) |
| `--background` | `white` | Background color or `transparent` |

### 4. Open the PNG

```bash
open <output-path>
```

Tell the user: "Your diagram has been generated. I've opened it for you."

### 5. Iterate

To update the diagram, modify the `.json` file and re-run:

```bash
cd <skill-dir> && npm run build:png -- -d <diagram-path> -o <output-path> -t <theme>
open <output-path>
```

If the user asks for changes, update the `.json` file accordingly. Ask what the user wants to change rather than starting over.

## Troubleshooting

- **Layout issues**: Check that all node IDs referenced in edges and group children exist in the `nodes` array
- **Text clipping**: Keep labels short — ELK auto-sizes nodes but very long labels may get tight
- **Missing arrows**: Ensure edges reference valid node IDs with `from` and `to`
- **Empty diagram**: Ensure the `.json` file has at least one node

## Common Patterns

### Layered Architecture
```json
{
  "direction": "DOWN",
  "groups": [
    { "id": "client", "label": "Client Layer", "children": ["ui", "state"] },
    { "id": "api", "label": "API Layer", "children": ["router", "auth", "handlers"] },
    { "id": "data", "label": "Data Layer", "children": ["db", "cache"] }
  ],
  "nodes": [
    { "id": "ui", "label": "React App" },
    { "id": "state", "label": "State Mgmt" },
    { "id": "router", "label": "API Router" },
    { "id": "auth", "label": "Auth Middleware" },
    { "id": "handlers", "label": "Handlers" },
    { "id": "db", "label": "Database" },
    { "id": "cache", "label": "Cache" }
  ],
  "edges": [
    { "from": "ui", "to": "state" },
    { "from": "state", "to": "router" },
    { "from": "router", "to": "auth" },
    { "from": "auth", "to": "handlers" },
    { "from": "handlers", "to": "db" },
    { "from": "handlers", "to": "cache" }
  ]
}
```

### Microservices
```json
{
  "direction": "RIGHT",
  "nodes": [
    { "id": "gw", "label": "API Gateway" },
    { "id": "svcA", "label": "Service A" },
    { "id": "svcB", "label": "Service B" },
    { "id": "queue", "label": "Message Queue" },
    { "id": "dbA", "label": "DB A" },
    { "id": "dbB", "label": "DB B" }
  ],
  "edges": [
    { "from": "gw", "to": "svcA" },
    { "from": "gw", "to": "svcB" },
    { "from": "svcA", "to": "queue", "label": "publish" },
    { "from": "queue", "to": "svcB", "label": "consume" },
    { "from": "svcA", "to": "dbA" },
    { "from": "svcB", "to": "dbB" }
  ]
}
```

### Decision Flow
```json
{
  "direction": "DOWN",
  "nodes": [
    { "id": "req", "label": "Incoming Request" },
    { "id": "auth", "label": "Authenticated?" },
    { "id": "role", "label": "Check Role" },
    { "id": "allow", "label": "Allow Access" },
    { "id": "deny", "label": "Deny 403" },
    { "id": "login", "label": "Redirect to Login" }
  ],
  "edges": [
    { "from": "req", "to": "auth" },
    { "from": "auth", "to": "role", "label": "yes" },
    { "from": "auth", "to": "login", "label": "no" },
    { "from": "role", "to": "allow", "label": "admin" },
    { "from": "role", "to": "deny", "label": "guest" }
  ]
}
```
