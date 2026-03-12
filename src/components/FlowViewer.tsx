import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function LabeledGroupNode({ data }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 14,
          fontSize: 20,
          fontWeight: 700,
          color: (data as { labelColor?: string }).labelColor ?? "#495057",
          pointerEvents: "none",
        }}
      >
        {(data as { label?: string }).label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

function DescribedNode({ data }: NodeProps) {
  const { label, description, descriptionColor } = data as { label?: string; description?: string; descriptionColor?: string };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "8px 12px",
        boxSizing: "border-box",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
      {description && (
        <div
          style={{
            fontSize: 11,
            color: descriptionColor ?? "#666",
            marginTop: 4,
            lineHeight: 1.3,
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          {description}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { labeledGroup: LabeledGroupNode, describedNode: DescribedNode };

interface FlowViewerProps {
  nodes: Node[];
  edges: Edge[];
  miniMapColor?: string;
}

export function FlowViewer({ nodes, edges, miniMapColor }: FlowViewerProps) {
  const stableNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <div className="diagram-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={stableNodeTypes}
        fitView
        minZoom={0.1}
        defaultEdgeOptions={{ type: "smoothstep" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap
          zoomable
          pannable
          nodeColor={(node: Node) => {
            const c = (node.data as Record<string, unknown>)?.color;
            return typeof c === "string" ? c : (miniMapColor ?? "#e2e8f0");
          }}
          style={{ width: 180, height: 120 }}
        />
      </ReactFlow>
    </div>
  );
}
