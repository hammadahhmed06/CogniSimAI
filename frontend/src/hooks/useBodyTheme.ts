import { useEffect } from "react";

type BodyTheme = "app" | "landing";

const THEME_CLASSES: Record<BodyTheme, string> = {
  app: "theme-app",
  landing: "theme-landing",
};

/**
 * Ensures the document body reflects the correct background/theme styling
 * for the current route. Landing & auth pages use the blue gradient theme,
 * while in-app pages switch to a light theme.
 */
export function useBodyTheme(theme: BodyTheme) {
  useEffect(() => {
    const body = document.body;
    if (!body) return;

    const targetClass = THEME_CLASSES[theme];
    const otherClasses = Object.values(THEME_CLASSES).filter(
      (cls) => cls !== targetClass
    );

    body.classList.add(targetClass);
    otherClasses.forEach((cls) => body.classList.remove(cls));

    return () => {
      body.classList.remove(targetClass);
    };
  }, [theme]);
}
