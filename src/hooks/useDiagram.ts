import { useState, useEffect, useCallback, useRef } from "react";
import { convertGraph, type ConvertedElements } from "../lib/elk-converter";
import { convertGraphToFlow, type FlowResult } from "../lib/reactflow-converter";
import type { DiagramTheme } from "../lib/themes";
import { INLINE_DIAGRAM_JSON } from "../lib/inline-data";

export type RendererType = "excalidraw" | "flow";

interface ExcalidrawData {
  renderer: "excalidraw";
  elements: ConvertedElements;
  files: Record<string, unknown>;
}

interface FlowData {
  renderer: "flow";
  nodes: FlowResult["nodes"];
  edges: FlowResult["edges"];
}

type DiagramData = ExcalidrawData | FlowData;

interface DiagramState {
  data: DiagramData | null;
  error: string | null;
  loading: boolean;
  diagramSource: string | null;
  revision: number;
}

export function useDiagram(renderer: RendererType, sourceOverride?: string | null, theme?: DiagramTheme) {
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const lastSourceRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const fetchIdRef = useRef(0);
  const [state, setState] = useState<DiagramState>({
    data: null,
    error: null,
    loading: true,
    diagramSource: null,
    revision: 0,
  });

  const convertSource = useCallback(
    async (source: string, id: number) => {
      lastSourceRef.current = source;
      try {
        let data: DiagramData;
        if (renderer === "flow") {
          const { nodes, edges } = await convertGraphToFlow(source, themeRef.current);
          data = { renderer: "flow", nodes, edges };
        } else {
          const { elements, files } = await convertGraph(source, themeRef.current);
          data = { renderer: "excalidraw", elements, files };
        }

        if (id !== fetchIdRef.current) return;

        revisionRef.current += 1;
        setState({
          data,
          error: null,
          loading: false,
          diagramSource: source,
          revision: revisionRef.current,
        });
      } catch (parseError) {
        if (id !== fetchIdRef.current) return;
        setState((prev) => ({
          ...prev,
          data: null,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          loading: false,
          diagramSource: source,
        }));
      }
    },
    [renderer],
  );

  const fetchAndConvert = useCallback(async () => {
    const thisId = ++fetchIdRef.current;

    try {
      const res = await fetch("/api/diagram");

      if (thisId !== fetchIdRef.current) return;

      if (res.status === 404) {
        setState((prev) => ({
          ...prev,
          data: null,
          error: null,
          loading: false,
          diagramSource: null,
        }));
        return;
      }

      const source = await res.text();
      if (thisId !== fetchIdRef.current) return;

      await convertSource(source, thisId);
    } catch (fetchError) {
      if (thisId !== fetchIdRef.current) return;
      setState((prev) => ({
        ...prev,
        data: null,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : String(fetchError),
        loading: false,
        diagramSource: null,
      }));
    }
  }, [convertSource]);

  // When sourceOverride changes, convert it directly instead of fetching
  useEffect(() => {
    if (sourceOverride != null) {
      const thisId = ++fetchIdRef.current;
      setState((prev) => ({ ...prev, loading: true }));
      convertSource(sourceOverride, thisId);
    }
  }, [sourceOverride, convertSource]);

  // Fetch from server when no override and not in static mode
  useEffect(() => {
    if (sourceOverride != null) return;
    if (INLINE_DIAGRAM_JSON != null) {
      // Static mode: use inlined data directly
      const thisId = ++fetchIdRef.current;
      convertSource(INLINE_DIAGRAM_JSON, thisId);
      return;
    }
    fetchAndConvert();
  }, [sourceOverride, convertSource, fetchAndConvert]);

  // Listen for HMR updates from Vite plugin (only when live, not static)
  useEffect(() => {
    if (sourceOverride != null) return;
    if (INLINE_DIAGRAM_JSON != null) return; // static mode — no HMR
    if (import.meta.hot) {
      const handler = () => {
        fetchAndConvert();
      };
      import.meta.hot.on("diagram:update", handler);
      return () => {
        import.meta.hot!.off("diagram:update", handler);
      };
    }
  }, [sourceOverride, fetchAndConvert]);

  useEffect(() => {
    const src = lastSourceRef.current;
    if (src) {
      const id = ++fetchIdRef.current;
      convertSource(src, id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return state;
}
