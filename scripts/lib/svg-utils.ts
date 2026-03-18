/** Shared SVG utility functions used by all diagram renderers. */

export const PADDING = 40;

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

/** Open an SVG element with standard attributes. */
export function svgOpen(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
}

/** Render a background rect (skipped for transparent). */
export function svgBackground(width: number, height: number, background: string): string {
  if (background === "transparent") return "";
  return `<rect width="${width}" height="${height}" fill="${background}" />`;
}

/** Standard arrowhead marker definition. */
export function svgArrowMarker(id: string, size: number, color: string): string {
  return `<marker id="${id}" markerWidth="${size}" markerHeight="${size}" refX="${size}" refY="${size / 2}" orient="auto" markerUnits="userSpaceOnUse">
    <polygon points="0 0, ${size} ${size / 2}, 0 ${size}" fill="${color}" />
  </marker>`;
}
