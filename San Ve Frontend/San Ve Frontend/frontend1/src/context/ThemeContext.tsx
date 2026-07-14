import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ThemeContext } from "./useTheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

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
