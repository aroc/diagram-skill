export interface DiagramTheme {
  id: string;
  name: string;
  groupColors: string[];
  group: {
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    labelColor: string;
    borderRadius: number; // 0 = sharp corners in Excalidraw
  };
  node: {
    bgColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderRadius: number;
  };
  edge: {
    strokeColor: string;
    strokeWidth: number;
    labelColor: string;
    labelBgColor: string;
  };
  miniMapColor: string;
}

// ─── Blueprint ──────────────────────────────────────────────────────
// Clean, modern, confident. Distinct hues alternate warm/cool for
// maximum neighboring contrast. Medium radius, standard strokes.

const blueprintTheme: DiagramTheme = {
  id: "blueprint",
  name: "Blueprint",
  groupColors: [
    "#dbeafe", // Blue 100
    "#d1fae5", // Emerald 100
    "#ede9fe", // Violet 100
    "#fed7aa", // Orange 200
    "#e0e7ff", // Indigo 100
    "#fecaca", // Red 200
    "#ccfbf1", // Teal 100
    "#fef08a", // Yellow 200
  ],
  group: {
    strokeColor: "#94a3b8",
    strokeWidth: 1,
    opacity: 0.85,
    labelColor: "#334155",
    borderRadius: 8,
  },
  node: {
    bgColor: "#ffffff",
    strokeColor: "#334155",
    strokeWidth: 2,
    borderRadius: 8,
  },
  edge: {
    strokeColor: "#94a3b8",
    strokeWidth: 2,
    labelColor: "#475569",
    labelBgColor: "#ffffff",
  },
  miniMapColor: "#cbd5e1",
};

// ─── Graphite ───────────────────────────────────────────────────────
// Technical, precise, architectural. Cool grays with subtle color
// tints. Sharp corners and thin strokes — like an engineering drawing.

const graphiteTheme: DiagramTheme = {
  id: "graphite",
  name: "Graphite",
  groupColors: [
    "#c8ced8", // Blue-gray
    "#c5d0c8", // Green-gray
    "#cec8d4", // Purple-gray
    "#d4cdc8", // Warm-gray
    "#c4ced4", // Teal-gray
    "#d4c8ce", // Rose-gray
    "#cdd0c4", // Olive-gray
    "#c8cbd4", // Steel-gray
  ],
  group: {
    strokeColor: "#6b7280",
    strokeWidth: 1,
    opacity: 0.9,
    labelColor: "#1f2937",
    borderRadius: 2,
  },
  node: {
    bgColor: "#f9fafb",
    strokeColor: "#374151",
    strokeWidth: 1,
    borderRadius: 2,
  },
  edge: {
    strokeColor: "#9ca3af",
    strokeWidth: 1,
    labelColor: "#4b5563",
    labelBgColor: "#f9fafb",
  },
  miniMapColor: "#d1d5db",
};

// ─── Sandstone ──────────────────────────────────────────────────────
// Organic, warm, approachable. Earth tones — sage, clay, sand, moss.
// Generous radius and slightly heavier strokes for a soft feel.

const sandstoneTheme: DiagramTheme = {
  id: "sandstone",
  name: "Sandstone",
  groupColors: [
    "#d5ccbb", // Warm sand
    "#c2d4c0", // Sage green
    "#d4c1a9", // Clay
    "#b8c9cf", // Stone blue-gray
    "#d1c4b0", // Driftwood
    "#c9bfb0", // Taupe
    "#bfcfb4", // Moss
    "#d0bfb0", // Sandstone
  ],
  group: {
    strokeColor: "#8c7e6e",
    strokeWidth: 2,
    opacity: 0.8,
    labelColor: "#4a3f33",
    borderRadius: 14,
  },
  node: {
    bgColor: "#fefbf6",
    strokeColor: "#5c4f3d",
    strokeWidth: 2,
    borderRadius: 14,
  },
  edge: {
    strokeColor: "#9c8e7e",
    strokeWidth: 2,
    labelColor: "#5c4f3d",
    labelBgColor: "#fefbf6",
  },
  miniMapColor: "#d5ccbb",
};

export const THEMES: Record<string, DiagramTheme> = {
  blueprint: blueprintTheme,
  graphite: graphiteTheme,
  sandstone: sandstoneTheme,
};

export const DEFAULT_THEME_ID = "blueprint";

export function getTheme(id: string): DiagramTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
