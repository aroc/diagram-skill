---
name: flowtown
description: Generate interactive architecture diagrams from codebases. Analyzes code and produces draggable Excalidraw diagrams with hierarchical layout via ELK.js and live reload.
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
---

# Architecture Diagram Generator

You are an expert at analyzing codebases and producing clear, interactive architecture diagrams.

**`<skill-dir>`** refers to the directory containing this SKILL.md file. All file paths below are relative to it.

## How This Skill Works

This skill uses a Vite dev server with Excalidraw to render architecture diagrams as interactive, draggable elements. You write a simple JSON graph definition to a file and the viewer auto-layouts it with ELK.js (Eclipse Layout Kernel) and renders it in Excalidraw with live reload.

All elements are fully interactive — nodes can be dragged, labels edited, and diagrams exported to PNG/SVG.

## Steps

### 1. Analyze the Codebase

Before generating a diagram, analyze the project's top-level architecture. Focus on the 2-3 main architectural layers and key boundaries — don't enumerate every file.

Look for:
- **Entry points**: `package.json` scripts, `main`/`module` fields, `index.ts`/`index.js`
- **Configuration**: `vite.config.ts`, `next.config.js`, `tsconfig.json`, `webpack.config.js`
- **Routing**: file-based routes, router definitions, API endpoints
- **Key dependencies**: frameworks, databases, messaging, external services
- **Module boundaries**: `src/` subdirectories, packages in monorepos, import patterns
- **Data flow**: API calls, state management, event systems

### 2. Generate the Graph JSON

Write a JSON graph definition to `<skill-dir>/diagram.json`.

The file does not need to exist before starting the viewer — the viewer will show a "Waiting for diagram..." state until the file appears, then auto-render it.

**JSON Schema:**

```json
{
  "direction": "DOWN",
  "groups": [
    {
      "id": "group-id",
      "label": "Group Display Name",
      "children": ["node-id-1", "node-id-2"]
    }
  ],
  "nodes": [
    { "id": "node-id-1", "label": "Node Display Name" },
    { "id": "node-id-2", "label": "Another Node" }
  ],
  "edges": [
    { "from": "node-id-1", "to": "node-id-2", "label": "optional edge label" }
  ]
}
```

**Fields:**

- `direction` (optional): `"DOWN"` (top-to-bottom, default) or `"RIGHT"` (left-to-right)
- `groups` (optional): Colored containers that visually group related nodes. Each group lists the `children` node IDs it contains.
- `nodes` (required): All nodes in the diagram. Must have at least one.
- `edges` (optional): Connections between nodes. `label` is optional.

**Template:**

```json
{
  "direction": "DOWN",
  "groups": [
    {
      "id": "client",
      "label": "Client Layer",
      "children": ["ui", "state"]
    },
    {
      "id": "api",
      "label": "API Layer",
      "children": ["router", "auth", "handlers"]
    },
    {
      "id": "data",
      "label": "Data Layer",
      "children": ["db", "cache"]
    }
  ],
  "nodes": [
    { "id": "ui", "label": "React App" },
    { "id": "state", "label": "State Management" },
    { "id": "router", "label": "API Router" },
    { "id": "auth", "label": "Auth Middleware" },
    { "id": "handlers", "label": "Request Handlers" },
    { "id": "db", "label": "Database" },
    { "id": "cache", "label": "Cache" }
  ],
  "edges": [
    { "from": "ui", "to": "state", "label": "user actions" },
    { "from": "state", "to": "router", "label": "API calls" },
    { "from": "router", "to": "auth" },
    { "from": "auth", "to": "handlers" },
    { "from": "handlers", "to": "db", "label": "queries" },
    { "from": "handlers", "to": "cache", "label": "read/write" }
  ]
}
```

**Best Practices:**

- Use `"DOWN"` for layered architectures, `"RIGHT"` for pipelines/sequences
- Use groups to visually cluster related components (frontend, backend, storage, etc.)
- Use descriptive edge labels to show what flows between components
- Keep node IDs short but meaningful (lowercase, no spaces)
- Limit to 15-25 nodes for readability — focus on key components, not every file
- Every node referenced in `groups.children` or `edges` must exist in `nodes`
- A node can belong to at most one group. Nodes not in any group are placed standalone.

### 3a. Start the Viewer (interactive server)

```bash
cd <skill-dir>
npm install && npm run dev
```

This opens a browser at `http://localhost:5174` with the interactive Excalidraw diagram. The port is fixed at 5174 — if it's already in use from a previous session, find and kill that process first (`lsof -ti:5174 | xargs kill`).

Tell the user: "The architecture diagram is now open at http://localhost:5174. You can drag nodes, edit labels, and export to PNG (via the hamburger menu in the top-left)."

### 3b. Export as Static HTML (optional)

If the user asks to save the diagram locally, export it to a folder, or wants a static version they can open without a server:

````bash
cd <skill-dir>
npm install && npm run build:static -- --output /path/to/target-folder
````

**Options:**
- `--output <dir>` or `-o <dir>`: Target folder for the static build (default: `dist`). Relative paths resolve from the current working directory.
- `--diagram <file>` or `-d <file>`: Path to the diagram JSON file (default: `diagram.json` in the skill directory).

This produces a self-contained folder with `index.html` + bundled JS/CSS. The diagram is fully interactive — drag nodes, edit labels, export to PNG/SVG via the Excalidraw menu. No server needed; open `index.html` directly in a browser.

Tell the user: "The diagram has been exported to `/path/to/target-folder/`. Open `index.html` in a browser to view the interactive diagram."

**Note:** Static export and the dev server are independent. Use `npm run dev` to iterate with live reload, then `npm run build:static` to snapshot the result.

### 4. Iterate

To update the diagram, overwrite `<skill-dir>/diagram.json` with new content. The viewer live-reloads automatically — no need to restart the server or refresh the browser. User annotations and viewport position are preserved across updates.

If the user asks for changes (e.g., "add the database layer", "show the auth flow"), update the JSON file accordingly.

### 5. Cleanup

When the user is done with the diagram, stop the Vite dev server (Ctrl+C in the terminal where it's running, or `lsof -ti:5174 | xargs kill`).

### 6. Troubleshooting

If the diagram fails to render, the viewer displays the parse error along with the raw JSON source for debugging. Common fixes:

- **Parse error**: Ensure the file is valid JSON (no trailing commas, proper quoting)
- **Blank diagram**: Ensure `diagram.json` has at least one node in the `nodes` array
- **Missing nodes**: Every node ID in `edges.from`, `edges.to`, and `groups.children` must have a matching entry in `nodes`
- **Overlapping labels**: Keep node labels concise (under ~25 characters)

The viewer auto-reloads on every save — fix the JSON and it will retry automatically.

### 7. Common Architecture Patterns

**Microservices:**
```json
{
  "direction": "LR",
  "groups": [
    { "id": "services", "label": "Services", "children": ["svc_a", "svc_b"] },
    { "id": "infra", "label": "Infrastructure", "children": ["queue", "db_a", "db_b"] }
  ],
  "nodes": [
    { "id": "gateway", "label": "API Gateway" },
    { "id": "svc_a", "label": "Service A" },
    { "id": "svc_b", "label": "Service B" },
    { "id": "queue", "label": "Message Queue" },
    { "id": "db_a", "label": "DB A" },
    { "id": "db_b", "label": "DB B" }
  ],
  "edges": [
    { "from": "gateway", "to": "svc_a" },
    { "from": "gateway", "to": "svc_b" },
    { "from": "svc_a", "to": "queue", "label": "publish" },
    { "from": "queue", "to": "svc_b", "label": "consume" },
    { "from": "svc_a", "to": "db_a" },
    { "from": "svc_b", "to": "db_b" }
  ]
}
```

**Event-Driven:**
```json
{
  "direction": "DOWN",
  "nodes": [
    { "id": "producer", "label": "Event Producer" },
    { "id": "bus", "label": "Event Bus" },
    { "id": "consumer_a", "label": "Consumer A" },
    { "id": "consumer_b", "label": "Consumer B" },
    { "id": "store", "label": "Event Store" }
  ],
  "edges": [
    { "from": "producer", "to": "bus", "label": "publish" },
    { "from": "bus", "to": "consumer_a", "label": "subscribe" },
    { "from": "bus", "to": "consumer_b", "label": "subscribe" },
    { "from": "consumer_a", "to": "store" }
  ]
}
```

**Layered / MVC:**
```json
{
  "direction": "DOWN",
  "nodes": [
    { "id": "view", "label": "Views / Templates" },
    { "id": "controller", "label": "Controllers" },
    { "id": "service", "label": "Service Layer" },
    { "id": "repo", "label": "Repository Layer" },
    { "id": "db", "label": "Database" }
  ],
  "edges": [
    { "from": "view", "to": "controller" },
    { "from": "controller", "to": "service" },
    { "from": "service", "to": "repo" },
    { "from": "repo", "to": "db" }
  ]
}
```
