---
name: flowtown
description: Generate architecture diagrams, sequence diagrams, and ERDs from codebases or through guided conceptual exploration. Renders JSON definitions as crisp PNGs via ELK layout and resvg.
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
  - sequence diagram
  - erd
  - entity relationship
  - database diagram
  - db schema
  - data model
---

# Diagram Generator

You are an expert at analyzing codebases and producing clear architecture diagrams, as well as guiding users through conceptual diagram creation.

**`<skill-dir>`** refers to the directory containing this SKILL.md file. All file paths below are relative to it.

## How This Skill Works

This skill generates PNG diagrams from JSON definitions. Three diagram types are supported:

- **Flow diagrams** — Architecture, data flow, decision trees. Uses ELK.js for automatic layout.
- **Sequence diagrams** — Request/response flows between participants over time. Uses arithmetic layout (no ELK).
- **ERD (Entity-Relationship Diagrams)** — Database schemas with entities, fields, and relationships. Uses ELK.js for layout.

You write a `.json` file, run the build script, and open the resulting PNG. The `type` field in the JSON selects the diagram type (default: `"flow"`).

## Approach

Adapt your approach based on the user's request:

- **Diagramming a codebase** — Analyze the project's top-level architecture before generating. Focus on the 2-3 main layers and key boundaries. Look at entry points, config files, routing, key dependencies, module boundaries, and data flow. Don't enumerate every file.
- **Diagramming a concept** — Ask a few focused questions to understand what the user wants to visualize (components, groupings, relationships, direction of flow). Summarize what the diagram would contain and confirm before generating. Start simple (8-15 nodes) and iterate.
- **When ambiguous** — Ask: "Would you like me to analyze your codebase, or walk through the concept together?"

## Steps

### 1. Write the JSON File

Write a `.json` file to `<skill-dir>/diagram.json`. The `type` field selects the diagram type.

#### Flow Diagrams (default)

```typescript
interface FlowDefinition {
  type?: "flow";                  // default if omitted
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
  shape?: "rect" | "cylinder" | "diamond" | "ellipse" | "hexagon" | "document";
}

interface EdgeDef {
  from: string;
  to: string;
  label?: string;
}
```

**Flow example:**

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

**Flow best practices:**
- Keep labels concise (under ~25 characters)
- Use groups for logical grouping (frontend, backend, storage, etc.)
- Use edge labels to describe what flows between components
- Limit to 10-20 nodes for readability
- Use `"DOWN"` for layered architectures, `"RIGHT"` for pipelines/sequences
- Every node ID should be short but meaningful (e.g., `api`, `db`, `authSvc`)
- All nodes referenced in edges or group children must exist in the `nodes` array
- Group IDs must not collide with node IDs
- Use `shape` to convey node purpose: `"cylinder"` for databases/storage, `"diamond"` for decisions, `"ellipse"` for start/end states, `"hexagon"` for workers/processes, `"document"` for files. Default is `"rect"`

#### Sequence Diagrams

```typescript
interface SequenceDefinition {
  type: "sequence";
  participants: ParticipantDef[];
  messages: MessageDef[];
}

interface ParticipantDef {
  id: string;
  label: string;
}

interface MessageDef {
  from: string;           // participant ID
  to: string;             // participant ID (can equal `from` for self-messages)
  label?: string;
  type?: "solid" | "dashed";  // solid = request (default), dashed = response
}
```

**Sequence example:**

```json
{
  "type": "sequence",
  "participants": [
    { "id": "user", "label": "Browser" },
    { "id": "api", "label": "API Server" },
    { "id": "auth", "label": "Auth Service" },
    { "id": "db", "label": "Database" }
  ],
  "messages": [
    { "from": "user", "to": "api", "label": "POST /login" },
    { "from": "api", "to": "auth", "label": "validate token" },
    { "from": "auth", "to": "db", "label": "SELECT user" },
    { "from": "db", "to": "auth", "label": "user row", "type": "dashed" },
    { "from": "auth", "to": "api", "label": "{ valid: true }", "type": "dashed" },
    { "from": "api", "to": "user", "label": "200 OK + JWT", "type": "dashed" }
  ]
}
```

**Sequence best practices:**
- Use `"solid"` for requests/calls and `"dashed"` for responses/returns
- Order participants left-to-right by their typical call flow (caller on the left)
- Keep message labels short — they sit above the arrow line
- Self-messages (`from === to`) render as a loop and are useful for internal processing steps
- 3-6 participants is ideal; more than 8 gets wide

#### ERD (Entity-Relationship Diagrams)

```typescript
interface ErdDefinition {
  type: "erd";
  entities: EntityDef[];
  relationships: RelationshipDef[];
}

interface EntityDef {
  id: string;
  label: string;
  fields: FieldDef[];
}

interface FieldDef {
  name: string;
  type: string;           // e.g., "INT", "VARCHAR(255)", "TIMESTAMPTZ"
  pk?: boolean;           // primary key indicator
  fk?: boolean;           // foreign key indicator
}

type Cardinality = "1" | "N" | "0..1" | "0..N" | "1..N";

interface RelationshipDef {
  from: string;           // entity ID
  to: string;             // entity ID
  label?: string;         // optional relationship label
  fromCardinality?: Cardinality;
  toCardinality?: Cardinality;
}
```

**ERD example:**

```json
{
  "type": "erd",
  "entities": [
    {
      "id": "users",
      "label": "Users",
      "fields": [
        { "name": "id", "type": "SERIAL", "pk": true },
        { "name": "email", "type": "VARCHAR(255)" },
        { "name": "name", "type": "VARCHAR(100)" },
        { "name": "created_at", "type": "TIMESTAMP" }
      ]
    },
    {
      "id": "orders",
      "label": "Orders",
      "fields": [
        { "name": "id", "type": "SERIAL", "pk": true },
        { "name": "user_id", "type": "INT", "fk": true },
        { "name": "total", "type": "DECIMAL(10,2)" },
        { "name": "status", "type": "VARCHAR(20)" }
      ]
    },
    {
      "id": "items",
      "label": "Order Items",
      "fields": [
        { "name": "id", "type": "SERIAL", "pk": true },
        { "name": "order_id", "type": "INT", "fk": true },
        { "name": "product", "type": "VARCHAR(200)" },
        { "name": "qty", "type": "INT" },
        { "name": "price", "type": "DECIMAL(10,2)" }
      ]
    }
  ],
  "relationships": [
    { "from": "users", "to": "orders", "fromCardinality": "1", "toCardinality": "N" },
    { "from": "orders", "to": "items", "fromCardinality": "1", "toCardinality": "N" }
  ]
}
```

**ERD best practices:**
- Mark primary keys with `"pk": true` and foreign keys with `"fk": true` — they render as colored PK/FK badges
- Use standard SQL type names for clarity (VARCHAR, INT, SERIAL, UUID, etc.)
- Include cardinality (`"1"`, `"N"`, `"0..1"`, `"0..N"`, `"1..N"`) to show relationship multiplicities
- 3-8 entities is ideal for readability
- Each entity must have at least one field
- Relationship `from`/`to` must reference valid entity IDs

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

## Choosing the Right Diagram Type

| Want to show... | Use |
|---|---|
| System architecture, data flow, component relationships | **Flow** (`type: "flow"` or omit) |
| Request/response interactions between services over time | **Sequence** (`type: "sequence"`) |
| Database schema with tables, columns, and foreign keys | **ERD** (`type: "erd"`) |

## Troubleshooting

- **Layout issues**: Check that all IDs referenced in edges/relationships are valid
- **Text clipping**: Keep labels short — long labels may get tight
- **Missing arrows**: Ensure edges reference valid node/entity/participant IDs
- **Empty diagram**: Ensure the `.json` file has at least one node/participant/entity

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
    { "id": "dbA", "label": "DB A", "shape": "cylinder" },
    { "id": "dbB", "label": "DB B", "shape": "cylinder" }
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
    { "id": "req", "label": "Incoming Request", "shape": "ellipse" },
    { "id": "auth", "label": "Authenticated?", "shape": "diamond" },
    { "id": "role", "label": "Check Role", "shape": "diamond" },
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

### API Authentication Sequence
```json
{
  "type": "sequence",
  "participants": [
    { "id": "client", "label": "Mobile App" },
    { "id": "gateway", "label": "API Gateway" },
    { "id": "auth", "label": "Auth Service" },
    { "id": "db", "label": "User DB" }
  ],
  "messages": [
    { "from": "client", "to": "gateway", "label": "POST /login" },
    { "from": "gateway", "to": "auth", "label": "authenticate()" },
    { "from": "auth", "to": "db", "label": "SELECT user" },
    { "from": "db", "to": "auth", "label": "user record", "type": "dashed" },
    { "from": "auth", "to": "auth", "label": "generate JWT" },
    { "from": "auth", "to": "gateway", "label": "token", "type": "dashed" },
    { "from": "gateway", "to": "client", "label": "200 + JWT", "type": "dashed" }
  ]
}
```

### E-Commerce Database Schema
```json
{
  "type": "erd",
  "entities": [
    {
      "id": "customers",
      "label": "Customers",
      "fields": [
        { "name": "id", "type": "UUID", "pk": true },
        { "name": "email", "type": "VARCHAR(255)" },
        { "name": "name", "type": "VARCHAR(200)" }
      ]
    },
    {
      "id": "orders",
      "label": "Orders",
      "fields": [
        { "name": "id", "type": "UUID", "pk": true },
        { "name": "customer_id", "type": "UUID", "fk": true },
        { "name": "total", "type": "DECIMAL(10,2)" },
        { "name": "status", "type": "VARCHAR(20)" }
      ]
    },
    {
      "id": "products",
      "label": "Products",
      "fields": [
        { "name": "id", "type": "UUID", "pk": true },
        { "name": "name", "type": "VARCHAR(200)" },
        { "name": "price", "type": "DECIMAL(10,2)" },
        { "name": "stock", "type": "INT" }
      ]
    },
    {
      "id": "order_items",
      "label": "Order Items",
      "fields": [
        { "name": "id", "type": "UUID", "pk": true },
        { "name": "order_id", "type": "UUID", "fk": true },
        { "name": "product_id", "type": "UUID", "fk": true },
        { "name": "qty", "type": "INT" },
        { "name": "unit_price", "type": "DECIMAL(10,2)" }
      ]
    }
  ],
  "relationships": [
    { "from": "customers", "to": "orders", "fromCardinality": "1", "toCardinality": "N" },
    { "from": "orders", "to": "order_items", "fromCardinality": "1", "toCardinality": "N" },
    { "from": "products", "to": "order_items", "fromCardinality": "1", "toCardinality": "0..N" }
  ]
}
```
