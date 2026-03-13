import { useState, useCallback } from "react";
import { getTheme, DEFAULT_THEME_ID, THEMES } from "../lib/themes";
import type { DiagramTheme } from "../lib/themes";

const STORAGE_KEY = "flowtown:theme";

function readStoredThemeId(): string {
  try {
    // URL param takes precedence (used by PNG export and direct linking)
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get("theme");
    if (urlTheme && urlTheme in THEMES) return urlTheme;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored;
    return DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function useTheme(): {
  themeId: string;
  theme: DiagramTheme;
  setThemeId: (id: string) => void;
} {
  const [themeId, setThemeIdState] = useState<string>(readStoredThemeId);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore storage errors (e.g. quota exceeded, private browsing)
    }
  }, []);

  return { themeId, theme: getTheme(themeId), setThemeId };
}
