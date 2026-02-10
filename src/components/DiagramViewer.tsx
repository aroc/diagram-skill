import { Excalidraw } from "@excalidraw/excalidraw";
import { useRef, useEffect, useCallback } from "react";
import type { ConvertedElements } from "../lib/mermaid-converter";

interface DiagramViewerProps {
  elements: ConvertedElements;
  files: Record<string, unknown>;
}

export function DiagramViewer({ elements, files }: DiagramViewerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMount = useCallback((api: any) => {
    apiRef.current = api;
  }, []);

  // Update elements in-place when they change, preserving user edits and viewport
  useEffect(() => {
    if (!apiRef.current) return;

    if (!initializedRef.current) {
      // First load: zoom to fit
      initializedRef.current = true;
      requestAnimationFrame(() => {
        const api = apiRef.current;
        if (!api) return;
        const sceneElements = api.getSceneElements();
        if (sceneElements.length > 0) {
          api.scrollToContent(sceneElements, {
            fitToViewport: true,
            viewportZoomFactor: 0.9,
          });
        }
      });
    } else {
      // Subsequent updates: update scene in-place (preserves viewport & user annotations)
      apiRef.current.updateScene({
        elements: [...elements],
      });
      // Re-fit after updating
      requestAnimationFrame(() => {
        const api = apiRef.current;
        if (!api) return;
        api.scrollToContent(api.getSceneElements(), {
          fitToViewport: true,
          viewportZoomFactor: 0.9,
        });
      });
    }
  }, [elements]);

  return (
    <div className="diagram-container">
      <Excalidraw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialData={{ elements: [...elements], files: files as any }}
        excalidrawAPI={handleMount}
        viewModeEnabled={false}
        UIOptions={{
          canvasActions: {
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}
