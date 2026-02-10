import { useMermaidDiagram } from "./hooks/useMermaidDiagram";
import { DiagramViewer } from "./components/DiagramViewer";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { LoadingDisplay } from "./components/LoadingDisplay";

export default function App() {
  const { elements, files, error, loading, mermaidSource } =
    useMermaidDiagram();

  if (loading) {
    return <LoadingDisplay hasDiagram={false} />;
  }

  if (error) {
    return <ErrorDisplay error={error} mermaidSource={mermaidSource} />;
  }

  if (!elements || !files) {
    return <LoadingDisplay hasDiagram={false} />;
  }

  return <DiagramViewer elements={elements} files={files} />;
}
