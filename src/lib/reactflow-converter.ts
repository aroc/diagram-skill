import type { Node, Edge } from "@xyflow/react";
import { layoutGraph, type Box } from "./elk-layout";
import type { DiagramTheme } from "./themes";
import { getTheme, DEFAULT_THEME_ID } from "./themes";

export interface FlowResult {
  nodes: Node[];
  edges: Edge[];
}

export async function convertGraphToFlow(source: string, theme: DiagramTheme = getTheme(DEFAULT_THEME_ID)): Promise<FlowResult> {
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
      data: { label: group.label, color: theme.groupColors[idx % theme.groupColors.length], labelColor: theme.group.labelColor },
      measured: { width: pos.width, height: pos.height },
      style: {
        width: pos.width,
        height: pos.height,
        backgroundColor: theme.groupColors[idx % theme.groupColors.length],
        borderRadius: theme.group.borderRadius,
        border: `${theme.group.strokeWidth}px solid ${theme.group.strokeColor}`,
        opacity: theme.group.opacity,
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
      data: { label: node.label, description: node.description, color: theme.node.bgColor, descriptionColor: theme.edge.labelColor },
      ...(groupId ? { parentId: groupId } : {}),
      measured: { width: pos.width, height: pos.height },
      style: {
        width: pos.width,
        height: pos.height,
        backgroundColor: theme.node.bgColor,
        border: `${theme.node.strokeWidth}px solid ${theme.node.strokeColor}`,
        borderRadius: theme.node.borderRadius,
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
          labelStyle: { fontSize: 13, fontWeight: 500, fill: theme.edge.labelColor },
          labelBgStyle: { fill: theme.edge.labelBgColor, fillOpacity: 1 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 4,
          zIndex: 1,
        }
      : {}),
    style: { stroke: theme.edge.strokeColor, strokeWidth: theme.edge.strokeWidth },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}
