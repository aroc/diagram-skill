export interface DiagramTheme {
  id: string;
  name: string;
  background: string;
  /** Colors cycled for group container fills */
  groupColors: string[];
  group: {
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    labelColor: string;
    labelFontSize: number;
    borderRadius: number;
  };
  node: {
    bgColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderRadius: number;
    labelColor: string;
    labelFontSize: number;
  };
  edge: {
    strokeColor: string;
    strokeWidth: number;
    labelColor: string;
    labelBgColor: string;
    labelFontSize: number;
    arrowSize: number;
  };
  /** Optional per-node color cycling (used by FigJam) */
  nodeColors?: { bg: string; stroke: string }[];
}

export const themes: Record<string, DiagramTheme> = {
  slate: {
    id: "slate",
    name: "Slate",
    background: "#FFFFFF",
    groupColors: ["#F8FAFC", "#F1F5F9", "#EFF6FF"],
    group: {
      strokeColor: "#CBD5E1",
      strokeWidth: 1.5,
      opacity: 1,
      labelColor: "#1E3A5F",
      labelFontSize: 16,
      borderRadius: 12,
    },
    node: {
      bgColor: "#DBEAFE",
      strokeColor: "#93C5FD",
      strokeWidth: 1.5,
      borderRadius: 8,
      labelColor: "#1E3A5F",
      labelFontSize: 14,
    },
    edge: {
      strokeColor: "#64748B",
      strokeWidth: 1.5,
      labelColor: "#334155",
      labelBgColor: "#F8FAFC",
      labelFontSize: 12,
      arrowSize: 8,
    },
  },

  sandstone: {
    id: "sandstone",
    name: "Sandstone",
    background: "#FFFCF8",
    groupColors: ["#FAF4ED", "#F5EDE0", "#FFF8F0"],
    group: {
      strokeColor: "#D4C5B0",
      strokeWidth: 1.5,
      opacity: 1,
      labelColor: "#5D4E37",
      labelFontSize: 16,
      borderRadius: 12,
    },
    node: {
      bgColor: "#F5E6D3",
      strokeColor: "#C4A882",
      strokeWidth: 1.5,
      borderRadius: 8,
      labelColor: "#5D4E37",
      labelFontSize: 14,
    },
    edge: {
      strokeColor: "#8B7D6B",
      strokeWidth: 1.5,
      labelColor: "#5D4E37",
      labelBgColor: "#FAF4ED",
      labelFontSize: 12,
      arrowSize: 8,
    },
  },

  figjam: {
    id: "figjam",
    name: "FigJam",
    background: "#FFFFFF",
    groupColors: ["#FFECBD", "#FFE0F0", "#D4F5D9", "#DBEAFE"],
    group: {
      strokeColor: "#E6A800",
      strokeWidth: 1.5,
      opacity: 1,
      labelColor: "#1B1B1B",
      labelFontSize: 16,
      borderRadius: 12,
    },
    node: {
      bgColor: "#FFC943",
      strokeColor: "#E6A800",
      strokeWidth: 1.5,
      borderRadius: 8,
      labelColor: "#1B1B1B",
      labelFontSize: 14,
    },
    edge: {
      strokeColor: "#4A4A4A",
      strokeWidth: 1.5,
      labelColor: "#1B1B1B",
      labelBgColor: "#FFFFFF",
      labelFontSize: 12,
      arrowSize: 8,
    },
    nodeColors: [
      { bg: "#FFC943", stroke: "#E6A800" },   // yellow
      { bg: "#FFC2EC", stroke: "#F849C1" },   // pink
      { bg: "#CDF4D3", stroke: "#66D575" },   // green
      { bg: "#A8D4FF", stroke: "#4DA6FF" },   // blue
    ],
  },
};

export const THEME_NAMES = Object.keys(themes);

export function getTheme(name: string): DiagramTheme {
  const theme = themes[name];
  if (!theme) {
    const valid = THEME_NAMES.join(", ");
    throw new Error(`Unknown theme "${name}". Valid themes: ${valid}`);
  }
  return theme;
}
