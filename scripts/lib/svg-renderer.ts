import { line as d3Line } from "d3-shape";
import { edgeLabelSize } from "./elk-layout.js";
import type { LayoutResult, Box } from "./elk-layout.js";
import type { DiagramTheme } from "./themes.js";

const PADDING = 40;

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Compute the midpoint of a polyline by walking its segments. */
export function polylineMidpoint(pts: [number, number][]): [number, number] {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    totalLen += len;
  }

  let half = totalLen / 2;
  for (let i = 0; i < segLens.length; i++) {
    if (half <= segLens[i]) {
      const t = segLens[i] === 0 ? 0 : half / segLens[i];
      return [
        pts[i][0] + t * (pts[i + 1][0] - pts[i][0]),
        pts[i][1] + t * (pts[i + 1][1] - pts[i][1]),
      ];
    }
    half -= segLens[i];
  }

  return pts[pts.length - 1];
}

export function renderSvg(layout: LayoutResult, theme: DiagramTheme, background: string): string {
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

  // SVG open
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
  );

  // Defs: arrowhead marker
  parts.push(`<defs>
  <marker id="arrowhead" markerWidth="${theme.edge.arrowSize}" markerHeight="${theme.edge.arrowSize}" refX="${theme.edge.arrowSize}" refY="${theme.edge.arrowSize / 2}" orient="auto" markerUnits="userSpaceOnUse">
    <polygon points="0 0, ${theme.edge.arrowSize} ${theme.edge.arrowSize / 2}, 0 ${theme.edge.arrowSize}" fill="${theme.edge.strokeColor}" />
  </marker>
</defs>`);

  // Background
  if (background !== "transparent") {
    parts.push(`<rect width="${svgW}" height="${svgH}" fill="${background}" />`);
  }

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
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${r}" ry="${r}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="${theme.node.strokeWidth}" />`,
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
