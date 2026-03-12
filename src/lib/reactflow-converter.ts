import type { Node, Edge } from "@xyflow/react";
import { layoutGraph, type Box } from "./elk-layout";

// Pastel background colors for group containers (same as Excalidraw adapter)
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

export interface FlowResult {
  nodes: Node[];
  edges: Edge[];
}

export async function convertGraphToFlow(source: string): Promise<FlowResult> {
  const { positions, groups, nodes, edges } = await layoutGraph(source);

  const nodeToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const id of g.children) nodeToGroup.set(id, g.id);
  }

  const flowNodes: Node[] = [];

  // 1. Group nodes
  groups.forEach((group, idx) => {
    const pos = positions.get(group.id);
    if (!pos) return;
    flowNodes.push({
      id: group.id,
      type: "labeledGroup",
      position: { x: pos.x, y: pos.y },
      data: { label: group.label, color: GROUP_COLORS[idx % GROUP_COLORS.length] },
      measured: { width: pos.width, height: pos.height },
      style: {
        width: pos.width,
        height: pos.height,
        backgroundColor: GROUP_COLORS[idx % GROUP_COLORS.length],
        borderRadius: 8,
        border: "1px solid #868e96",
        opacity: 0.9,
        padding: 8,
        fontSize: 14,
        fontWeight: 600,
      },
    });
  });

  // 2. Child and standalone nodes
  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const groupId = nodeToGroup.get(node.id);
    let position: { x: number; y: number };

    if (groupId) {
      // Relative position within parent group
      const groupPos = positions.get(groupId) as Box;
      position = { x: pos.x - groupPos.x, y: pos.y - groupPos.y };
    } else {
      position = { x: pos.x, y: pos.y };
    }

    flowNodes.push({
      id: node.id,
      position,
      ...(node.description ? { type: "describedNode" } : {}),
      data: { label: node.label, description: node.description, color: "#ffffff" },
      ...(groupId ? { parentId: groupId } : {}),
      measured: { width: pos.width, height: pos.height },
      style: {
        width: pos.width,
        height: pos.height,
        backgroundColor: "#ffffff",
        border: "2px solid #1e1e1e",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 500,
      },
    });
  }

  // 3. Edges — React Flow handles routing via smoothstep
  const flowEdges: Edge[] = edges.map((edge, i) => ({
    id: `edge-${i}`,
    source: edge.from,
    target: edge.to,
    type: "smoothstep",
    animated: false,
    ...(edge.label
      ? {
          label: edge.label,
          labelStyle: { fontSize: 13, fontWeight: 500, fill: "#333" },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 1 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 4,
          zIndex: 1,
        }
      : {}),
    style: { stroke: "#495057", strokeWidth: 2 },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}
