import { VALID_DIAGRAM_TYPES } from "./graph-types.js";
import type { DiagramType } from "./graph-types.js";
import type { DiagramTheme } from "./themes.js";
import { layoutGraph } from "./elk-layout.js";
import { renderFlowSvg } from "./svg-renderer.js";
import { layoutSequence } from "./sequence-layout.js";
import { renderSequenceSvg } from "./sequence-renderer.js";
import { layoutErd } from "./erd-layout.js";
import { renderErdSvg } from "./erd-renderer.js";

/**
 * Single entry point: parses JSON, detects diagram type, dispatches
 * to the appropriate layout+renderer pipeline.
 */
export async function buildSvg(
  source: string,
  theme: DiagramTheme,
  background: string,
): Promise<string> {
  let parsed: { type?: string };
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Failed to parse diagram JSON");
  }

  const type = (parsed.type ?? "flow") as DiagramType;

  if (!VALID_DIAGRAM_TYPES.includes(type)) {
    throw new Error(
      `Unknown diagram type "${type}". Valid types: ${VALID_DIAGRAM_TYPES.join(", ")}`,
    );
  }

  switch (type) {
    case "flow":
      return renderFlowSvg(await layoutGraph(source), theme, background);
    case "sequence":
      return renderSequenceSvg(layoutSequence(source), theme, background);
    case "erd":
      return renderErdSvg(await layoutErd(source), theme, background);
    default:
      throw new Error(`Unknown diagram type "${type}"`);
  }
}
