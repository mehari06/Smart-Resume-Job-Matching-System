"use client";

import { useEffect, useState } from "react";
import { cn } from "./utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("sr-theme") as "light" | "dark" | null;
    const nextTheme = stored ?? "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme === "dark" ? "dark" : "light";
  }, []);

  const toggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme === "dark" ? "dark" : "light";
    window.localStorage.setItem("sr-theme", nextTheme);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-white/70 text-xs text-ink-soft transition hover:-translate-y-0.5 hover:shadow-soft",
        theme === "dark" && "bg-sand text-ink"
      )}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}
