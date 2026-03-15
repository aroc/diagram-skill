import { layoutGraph, type Box } from "./elk-layout";
import type { DiagramTheme } from "./themes";

export interface D3Node {
  id: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  groupId?: string;
}

export interface D3Group {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
}

export interface D3Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
  points: [number, number][];
}

export interface D3Data {
  groups: D3Group[];
  nodes: D3Node[];
  edges: D3Edge[];
  direction: string;
  viewBox: { x: number; y: number; width: number; height: number };
}

export async function convertGraphToD3(
  source: string,
  _theme?: DiagramTheme,
): Promise<D3Data> {
  const { positions, edgeRoutes, groups, nodes, edges, direction } =
    await layoutGraph(source);

  const nodeToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const id of g.children) nodeToGroup.set(id, g.id);
  }

  const d3Groups: D3Group[] = groups
    .map((group, idx) => {
      const pos = positions.get(group.id);
      if (!pos) return null;
      return {
        id: group.id,
        label: group.label,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        colorIndex: idx,
      };
    })
    .filter((g): g is D3Group => g !== null);

  const d3Nodes: D3Node[] = [];
  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const d3Node: D3Node = {
      id: node.id,
      label: node.label,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    };
    if (node.description) d3Node.description = node.description;
    const groupId = nodeToGroup.get(node.id);
    if (groupId) d3Node.groupId = groupId;
    d3Nodes.push(d3Node);
  }

  const d3Edges: D3Edge[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const id = `edge-${i}`;
    const pts = edgeRoutes.get(id);
    if (!pts) continue;
    const d3Edge: D3Edge = { id, from: edge.from, to: edge.to, points: pts };
    if (edge.label) d3Edge.label = edge.label;
    d3Edges.push(d3Edge);
  }

  // Compute viewBox from all positioned elements
  const allBoxes: Box[] = [];
  for (const pos of positions.values()) allBoxes.push(pos);

  const padding = 40;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const box of allBoxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  const viewBox = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };

  return { groups: d3Groups, nodes: d3Nodes, edges: d3Edges, direction, viewBox };
}
