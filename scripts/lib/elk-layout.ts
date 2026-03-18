import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphDefinition, GroupDef, NodeDef, EdgeDef } from "./graph-types.js";

const elk = new ELK();

// ─── Font sizing constants ───────────────────────────────────────────

const NODE_FONT_SIZE = 20;
const CHAR_WIDTH_FACTOR = 0.48;
const NODE_PAD_X = 36;
const MIN_NODE_W = 120;
const MIN_NODE_H = 48;

const GROUP_LABEL_FONT_SIZE = 22;
const GROUP_LABEL_CHAR_WIDTH_FACTOR = 0.55;
const GROUP_LABEL_PAD_X = 40;
const GROUP_LABEL_HEIGHT = 36;
const GROUP_PAD_TOP = 20;
const GROUP_PAD_SIDE = 48;

export const EDGE_LABEL_FONT_SIZE = 12;
const EDGE_LABEL_CHAR_WIDTH_FACTOR = 0.65;
const EDGE_LABEL_PAD_X = 12;
const EDGE_LABEL_PAD_Y = 8;

export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CHAR_WIDTH_FACTOR;
}

export function edgeLabelSize(text: string): { width: number; height: number } {
  return {
    width: text.length * EDGE_LABEL_FONT_SIZE * EDGE_LABEL_CHAR_WIDTH_FACTOR + EDGE_LABEL_PAD_X,
    height: EDGE_LABEL_FONT_SIZE + EDGE_LABEL_PAD_Y,
  };
}

export function nodeSize(label: string): { width: number; height: number } {
  return {
    width: Math.max(textWidth(label, NODE_FONT_SIZE) + NODE_PAD_X, MIN_NODE_W),
    height: MIN_NODE_H,
  };
}

// ─── Type helpers for the ELK result (minimal) ──────────────────────

export interface ElkPoint {
  x: number;
  y: number;
}

interface ElkSection {
  startPoint: ElkPoint;
  endPoint: ElkPoint;
  bendPoints?: ElkPoint[];
}

interface ElkResultEdge {
  id: string;
  sections?: ElkSection[];
  container?: string;
}

export interface ElkResult {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkResult[];
  edges?: ElkResultEdge[];
}

// ─── Coordinate helpers ──────────────────────────────────────────────

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Walk the ELK tree and collect absolute positions for every node */
export function collectPositions(
  elkNode: ElkResult,
  ox = 0,
  oy = 0,
  out = new Map<string, Box>(),
): Map<string, Box> {
  for (const child of elkNode.children ?? []) {
    const ax = ox + (child.x ?? 0);
    const ay = oy + (child.y ?? 0);
    out.set(child.id, {
      x: ax,
      y: ay,
      width: child.width ?? 0,
      height: child.height ?? 0,
    });
    if (child.children) collectPositions(child, ax, ay, out);
  }
  return out;
}

/** Walk the ELK tree and collect absolute edge route points. */
export function collectEdgeRoutes(
  elkNode: ElkResult,
  positions: Map<string, Box>,
): Map<string, [number, number][]> {
  const out = new Map<string, [number, number][]>();

  function walk(node: ElkResult, nodeOx: number, nodeOy: number) {
    for (const edge of node.edges ?? []) {
      const section = edge.sections?.[0];
      if (!section) continue;

      let ox = nodeOx;
      let oy = nodeOy;
      if (edge.container && edge.container !== node.id) {
        const cPos = positions.get(edge.container);
        if (cPos) {
          ox = cPos.x;
          oy = cPos.y;
        }
      }

      const pts: [number, number][] = [];
      pts.push([ox + section.startPoint.x, oy + section.startPoint.y]);
      for (const bp of section.bendPoints ?? []) {
        pts.push([ox + bp.x, oy + bp.y]);
      }
      pts.push([ox + section.endPoint.x, oy + section.endPoint.y]);
      out.set(edge.id, pts);
    }

    for (const child of node.children ?? []) {
      walk(child, nodeOx + (child.x ?? 0), nodeOy + (child.y ?? 0));
    }
  }

  walk(elkNode, 0, 0);
  return out;
}

// ─── ELK graph construction ──────────────────────────────────────────

function buildElkGraph(
  direction: string,
  groups: GroupDef[],
  nodes: NodeDef[],
  edges: EdgeDef[],
  nodeMap: Map<string, NodeDef>,
  nodeToGroup: Map<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  for (const group of groups) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupChildren: any[] = [];
    for (const childId of group.children) {
      const node = nodeMap.get(childId);
      if (!node) continue;
      const sz = nodeSize(node.label);
      groupChildren.push({ id: childId, width: sz.width, height: sz.height });
    }
    const labelW = group.label.length * GROUP_LABEL_FONT_SIZE * GROUP_LABEL_CHAR_WIDTH_FACTOR + GROUP_LABEL_PAD_X;
    children.push({
      id: group.id,
      children: groupChildren,
      labels: [{ text: group.label, width: labelW, height: GROUP_LABEL_HEIGHT }],
      layoutOptions: {
        "elk.nodeLabels.placement": "H_LEFT V_TOP INSIDE",
        "elk.nodeLabels.padding": "[top=12,left=16,bottom=0,right=0]",
        "elk.padding": `[top=${GROUP_PAD_TOP},left=${GROUP_PAD_SIDE},bottom=${GROUP_PAD_SIDE},right=${GROUP_PAD_SIDE}]`,
      },
    });
  }

  for (const node of nodes) {
    if (!nodeToGroup.has(node.id)) {
      const sz = nodeSize(node.label);
      children.push({ id: node.id, width: sz.width, height: sz.height });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elkEdges: any[] = edges.map((edge, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e: any = {
      id: `edge-${i}`,
      sources: [edge.from],
      targets: [edge.to],
    };
    if (edge.label) {
      const sz = edgeLabelSize(edge.label);
      e.labels = [
        {
          text: edge.label,
          width: sz.width,
          height: sz.height,
        },
      ];
    }
    return e;
  });

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.spacing.nodeNode": "50",
      "elk.spacing.edgeEdge": "40",
      "elk.spacing.edgeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "30",
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children,
    edges: elkEdges,
  };
}

// ─── Public API ──────────────────────────────────────────────────────

export interface LayoutResult {
  positions: Map<string, Box>;
  edgeRoutes: Map<string, [number, number][]>;
  groups: GroupDef[];
  nodes: NodeDef[];
  edges: EdgeDef[];
  direction: string;
}

export async function layoutGraph(source: string): Promise<LayoutResult> {
  let graph: GraphDefinition;
  try {
    graph = JSON.parse(source);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse diagram file as JSON: ${msg}. Check for trailing commas, missing quotes, or other syntax issues.`,
    );
  }

  if (!graph.nodes || graph.nodes.length === 0) {
    throw new Error("Graph must have at least one node");
  }

  // Validate direction
  if (graph.direction !== undefined && graph.direction !== "DOWN" && graph.direction !== "RIGHT") {
    throw new Error(
      `Invalid direction "${graph.direction}". Must be "DOWN" or "RIGHT".`,
    );
  }

  const direction = graph.direction === "RIGHT" ? "RIGHT" : "DOWN";
  const groups = graph.groups ?? [];
  const nodes = graph.nodes;
  const edges = graph.edges ?? [];

  // Validate node shape and check for duplicates
  const nodeMap = new Map<string, NodeDef>();
  for (const node of nodes) {
    if (!node.id || typeof node.id !== "string") {
      throw new Error(`Invalid node: missing or non-string "id". Got: ${JSON.stringify(node)}`);
    }
    if (!node.label || typeof node.label !== "string") {
      throw new Error(`Invalid node "${node.id}": missing or non-string "label".`);
    }
    if (nodeMap.has(node.id)) {
      throw new Error(`Duplicate node ID "${node.id}". Each node must have a unique ID.`);
    }
    nodeMap.set(node.id, node);
  }

  // Validate group/node ID collisions and group children
  for (const group of groups) {
    if (nodeMap.has(group.id)) {
      throw new Error(
        `Group ID "${group.id}" collides with a node ID. Group and node IDs must be unique.`,
      );
    }
    for (const childId of group.children) {
      if (!nodeMap.has(childId)) {
        throw new Error(
          `Group "${group.label}" references unknown node "${childId}". Available nodes: ${[...nodeMap.keys()].join(", ")}`,
        );
      }
    }
  }

  // Validate edge references
  for (const edge of edges) {
    if (!edge.from || typeof edge.from !== "string") {
      throw new Error(`Invalid edge: missing or non-string "from". Got: ${JSON.stringify(edge)}`);
    }
    if (!edge.to || typeof edge.to !== "string") {
      throw new Error(`Invalid edge: missing or non-string "to". Got: ${JSON.stringify(edge)}`);
    }
    if (!nodeMap.has(edge.from)) {
      throw new Error(
        `Edge references unknown node "${edge.from}". Available nodes: ${[...nodeMap.keys()].join(", ")}`,
      );
    }
    if (!nodeMap.has(edge.to)) {
      throw new Error(
        `Edge references unknown node "${edge.to}". Available nodes: ${[...nodeMap.keys()].join(", ")}`,
      );
    }
  }

  const nodeToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const id of g.children) nodeToGroup.set(id, g.id);
  }

  const elkGraph = buildElkGraph(direction, groups, nodes, edges, nodeMap, nodeToGroup);

  let layout: ElkResult;
  try {
    layout = (await elk.layout(elkGraph)) as ElkResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ELK layout failed. This usually means the graph definition has structural issues. Original error: ${msg}`,
    );
  }

  const positions = collectPositions(layout);
  const edgeRoutes = collectEdgeRoutes(layout, positions);

  return { positions, edgeRoutes, groups, nodes, edges, direction };
}
