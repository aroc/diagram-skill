import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { layoutGraph, type Box } from "./elk-layout";
import type { GroupDef, NodeDef, EdgeDef } from "./graph-types";

export type ConvertedElements = ReturnType<typeof convertToExcalidrawElements>;

// Pastel background colors for group containers
const GROUP_COLORS = [
  "#dbeafe", // blue
  "#dcfce7", // green
  "#ede9fe", // purple
  "#ffedd5", // orange
  "#fce7f3", // pink
  "#cffafe", // cyan
  "#fef9c3", // yellow
  "#fee2e2", // red
];

const NODE_FONT_SIZE = 20;
const GROUP_LABEL_FONT_SIZE = 22;

// ─── Excalidraw skeleton generation ──────────────────────────────────

function buildSkeletons(
  groups: GroupDef[],
  nodes: NodeDef[],
  edges: EdgeDef[],
  positions: Map<string, Box>,
  routes: Map<string, [number, number][]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];

  // 1. Group containers (first = rendered behind everything)
  groups.forEach((group, idx) => {
    const pos = positions.get(group.id);
    if (!pos) return;
    out.push({
      type: "rectangle",
      id: group.id,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      backgroundColor: GROUP_COLORS[idx % GROUP_COLORS.length],
      fillStyle: "solid",
      opacity: 60,
      strokeColor: "#868e96",
      strokeWidth: 1,
      roundness: { type: 3 },
      label: {
        text: group.label,
        fontSize: GROUP_LABEL_FONT_SIZE,
        verticalAlign: "top",
        textAlign: "left",
      },
    });
  });

  // 2. Node rectangles
  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const labelText = node.description
      ? `${node.label}\n${node.description}`
      : node.label;
    out.push({
      type: "rectangle",
      id: node.id,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      backgroundColor: "#ffffff",
      fillStyle: "solid",
      strokeColor: "#1e1e1e",
      strokeWidth: 2,
      roundness: { type: 3 },
      label: {
        text: labelText,
        fontSize: node.description ? 16 : NODE_FONT_SIZE,
      },
    });
  }

  // 3. Edge arrows
  edges.forEach((edge, i) => {
    const edgeId = `edge-${i}`;
    const pts = routes.get(edgeId);
    if (!pts || pts.length < 2) return;

    const [sx, sy] = pts[0];
    const relPts: [number, number][] = pts.map(([x, y]) => [x - sx, y - sy]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skeleton: any = {
      type: "arrow",
      id: edgeId,
      x: sx,
      y: sy,
      points: relPts,
      strokeColor: "#495057",
      strokeWidth: 2,
      roundness: null, // sharp orthogonal corners
      start: { id: edge.from },
      end: { id: edge.to },
    };

    if (edge.label) {
      skeleton.label = { text: edge.label, fontSize: 14 };
    }

    out.push(skeleton);
  });

  return out;
}

// ─── Public API ──────────────────────────────────────────────────────

export async function convertGraph(
  source: string,
): Promise<{ elements: ConvertedElements; files: Record<string, never> }> {
  const { positions, edgeRoutes, groups, nodes, edges } =
    await layoutGraph(source);

  const skeletons = buildSkeletons(groups, nodes, edges, positions, edgeRoutes);
  const elements = convertToExcalidrawElements(skeletons);

  return { elements, files: {} as Record<string, never> };
}
