import { useState, useCallback } from "react";
import { useDiagram, type RendererType } from "./hooks/useDiagram";
import { useTheme } from "./hooks/useTheme";
import { DiagramViewer } from "./components/DiagramViewer";
import { FlowViewer } from "./components/FlowViewer";
import { D3Viewer } from "./components/D3Viewer";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { LoadingDisplay } from "./components/LoadingDisplay";
import { HistorySidebar } from "./components/HistorySidebar";
import { INLINE_DIAGRAM_JSON } from "./lib/inline-data";

function getInitialRenderer(): RendererType {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("renderer");
  if (r === "excalidraw") return "excalidraw";
  if (r === "d3") return "d3";
  return "flow";
}

export default function App() {
  const [renderer, setRenderer] = useState<RendererType>(getInitialRenderer);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(null);
  const [sourceOverride, setSourceOverride] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { themeId, theme, setThemeId } = useTheme();
  const isStaticMode = INLINE_DIAGRAM_JSON != null;

  const { data, error, loading, diagramSource } = useDiagram(renderer, sourceOverride, theme);

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

    if (data.renderer === "d3") {
      return <D3Viewer data={data.data} theme={theme} />;
    }

    if (data.renderer === "flow") {
      return <FlowViewer nodes={data.nodes} edges={data.edges} miniMapColor={theme.miniMapColor} />;
    }

    return <DiagramViewer elements={data.elements} files={data.files} />;
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <HistorySidebar
        activeId={activeDiagramId}
        onLoad={handleLoad}
        onLoadLive={handleLoadLive}
        renderer={renderer}
        onRendererChange={setRenderer}
        themeId={themeId}
        onThemeChange={setThemeId}
        isStatic={isStaticMode}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="diagram-panel">
        {renderDiagram()}
      </div>
    </div>
  );
}
