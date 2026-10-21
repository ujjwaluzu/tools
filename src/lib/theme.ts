export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "ujjwal-tools-theme";
export const THEME_CHANGE_EVENT = "ujjwal-theme-change";

export function resolveTheme(storedTheme: string | null, prefersDark: boolean): Theme {
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return prefersDark ? "dark" : "light";
}

export function getThemeBootstrapScript(): string {
  return `try { var storedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); var prefersDark = matchMedia("(prefers-color-scheme: dark)").matches; var resolve = ${resolveTheme.toString()}; document.documentElement.dataset.theme = resolve(storedTheme, prefersDark); } catch (_) { document.documentElement.dataset.theme = "light"; }`;
}

export function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function getServerThemeSnapshot(): Theme {
  return "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies for this page when storage is unavailable.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeToThemeChange(listener: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, listener);
}
