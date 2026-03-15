import type { RendererType } from "../hooks/useDiagram";

interface RendererToggleProps {
  renderer: RendererType;
  onRendererChange: (r: RendererType) => void;
}

export function RendererToggle({ renderer, onRendererChange }: RendererToggleProps) {
  return (
    <div className="renderer-toggle">
      <button
        className={`toggle-btn ${renderer === "flow" ? "active" : ""}`}
        onClick={() => onRendererChange("flow")}
      >
        React Flow
      </button>
      <button
        className={`toggle-btn ${renderer === "excalidraw" ? "active" : ""}`}
        onClick={() => onRendererChange("excalidraw")}
      >
        Excalidraw
      </button>
      <button
        className={`toggle-btn ${renderer === "d3" ? "active" : ""}`}
        onClick={() => onRendererChange("d3")}
      >
        D3
      </button>
    </div>
  );
}
