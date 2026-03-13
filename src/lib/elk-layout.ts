import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphDefinition, GroupDef, NodeDef, EdgeDef } from "./graph-types";

const elk = new ELK();

// ─── Font sizing constants ───────────────────────────────────────────

const NODE_FONT_SIZE = 20;
const CHAR_WIDTH_FACTOR = 0.6;
const NODE_PAD_X = 36;
const MIN_NODE_W = 100;
const MIN_NODE_H = 40;
const DESC_FONT_SIZE = 13;
const DESC_LINE_HEIGHT = 18;
const DESC_MAX_CHARS_PER_LINE = 35;
const DESC_PAD_BOTTOM = 12;

const GROUP_LABEL_FONT_SIZE = 22;
const GROUP_LABEL_HEIGHT = 36;
const GROUP_PAD_TOP = 16;
const GROUP_PAD_SIDE = 24;

export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * CHAR_WIDTH_FACTOR;
}

export function nodeSize(label: string, description?: string): { width: number; height: number } {
  let width = Math.max(textWidth(label, NODE_FONT_SIZE) + NODE_PAD_X, MIN_NODE_W);
  let height = MIN_NODE_H;

  if (description) {
    const descLines = Math.ceil(description.length / DESC_MAX_CHARS_PER_LINE);
    const descWidth = Math.min(description.length, DESC_MAX_CHARS_PER_LINE) * DESC_FONT_SIZE * 0.65 + NODE_PAD_X;
    width = Math.max(width, descWidth);
    height += descLines * DESC_LINE_HEIGHT + DESC_PAD_BOTTOM;
  }

  return { width, height };
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
      const sz = nodeSize(node.label, node.description);
      groupChildren.push({ id: childId, width: sz.width, height: sz.height });
    }
    const labelW = group.label.length * GROUP_LABEL_FONT_SIZE * 0.55 + 40;
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
      const sz = nodeSize(node.label, node.description);
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
      e.labels = [
        {
          text: edge.label,
          width: textWidth(edge.label, 14) + 16,
          height: 22,
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
      "elk.spacing.nodeNode": "30",
      "elk.spacing.edgeEdge": "25",
      "elk.spacing.edgeNode": "25",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "20",
      "elk.layered.spacing.edgeNodeBetweenLayers": "25",
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
  const graph: GraphDefinition = JSON.parse(source);

  if (!graph.nodes || graph.nodes.length === 0) {
    throw new Error("Graph must have at least one node");
  }

  const direction = graph.direction === "RIGHT" ? "RIGHT" : "DOWN";
  const groups = graph.groups ?? [];
  const nodes = graph.nodes;
  const edges = graph.edges ?? [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const nodeToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const id of g.children) nodeToGroup.set(id, g.id);
  }

  const elkGraph = buildElkGraph(direction, groups, nodes, edges, nodeMap, nodeToGroup);
  const layout: ElkResult = (await elk.layout(elkGraph)) as ElkResult;

  const positions = collectPositions(layout);
  const edgeRoutes = collectEdgeRoutes(layout, positions);

  return { positions, edgeRoutes, groups, nodes, edges, direction };
}
