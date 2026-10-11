export type AppTheme = "light" | "dark";

export function readSavedTheme(): AppTheme | null {
  try {
    const theme = localStorage.getItem("barangay-theme");
    return theme === "dark" || theme === "light" ? theme : null;
  } catch {
    return null;
  }
}

export function applyAppTheme(theme: AppTheme): void {
  const root = document.documentElement;
  const body = document.body;

  root.dataset.theme = theme;
  root.classList.toggle("dark-theme", theme === "dark");
  root.classList.toggle("light-theme", theme === "light");

  root.style.setProperty(
    "--system-background",
    theme === "dark" ? "#111b2a" : "#f5f7fb"
  );
  root.style.setProperty(
    "--system-surface",
    theme === "dark" ? "#1b2738" : "#ffffff"
  );
  root.style.setProperty(
    "--system-surface-secondary",
    theme === "dark" ? "#202e40" : "#f8fafc"
  );
  root.style.setProperty(
    "--system-border",
    theme === "dark" ? "#334155" : "#e2e8f0"
  );
  root.style.setProperty(
    "--system-text",
    theme === "dark" ? "#e2e8f0" : "#172033"
  );
  root.style.setProperty(
    "--system-text-secondary",
    theme === "dark" ? "#a4b1c2" : "#758094"
  );
  root.style.setProperty(
    "--system-input",
    theme === "dark" ? "#172435" : "#ffffff"
  );

  body.style.removeProperty("filter");
  body.style.removeProperty("font-family");
  body.style.removeProperty("font-size");
}
