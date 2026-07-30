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
  // Nếu người dùng đã có lựa chọn trước đó, tôn trọng lựa chọn đó.
  // Nếu chưa có lịch sử, fallback theo cài đặt hệ thống (prefers-color-scheme).
  return saved ? saved === "dark" : getSystemPrefersDark();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);

  // Gắn/gỡ class "dark"/"light" lên <html> và cập nhật colorScheme +
  // localStorage mỗi khi darkMode thay đổi.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.classList.toggle("light", !darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  // Đồng bộ theme giữa các tab: khi tab khác đổi theme (localStorage thay đổi),
  // tab hiện tại cập nhật theo mà không cần reload.
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
