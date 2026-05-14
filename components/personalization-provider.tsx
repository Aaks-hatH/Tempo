"use client";

/**
 * PersonalizationProvider
 *
 * Reads `tempo-prefs` from localStorage and applies them live to the DOM:
 *   - Accent color  → updates --accent CSS variable on :root
 *   - Font size     → sets data-font-size on <html>
 *   - Compact mode  → adds/removes `compact` class on <html>
 *   - Grid overlay  → adds/removes `hide-grid` class on <html>
 *   - Animations    → adds/removes `reduce-motion` class on <html>
 *
 * This provider is intentionally outside the session boundary so it applies
 * even on the login/signup pages, preventing a flash of wrong theme.
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type AccentColor = "blue" | "purple" | "green" | "orange" | "rose" | "cyan";
export type FontSize = "sm" | "md" | "lg";

export interface TempoPrefs {
  accent: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
  showGrid: boolean;
  animationsEnabled: boolean;
  notifyPings: boolean;
  notifyAssign: boolean;
  notifyTaskDue: boolean;
  notifyTeam: boolean;
  emailDigest: boolean;
}

const ACCENT_HEX: Record<AccentColor, string> = {
  blue:   "#3b82f6",
  purple: "#a855f7",
  green:  "#22c55e",
  orange: "#f97316",
  rose:   "#f43f5e",
  cyan:   "#06b6d4",
};

const FONT_SIZE_REM: Record<FontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

const DEFAULT_PREFS: TempoPrefs = {
  accent: "blue",
  fontSize: "md",
  compactMode: false,
  showGrid: true,
  animationsEnabled: true,
  notifyPings: true,
  notifyAssign: true,
  notifyTaskDue: true,
  notifyTeam: false,
  emailDigest: false,
};

function loadPrefs(): TempoPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem("tempo-prefs");
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyPrefs(prefs: TempoPrefs) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Accent color → CSS variable
  root.style.setProperty("--accent", ACCENT_HEX[prefs.accent]);

  // Font size
  root.style.fontSize = FONT_SIZE_REM[prefs.fontSize];

  // Compact mode
  root.classList.toggle("compact", prefs.compactMode);

  // Grid overlay
  root.classList.toggle("hide-grid", !prefs.showGrid);

  // Animations
  root.classList.toggle("reduce-motion", !prefs.animationsEnabled);
}

interface PersonalizationCtx {
  prefs: TempoPrefs;
  updatePrefs: (partial: Partial<TempoPrefs>) => void;
  savePrefs: () => void;
}

const PersonalizationContext = createContext<PersonalizationCtx>({
  prefs: DEFAULT_PREFS,
  updatePrefs: () => {},
  savePrefs: () => {},
});

export function usePersonalization() {
  return useContext(PersonalizationContext);
}

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<TempoPrefs>(DEFAULT_PREFS);

  // Load on mount
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyPrefs(loaded);
  }, []);

  // Re-apply whenever prefs change
  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "tempo-prefs") {
        const loaded = loadPrefs();
        setPrefs(loaded);
        applyPrefs(loaded);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const updatePrefs = useCallback((partial: Partial<TempoPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  }, []);

  const savePrefs = useCallback(() => {
    setPrefs((prev) => {
      localStorage.setItem("tempo-prefs", JSON.stringify(prev));
      return prev;
    });
  }, []);

  return (
    <PersonalizationContext.Provider value={{ prefs, updatePrefs, savePrefs }}>
      {children}
    </PersonalizationContext.Provider>
  );
}
