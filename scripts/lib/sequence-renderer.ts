import type { SequenceLayout } from "./sequence-layout.js";
import { PARTICIPANT_FONT_SIZE, MESSAGE_FONT_SIZE, SELF_MESSAGE_WIDTH, SELF_MESSAGE_HEIGHT } from "./sequence-layout.js";
import type { DiagramTheme } from "./themes.js";
import { PADDING, escapeXml, svgOpen, svgBackground, svgArrowMarker } from "./svg-utils.js";

export function renderSequenceSvg(
  layout: SequenceLayout,
  theme: DiagramTheme,
  background: string,
): string {
  const { participants, participantBoxes, lifelines, messagePositions } = layout;

  const svgW = layout.width + PADDING * 2;
  const svgH = layout.height + PADDING * 2;

  const parts: string[] = [];

  parts.push(svgOpen(svgW, svgH));

  // Defs: arrow markers
  parts.push(`<defs>
  ${svgArrowMarker("seq-arrow-solid", 8, theme.edge.strokeColor)}
  <marker id="seq-arrow-open" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
    <polyline points="0 0, 8 4, 0 8" fill="none" stroke="${theme.edge.strokeColor}" stroke-width="1.5" />
  </marker>
</defs>`);

  // Background
  const bg = svgBackground(svgW, svgH, background);
  if (bg) parts.push(bg);

  // Open transform group
  parts.push(`<g transform="translate(${PADDING},${PADDING})">`);

  // ── Lifelines (behind everything) ──
  for (const p of participants) {
    const ll = lifelines.get(p.id)!;
    parts.push(
      `<line x1="${ll.x}" y1="${ll.top}" x2="${ll.x}" y2="${ll.bottom}" stroke="${theme.edge.strokeColor}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="6,4" />`,
    );
  }

  // ── Messages ──
  for (const msg of messagePositions) {
    const isDashed = msg.type === "dashed";
    const markerEnd = isDashed ? "url(#seq-arrow-open)" : "url(#seq-arrow-solid)";
    const dashAttr = isDashed ? ` stroke-dasharray="8,4"` : "";

    if (msg.isSelf) {
      // Self-message: rectangular loop going right and coming back
      const loopW = SELF_MESSAGE_WIDTH;
      const loopH = SELF_MESSAGE_HEIGHT;
      const d = `M${msg.fromX},${msg.y} L${msg.fromX + loopW},${msg.y} L${msg.fromX + loopW},${msg.y + loopH} L${msg.fromX},${msg.y + loopH}`;
      parts.push(
        `<path d="${d}" fill="none" stroke="${theme.edge.strokeColor}" stroke-width="1.5"${dashAttr} marker-end="${markerEnd}" />`,
      );
      // Label to the right of the loop
      if (msg.label) {
        parts.push(
          `<text x="${msg.fromX + loopW + 8}" y="${msg.y + loopH / 2}" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${MESSAGE_FONT_SIZE}" fill="${theme.edge.labelColor}">${escapeXml(msg.label)}</text>`,
        );
      }
    } else {
      // Regular message: line between lifelines
      parts.push(
        `<line x1="${msg.fromX}" y1="${msg.y}" x2="${msg.toX}" y2="${msg.y}" stroke="${theme.edge.strokeColor}" stroke-width="1.5"${dashAttr} marker-end="${markerEnd}" />`,
      );
      // Label above the arrow, centered between from and to
      if (msg.label) {
        const labelX = (msg.fromX + msg.toX) / 2;
        const labelY = msg.y - 10;
        parts.push(
          `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${MESSAGE_FONT_SIZE}" fill="${theme.edge.labelColor}">${escapeXml(msg.label)}</text>`,
        );
      }
    }
  }

  // ── Participant boxes (on top of lifelines) ──
  for (const p of participants) {
    const box = participantBoxes.get(p.id)!;

    let bgColor = theme.node.bgColor;
    let strokeColor = theme.node.strokeColor;
    if (theme.nodeColors) {
      const idx = participants.indexOf(p) % theme.nodeColors.length;
      bgColor = theme.nodeColors[idx].bg;
      strokeColor = theme.nodeColors[idx].stroke;
    }

    // Box
    parts.push(
      `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${theme.node.borderRadius}" ry="${theme.node.borderRadius}" fill="${bgColor}" stroke="${strokeColor}" stroke-width="${theme.node.strokeWidth}" />`,
    );
    // Label
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    parts.push(
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${PARTICIPANT_FONT_SIZE}" font-weight="600" fill="${theme.node.labelColor}">${escapeXml(p.label)}</text>`,
    );
  }

  // Close
  parts.push(`</g>`);
  parts.push(`</svg>`);

  return parts.join("\n");
}
