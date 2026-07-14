// src/context/useTheme.ts
// FIX react-refresh/only-export-components: tách context object + hook ra khỏi file component
import { createContext, useContext } from "react";

export type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
