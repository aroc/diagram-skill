export interface GraphDefinition {
  /** Layout direction: "DOWN" (top-to-bottom) or "RIGHT" (left-to-right) */
  direction?: "DOWN" | "RIGHT";
  /** Groups of related nodes (rendered as colored containers) */
  groups?: GroupDef[];
  /** Individual nodes in the diagram */
  nodes: NodeDef[];
  /** Connections between nodes */
  edges?: EdgeDef[];
}

export interface GroupDef {
  id: string;
  label: string;
  /** IDs of nodes that belong to this group */
  children: string[];
}

export const VALID_NODE_SHAPES = ["rect", "cylinder", "diamond", "ellipse", "hexagon", "document"] as const;
export type NodeShape = (typeof VALID_NODE_SHAPES)[number];

export interface NodeDef {
  id: string;
  label: string;
  shape?: NodeShape;
}

export interface EdgeDef {
  from: string;
  to: string;
  label?: string;
}
