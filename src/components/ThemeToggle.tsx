"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import {
  applyTheme, getServerThemeSnapshot, getThemeSnapshot, subscribeToThemeChange,
} from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToThemeChange, getThemeSnapshot, getServerThemeSnapshot);

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
