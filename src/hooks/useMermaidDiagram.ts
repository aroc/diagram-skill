import { useState, useEffect, useCallback, useRef } from "react";
import { convertMermaid, type ConvertedElements } from "../lib/mermaid-converter";

interface DiagramState {
  elements: ConvertedElements | null;
  files: Record<string, unknown> | null;
  error: string | null;
  loading: boolean;
  mermaidSource: string | null;
  revision: number;
}

export function useMermaidDiagram() {
  const revisionRef = useRef(0);
  const fetchIdRef = useRef(0);
  const [state, setState] = useState<DiagramState>({
    elements: null,
    files: null,
    error: null,
    loading: true,
    mermaidSource: null,
    revision: 0,
  });

  const fetchAndConvert = useCallback(async () => {
    const thisId = ++fetchIdRef.current;

    try {
      const res = await fetch("/api/diagram");

      // Stale response — a newer fetch was started
      if (thisId !== fetchIdRef.current) return;

      if (res.status === 404) {
        setState((prev) => ({
          ...prev,
          elements: null,
          files: null,
          error: null,
          loading: false,
          mermaidSource: null,
        }));
        return;
      }

      const source = await res.text();
      if (thisId !== fetchIdRef.current) return;

      try {
        const { elements, files } = await convertMermaid(source);
        if (thisId !== fetchIdRef.current) return;

        revisionRef.current += 1;
        setState({
          elements,
          files,
          error: null,
          loading: false,
          mermaidSource: source,
          revision: revisionRef.current,
        });
      } catch (parseError) {
        if (thisId !== fetchIdRef.current) return;
        setState((prev) => ({
          ...prev,
          elements: null,
          files: null,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          loading: false,
          mermaidSource: source,
        }));
      }
    } catch (fetchError) {
      if (thisId !== fetchIdRef.current) return;
      setState((prev) => ({
        ...prev,
        elements: null,
        files: null,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : String(fetchError),
        loading: false,
        mermaidSource: null,
      }));
    }
  }, []);

  useEffect(() => {
    fetchAndConvert();
  }, [fetchAndConvert]);

  // Listen for HMR updates from Vite plugin
  useEffect(() => {
    if (import.meta.hot) {
      const handler = () => {
        fetchAndConvert();
      };
      import.meta.hot.on("diagram:update", handler);
      return () => {
        import.meta.hot!.off("diagram:update", handler);
      };
    }
  }, [fetchAndConvert]);

  return state;
}
