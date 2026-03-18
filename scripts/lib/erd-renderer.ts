import type { ErdLayout } from "./erd-layout.js";
import {
  ENTITY_HEADER_HEIGHT,
  FIELD_ROW_HEIGHT,
  ENTITY_PAD_X,
  ENTITY_FONT_SIZE,
  FIELD_FONT_SIZE,
  PK_FK_PREFIX_W,
} from "./erd-layout.js";
import type { DiagramTheme } from "./themes.js";
import { PADDING, escapeXml, polylineMidpoint, svgOpen, svgBackground } from "./svg-utils.js";
import type { Box } from "./elk-layout.js";

// ─── Color helpers ──────────────────────────────────────────────────

/** Lighten a hex color toward white by a given factor (0=no change, 1=white). */
function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export function renderErdSvg(
  layout: ErdLayout,
  theme: DiagramTheme,
  background: string,
): string {
  const { entities, relationships, positions, edgeRoutes } = layout;

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

  if (minX === Infinity) {
    throw new Error("No positioned elements found — ERD would be empty.");
  }

  const svgW = maxX - minX + PADDING * 2;
  const svgH = maxY - minY + PADDING * 2;
  const ox = -minX + PADDING;
  const oy = -minY + PADDING;

  // Default body/row fills (overridden per-entity when nodeColors is set)
  const defaultBodyFill = lighten(theme.node.bgColor, 0.7);
  const defaultAltRowFill = lighten(theme.node.bgColor, 0.5);

  const parts: string[] = [];

  parts.push(svgOpen(svgW, svgH));

  // Defs: clip paths for entity headers (rounded top corners only)
  parts.push(`<defs>`);
  for (const entity of entities) {
    const box = positions.get(entity.id);
    if (!box) continue;
    const r = theme.node.borderRadius;
    parts.push(
      `<clipPath id="header-clip-${entity.id}"><rect x="${box.x + ox}" y="${box.y + oy}" width="${box.width}" height="${ENTITY_HEADER_HEIGHT}" rx="${r}" ry="${r}" /></clipPath>`,
    );
  }
  parts.push(`</defs>`);

  // Background
  const bg = svgBackground(svgW, svgH, background);
  if (bg) parts.push(bg);

  // Open transform group — we use absolute coords with ox/oy offsets baked in
  // Actually, let's use a transform group like the flow renderer
  parts.push(`<g transform="translate(${ox},${oy})">`);

  // ── Relationship edges ──
  for (let ri = 0; ri < relationships.length; ri++) {
    const rel = relationships[ri];
    const pts = edgeRoutes.get(`rel-${ri}`);
    if (!pts || pts.length < 2) continue;

    // Draw path
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
    parts.push(
      `<path d="${d}" fill="none" stroke="${theme.edge.strokeColor}" stroke-width="${theme.edge.strokeWidth}" />`,
    );

    // Cardinality labels
    if (rel.fromCardinality) {
      const [sx, sy] = pts[0];
      const [nx, ny] = pts[1];
      const offset = cardinalityOffset(sx, sy, nx, ny);
      parts.push(
        `<text x="${sx + offset.x}" y="${sy + offset.y}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${theme.edge.labelColor}">${escapeXml(rel.fromCardinality)}</text>`,
      );
    }
    if (rel.toCardinality) {
      const [ex, ey] = pts[pts.length - 1];
      const [px, py] = pts[pts.length - 2];
      const offset = cardinalityOffset(ex, ey, px, py);
      parts.push(
        `<text x="${ex + offset.x}" y="${ey + offset.y}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${theme.edge.labelColor}">${escapeXml(rel.toCardinality)}</text>`,
      );
    }

    // Relationship label (at true polyline midpoint)
    if (rel.label) {
      const [mx, my] = polylineMidpoint(pts);
      parts.push(
        `<rect x="${mx - rel.label.length * 3.5 - 6}" y="${my - 10}" width="${rel.label.length * 7 + 12}" height="20" rx="4" ry="4" fill="${theme.edge.labelBgColor}" />`,
      );
      parts.push(
        `<text x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${theme.edge.labelFontSize}" fill="${theme.edge.labelColor}">${escapeXml(rel.label)}</text>`,
      );
    }
  }

  // ── Entities ──
  for (let ei = 0; ei < entities.length; ei++) {
    const entity = entities[ei];
    const box = positions.get(entity.id);
    if (!box) continue;

    let headerBg = theme.node.bgColor;
    let strokeColor = theme.node.strokeColor;
    if (theme.nodeColors) {
      const colors = theme.nodeColors[ei % theme.nodeColors.length];
      headerBg = colors.bg;
      strokeColor = colors.stroke;
    }

    // Per-entity body fill derived from header color
    const bodyFill = theme.nodeColors ? lighten(headerBg, 0.7) : defaultBodyFill;
    const altRowFill = theme.nodeColors ? lighten(headerBg, 0.5) : defaultAltRowFill;

    const r = theme.node.borderRadius;

    // Entity container (full rect with rounded corners)
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${r}" ry="${r}" fill="${bodyFill}" stroke="${strokeColor}" stroke-width="${theme.node.strokeWidth}" />`,
    );

    // Header background (top portion, clipped for rounded top corners)
    // Draw a rect that covers just the header area — use top half with rounded corners
    // We draw a full-width rect filling header, overlaying the body portion
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${ENTITY_HEADER_HEIGHT}" rx="${r}" ry="${r}" fill="${headerBg}" stroke="none" />`,
    );
    // Fill the bottom corners of the header (which should be square, not rounded)
    parts.push(
      `<rect x="${box.x}" y="${box.y + ENTITY_HEADER_HEIGHT - r}" width="${box.width}" height="${r}" fill="${headerBg}" stroke="none" />`,
    );

    // Separator line
    parts.push(
      `<line x1="${box.x}" y1="${box.y + ENTITY_HEADER_HEIGHT}" x2="${box.x + box.width}" y2="${box.y + ENTITY_HEADER_HEIGHT}" stroke="${strokeColor}" stroke-width="1" />`,
    );

    // Header label (centered)
    parts.push(
      `<text x="${box.x + box.width / 2}" y="${box.y + ENTITY_HEADER_HEIGHT / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${ENTITY_FONT_SIZE}" font-weight="700" fill="${theme.node.labelColor}">${escapeXml(entity.label)}</text>`,
    );

    // Field rows
    for (let fi = 0; fi < entity.fields.length; fi++) {
      const field = entity.fields[fi];
      const rowY = box.y + ENTITY_HEADER_HEIGHT + fi * FIELD_ROW_HEIGHT;

      // Alternating row background
      if (fi % 2 === 1) {
        // For the last row, we need to respect the border radius
        if (fi === entity.fields.length - 1) {
          // Use clip path for bottom rounded corners
          parts.push(
            `<clipPath id="lastrow-${entity.id}"><rect x="${box.x}" y="${rowY}" width="${box.width}" height="${FIELD_ROW_HEIGHT + r}" rx="${r}" ry="${r}" /></clipPath>`,
          );
          parts.push(
            `<rect x="${box.x}" y="${rowY}" width="${box.width}" height="${FIELD_ROW_HEIGHT}" fill="${altRowFill}" opacity="0.5" />`,
          );
        } else {
          parts.push(
            `<rect x="${box.x}" y="${rowY}" width="${box.width}" height="${FIELD_ROW_HEIGHT}" fill="${altRowFill}" opacity="0.5" />`,
          );
        }
      }

      const rowCenterY = rowY + FIELD_ROW_HEIGHT / 2;
      let textX = box.x + ENTITY_PAD_X;

      // PK/FK indicator
      if (field.pk) {
        parts.push(
          `<text x="${textX + PK_FK_PREFIX_W / 2 - 4}" y="${rowCenterY}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#D97706">PK</text>`,
        );
        textX += PK_FK_PREFIX_W;
      } else if (field.fk) {
        parts.push(
          `<text x="${textX + PK_FK_PREFIX_W / 2 - 4}" y="${rowCenterY}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="${theme.edge.strokeColor}">FK</text>`,
        );
        textX += PK_FK_PREFIX_W;
      }

      // Field name
      parts.push(
        `<text x="${textX}" y="${rowCenterY}" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${FIELD_FONT_SIZE}" fill="${theme.node.labelColor}">${escapeXml(field.name)}</text>`,
      );

      // Field type (right-aligned)
      parts.push(
        `<text x="${box.x + box.width - ENTITY_PAD_X}" y="${rowCenterY}" text-anchor="end" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${FIELD_FONT_SIZE}" fill="${theme.node.labelColor}" opacity="0.6">${escapeXml(field.type)}</text>`,
      );
    }

    // Re-draw the border on top of everything (so alt-row fills don't cover it)
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${r}" ry="${r}" fill="none" stroke="${strokeColor}" stroke-width="${theme.node.strokeWidth}" />`,
    );
  }

  parts.push(`</g>`);
  parts.push(`</svg>`);

  return parts.join("\n");
}

/** Compute label offset from an edge endpoint, perpendicular to the edge direction. */
function cardinalityOffset(
  endX: number,
  endY: number,
  adjacentX: number,
  adjacentY: number,
): { x: number; y: number } {
  const dx = adjacentX - endX;
  const dy = adjacentY - endY;

  // Determine primary direction (orthogonal edges)
  if (Math.abs(dy) > Math.abs(dx)) {
    // Vertical edge — offset horizontally
    return { x: dy > 0 ? -16 : -16, y: dy > 0 ? 16 : -16 };
  } else {
    // Horizontal edge — offset vertically
    return { x: dx > 0 ? 16 : -16, y: -16 };
  }
}
