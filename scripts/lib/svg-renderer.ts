import { line as d3Line } from "d3-shape";
import { edgeLabelSize, CYLINDER_CAP_HEIGHT, HEXAGON_INSET, DOCUMENT_WAVE_HEIGHT } from "./elk-layout.js";
import type { LayoutResult, Box } from "./elk-layout.js";
import type { NodeShape } from "./graph-types.js";
import type { DiagramTheme } from "./themes.js";
import { PADDING, escapeXml, polylineMidpoint, svgOpen, svgBackground, svgArrowMarker } from "./svg-utils.js";

// Re-export for backward compat with tests
export { escapeXml, polylineMidpoint };

// ─── Shape renderers ────────────────────────────────────────────────

function renderRectShape(box: Box, r: number, fill: string, stroke: string, strokeWidth: number): string {
  return `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function renderCylinderShape(box: Box, fill: string, stroke: string, strokeWidth: number): string {
  const { x, y, width: w, height: h } = box;
  const cap = CYLINDER_CAP_HEIGHT;
  const parts: string[] = [];
  // Body rect
  parts.push(`<rect x="${x}" y="${y + cap}" width="${w}" height="${h - cap * 2}" fill="${fill}" stroke="none" />`);
  // Left and right edges
  parts.push(`<line x1="${x}" y1="${y + cap}" x2="${x}" y2="${y + h - cap}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
  parts.push(`<line x1="${x + w}" y1="${y + cap}" x2="${x + w}" y2="${y + h - cap}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
  // Top ellipse (full)
  parts.push(`<ellipse cx="${x + w / 2}" cy="${y + cap}" rx="${w / 2}" ry="${cap}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
  // Bottom ellipse (lower half only, via clip path)
  const clipId = `cyl-clip-${x}-${y}`;
  parts.push(`<clipPath id="${clipId}"><rect x="${x}" y="${y + h - cap}" width="${w}" height="${cap}" /></clipPath>`);
  parts.push(`<ellipse cx="${x + w / 2}" cy="${y + h - cap}" rx="${w / 2}" ry="${cap}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" clip-path="url(#${clipId})" />`);
  return parts.join("\n");
}

function renderDiamondShape(box: Box, fill: string, stroke: string, strokeWidth: number): string {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const hw = box.width / 2;
  const hh = box.height / 2;
  const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function renderEllipseShape(box: Box, fill: string, stroke: string, strokeWidth: number): string {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${box.width / 2}" ry="${box.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function renderHexagonShape(box: Box, fill: string, stroke: string, strokeWidth: number): string {
  const { x, y, width: w, height: h } = box;
  const inset = HEXAGON_INSET;
  const points = `${x + inset},${y} ${x + w - inset},${y} ${x + w},${y + h / 2} ${x + w - inset},${y + h} ${x + inset},${y + h} ${x},${y + h / 2}`;
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function renderDocumentShape(box: Box, fill: string, stroke: string, strokeWidth: number): string {
  const { x, y, width: w, height: h } = box;
  const wave = DOCUMENT_WAVE_HEIGHT;
  const bodyH = h - wave;
  const d = `M${x},${y} L${x + w},${y} L${x + w},${y + bodyH} C${x + w * 0.75},${y + bodyH + wave * 2} ${x + w * 0.25},${y + bodyH - wave} ${x},${y + bodyH + wave / 2} Z`;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function renderNodeShape(
  shape: NodeShape | undefined,
  box: Box,
  borderRadius: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
): string {
  switch (shape) {
    case "cylinder":
      return renderCylinderShape(box, fill, stroke, strokeWidth);
    case "diamond":
      return renderDiamondShape(box, fill, stroke, strokeWidth);
    case "ellipse":
      return renderEllipseShape(box, fill, stroke, strokeWidth);
    case "hexagon":
      return renderHexagonShape(box, fill, stroke, strokeWidth);
    case "document":
      return renderDocumentShape(box, fill, stroke, strokeWidth);
    default:
      return renderRectShape(box, borderRadius, fill, stroke, strokeWidth);
  }
}

export function renderFlowSvg(layout: LayoutResult, theme: DiagramTheme, background: string): string {
  const { positions, edgeRoutes, groups, nodes, edges } = layout;

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const box of positions.values()) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  for (const pts of edgeRoutes.values()) {
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  // Include edge label extents in bounding box
  for (let ei = 0; ei < edges.length; ei++) {
    const edge = edges[ei];
    if (!edge.label) continue;
    const pts = edgeRoutes.get(`edge-${ei}`);
    if (!pts || pts.length < 2) continue;
    const [mx, my] = polylineMidpoint(pts);
    const { width: labelW, height: labelH } = edgeLabelSize(edge.label);
    minX = Math.min(minX, mx - labelW / 2);
    maxX = Math.max(maxX, mx + labelW / 2);
    minY = Math.min(minY, my - labelH / 2);
    maxY = Math.max(maxY, my + labelH / 2);
  }

  if (minX === Infinity) {
    throw new Error("No positioned elements found — diagram would be empty.");
  }

  const svgW = maxX - minX + PADDING * 2;
  const svgH = maxY - minY + PADDING * 2;
  const ox = -minX + PADDING;
  const oy = -minY + PADDING;

  const lineFn = d3Line();

  const parts: string[] = [];

  parts.push(svgOpen(svgW, svgH));

  // Defs: arrowhead marker
  parts.push(`<defs>
  ${svgArrowMarker("arrowhead", theme.edge.arrowSize, theme.edge.strokeColor)}
</defs>`);

  // Background
  const bg = svgBackground(svgW, svgH, background);
  if (bg) parts.push(bg);

  // Open transform group
  parts.push(`<g transform="translate(${ox},${oy})">`);

  // ── Groups ──
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const box = positions.get(group.id);
    if (!box) continue;

    const fillColor = theme.groupColors[gi % theme.groupColors.length];
    const r = theme.group.borderRadius;

    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${r}" ry="${r}" fill="${fillColor}" stroke="${theme.group.strokeColor}" stroke-width="${theme.group.strokeWidth}" opacity="${theme.group.opacity}" />`,
    );

    // Group label (top-left inside)
    parts.push(
      `<text x="${box.x + 16}" y="${box.y + 24}" font-family="Arial, Helvetica, sans-serif" font-size="${theme.group.labelFontSize}" font-weight="600" fill="${theme.group.labelColor}">${escapeXml(group.label)}</text>`,
    );
  }

  // ── Edges ──
  for (let ei = 0; ei < edges.length; ei++) {
    const edgeId = `edge-${ei}`;
    const pts = edgeRoutes.get(edgeId);
    if (!pts || pts.length < 2) continue;

    const pathD = lineFn(pts);
    if (!pathD) continue;

    parts.push(
      `<path d="${pathD}" fill="none" stroke="${theme.edge.strokeColor}" stroke-width="${theme.edge.strokeWidth}" marker-end="url(#arrowhead)" />`,
    );

    // Edge label
    const edge = edges[ei];
    if (edge.label) {
      const [mx, my] = polylineMidpoint(pts);
      const { width: labelW, height: labelH } = edgeLabelSize(edge.label);

      parts.push(
        `<rect x="${mx - labelW / 2}" y="${my - labelH / 2}" width="${labelW}" height="${labelH}" rx="4" ry="4" fill="${theme.edge.labelBgColor}" />`,
      );
      parts.push(
        `<text x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${theme.edge.labelFontSize}" fill="${theme.edge.labelColor}">${escapeXml(edge.label)}</text>`,
      );
    }
  }

  // ── Nodes ──
  let nodeColorIndex = 0;
  for (const node of nodes) {
    const box = positions.get(node.id);
    if (!box) continue;

    let bgColor = theme.node.bgColor;
    let strokeColor = theme.node.strokeColor;

    if (theme.nodeColors) {
      const colors = theme.nodeColors[nodeColorIndex % theme.nodeColors.length];
      bgColor = colors.bg;
      strokeColor = colors.stroke;
      nodeColorIndex++;
    }

    const r = theme.node.borderRadius;

    parts.push(
      renderNodeShape(node.shape, box, r, bgColor, strokeColor, theme.node.strokeWidth),
    );

    // Centered label
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    parts.push(
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${theme.node.labelFontSize}" fill="${theme.node.labelColor}">${escapeXml(node.label)}</text>`,
    );
  }

  // Close transform group and SVG
  parts.push(`</g>`);
  parts.push(`</svg>`);

  return parts.join("\n");
}

/** @deprecated Use renderFlowSvg instead */
export const renderSvg = renderFlowSvg;
