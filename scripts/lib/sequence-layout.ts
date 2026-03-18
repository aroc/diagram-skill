import type { SequenceDefinition, ParticipantDef, MessageDef } from "./sequence-types.js";
import { textWidth } from "./elk-layout.js";
import type { Box } from "./elk-layout.js";

// ─── Constants ──────────────────────────────────────────────────────

const PARTICIPANT_PAD_X = 36;
const PARTICIPANT_HEIGHT = 44;
const PARTICIPANT_GAP = 60;
const MIN_PARTICIPANT_W = 120;
const MESSAGE_SPACING = 56;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 40;
const SELF_MESSAGE_WIDTH = 50;
const SELF_MESSAGE_HEIGHT = 30;
const PARTICIPANT_FONT_SIZE = 16;
const MESSAGE_FONT_SIZE = 13;
const MESSAGE_LABEL_PAD = 16;

// ─── Layout output types ────────────────────────────────────────────

export interface SequenceLayout {
  participants: ParticipantDef[];
  messages: MessageDef[];
  participantBoxes: Map<string, Box>;
  lifelines: Map<string, { x: number; top: number; bottom: number }>;
  messagePositions: MessagePosition[];
  width: number;
  height: number;
}

export interface MessagePosition {
  y: number;
  fromX: number;
  toX: number;
  label?: string;
  type: "solid" | "dashed";
  isSelf: boolean;
}

// ─── Layout function ────────────────────────────────────────────────

export function layoutSequence(source: string): SequenceLayout {
  let def: SequenceDefinition;
  try {
    def = JSON.parse(source);
  } catch {
    throw new Error("Failed to parse sequence diagram JSON");
  }

  // Validation
  if (!def.participants || def.participants.length === 0) {
    throw new Error("Sequence diagram must have at least one participant");
  }

  const participantIds = new Set<string>();
  for (const p of def.participants) {
    if (!p.id || typeof p.id !== "string") {
      throw new Error(`Invalid participant: missing or non-string "id". Got: ${JSON.stringify(p)}`);
    }
    if (!p.label || typeof p.label !== "string") {
      throw new Error(`Invalid participant "${p.id}": missing or non-string "label".`);
    }
    if (participantIds.has(p.id)) {
      throw new Error(`Duplicate participant ID "${p.id}".`);
    }
    participantIds.add(p.id);
  }

  const messages = def.messages ?? [];
  for (const msg of messages) {
    if (!participantIds.has(msg.from)) {
      throw new Error(
        `Message references unknown participant "${msg.from}". Available: ${[...participantIds].join(", ")}`,
      );
    }
    if (!participantIds.has(msg.to)) {
      throw new Error(
        `Message references unknown participant "${msg.to}". Available: ${[...participantIds].join(", ")}`,
      );
    }
  }

  // Calculate participant widths based on label text + message labels
  // We also need to account for message labels that span between participants
  const participantWidths = new Map<string, number>();
  for (const p of def.participants) {
    const labelW = textWidth(p.label, PARTICIPANT_FONT_SIZE) + PARTICIPANT_PAD_X * 2;
    participantWidths.set(p.id, Math.max(labelW, MIN_PARTICIPANT_W));
  }

  // Widen participants if needed to fit message labels between adjacent participants
  const participantIndex = new Map<string, number>();
  def.participants.forEach((p, i) => participantIndex.set(p.id, i));

  for (const msg of messages) {
    if (msg.from === msg.to || !msg.label) continue;
    const fi = participantIndex.get(msg.from)!;
    const ti = participantIndex.get(msg.to)!;
    // Only adjust for adjacent participants
    if (Math.abs(fi - ti) === 1) {
      const labelW = textWidth(msg.label, MESSAGE_FONT_SIZE) + MESSAGE_LABEL_PAD * 2;
      const minGap = labelW + 20; // need at least this much space between lifeline centers
      const halfFrom = participantWidths.get(msg.from)! / 2;
      const halfTo = participantWidths.get(msg.to)! / 2;
      const currentGap = halfFrom + PARTICIPANT_GAP + halfTo;
      if (minGap > currentGap) {
        // Distribute extra space evenly
        const extra = (minGap - currentGap) / 2;
        participantWidths.set(msg.from, participantWidths.get(msg.from)! + extra);
        participantWidths.set(msg.to, participantWidths.get(msg.to)! + extra);
      }
    }
  }

  // Lay participants left-to-right
  const participantBoxes = new Map<string, Box>();
  let curX = 0;
  for (const p of def.participants) {
    const w = participantWidths.get(p.id)!;
    participantBoxes.set(p.id, { x: curX, y: 0, width: w, height: PARTICIPANT_HEIGHT });
    curX += w + PARTICIPANT_GAP;
  }

  // Lifeline X = center of participant box
  const lifelines = new Map<string, { x: number; top: number; bottom: number }>();
  for (const p of def.participants) {
    const box = participantBoxes.get(p.id)!;
    lifelines.set(p.id, {
      x: box.x + box.width / 2,
      top: PARTICIPANT_HEIGHT,
      bottom: 0, // will be set after we know total height
    });
  }

  // Stack messages vertically
  const messagePositions: MessagePosition[] = [];
  let msgY = PARTICIPANT_HEIGHT + TOP_MARGIN + MESSAGE_SPACING / 2;

  for (const msg of messages) {
    const fromLifeline = lifelines.get(msg.from)!;
    const toLifeline = lifelines.get(msg.to)!;
    const isSelf = msg.from === msg.to;

    messagePositions.push({
      y: msgY,
      fromX: fromLifeline.x,
      toX: toLifeline.x,
      label: msg.label,
      type: msg.type ?? "solid",
      isSelf,
    });

    msgY += isSelf ? MESSAGE_SPACING + SELF_MESSAGE_HEIGHT : MESSAGE_SPACING;
  }

  // Total dimensions
  const totalHeight = msgY + BOTTOM_MARGIN;
  let totalWidth = curX - PARTICIPANT_GAP; // remove trailing gap

  // Account for self-message labels extending beyond rightmost participant
  for (const mp of messagePositions) {
    if (mp.isSelf && mp.label) {
      const labelW = textWidth(mp.label, MESSAGE_FONT_SIZE);
      const rightExtent = mp.fromX + SELF_MESSAGE_WIDTH + 8 + labelW;
      totalWidth = Math.max(totalWidth, rightExtent);
    }
  }

  // Update lifeline bottoms — end shortly after the last message
  const lastMsgY = messagePositions.length > 0
    ? messagePositions[messagePositions.length - 1].y + (messagePositions[messagePositions.length - 1].isSelf ? SELF_MESSAGE_HEIGHT : 0)
    : PARTICIPANT_HEIGHT + TOP_MARGIN;
  const lifelineBottom = lastMsgY + BOTTOM_MARGIN;

  for (const p of def.participants) {
    const ll = lifelines.get(p.id)!;
    ll.bottom = lifelineBottom;
  }

  return {
    participants: def.participants,
    messages,
    participantBoxes,
    lifelines,
    messagePositions,
    width: totalWidth,
    height: lifelineBottom + 10, // small padding below lifelines
  };
}

export { PARTICIPANT_FONT_SIZE, MESSAGE_FONT_SIZE, SELF_MESSAGE_WIDTH, SELF_MESSAGE_HEIGHT };
