export interface GraphDefinition {
  /** Layout direction: "DOWN" (top-to-bottom) or "RIGHT" (left-to-right) */
  direction?: "DOWN" | "RIGHT";
  /** Groups of related nodes (rendered as colored containers) */
  groups?: GroupDef[];
  /** Individual nodes in the diagram */
  nodes: NodeDef[];
  /** Connections between nodes */
  edges: EdgeDef[];
}

export interface GroupDef {
  id: string;
  label: string;
  /** IDs of nodes that belong to this group */
  children: string[];
}

export interface NodeDef {
  id: string;
  label: string;
  description?: string;
}

export interface EdgeDef {
  from: string;
  to: string;
  label?: string;
}
