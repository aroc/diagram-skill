import { useState, useCallback } from "react";
import { useDiagram, type RendererType } from "./hooks/useDiagram";
import { DiagramViewer } from "./components/DiagramViewer";
import { FlowViewer } from "./components/FlowViewer";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { LoadingDisplay } from "./components/LoadingDisplay";
import { HistorySidebar } from "./components/HistorySidebar";
import { INLINE_DIAGRAM_JSON } from "./lib/inline-data";

function getInitialRenderer(): RendererType {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("renderer");
  return r === "excalidraw" ? "excalidraw" : "flow";
}

export default function App() {
  const [renderer, setRenderer] = useState<RendererType>(getInitialRenderer);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
  const [sourceOverride, setSourceOverride] = useState<string | null>(null);
  const isStaticMode = INLINE_DIAGRAM_JSON != null;

  const { data, error, loading, diagramSource } = useDiagram(renderer, sourceOverride);

  const handleLoad = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(id)}/download`);
      if (res.ok) {
        const source = await res.text();
        setActiveDiagramId(id);
        setSourceOverride(source);
      }
    } catch {
      // ignore fetch errors
    }
  }, []);

  const handleLoadLive = useCallback(() => {
    setActiveDiagramId(null);
    setSourceOverride(null);
  }, []);

  const renderDiagram = () => {
    if (loading) {
      return <LoadingDisplay hasDiagram={false} />;
    }

    if (error) {
      return <ErrorDisplay error={error} diagramSource={diagramSource} />;
    }

    if (!data) {
      return <LoadingDisplay hasDiagram={false} />;
    }

    if (data.renderer === "flow") {
      return <FlowViewer nodes={data.nodes} edges={data.edges} />;
    }

    return <DiagramViewer elements={data.elements} files={data.files} />;
  };

  return (
    <div className={isStaticMode ? "app-layout app-layout--static" : "app-layout"}>
      {!isStaticMode && (
        <HistorySidebar
          activeId={activeDiagramId}
          onLoad={handleLoad}
          onLoadLive={handleLoadLive}
          renderer={renderer}
          onRendererChange={setRenderer}
        />
      )}
      <div className="diagram-panel">
        {renderDiagram()}
      </div>
    </div>
  );
}
