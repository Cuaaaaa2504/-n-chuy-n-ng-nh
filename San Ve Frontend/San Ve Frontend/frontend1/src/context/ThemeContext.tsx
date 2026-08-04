import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ThemeContext } from "./useTheme";

const THEME_STORAGE_KEY = "theme";

function getSystemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function getInitialDarkMode(): boolean {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved ? saved === "dark" : getSystemPrefersDark();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.classList.toggle("light", !darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || event.newValue === null) return;
      setDarkMode(event.newValue === "dark");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode: () => setDarkMode((prev) => !prev),
      setDarkMode,
    }),
    [darkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
