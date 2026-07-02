"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "atlas-theme";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage may throw in private/locked-down contexts.
  }
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start from "light" on both server and first client render so the
  // initial React tree matches the SSR output and we avoid a hydration
  // mismatch. The inline boot script in `layout.tsx` has already set the
  // `data-theme` attribute on <html> based on localStorage, so the actual
  // visual theme is correct from the very first paint — the React state
  // just catches up in the effect below.
  const [theme, setThemeState] = useState<Theme>("light");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored !== "light") setThemeState(stored);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // noop
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
