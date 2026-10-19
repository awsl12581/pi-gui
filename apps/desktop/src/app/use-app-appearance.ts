import { useEffect, useMemo, useState } from "react";
import { i18n } from "../../i18n";
import type { DesktopAppState } from "../../contracts/desktop-state";
import type { ExtensionViewTheme } from "../features/extensions/extension-view-panel";
import { applyTheme, getActiveTheme, useActiveTheme } from "../ui/active-theme";

export function useAppAppearance(snapshot: DesktopAppState | null) {
  // Unknown until main answers; until then the theme from the last launch stays.
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const piApi = window.piApp;
    if (!piApi) return;

    void piApi
      .getResolvedTheme()
      .then((theme) => {
        setResolvedTheme(theme);
      })
      .catch((error: unknown) => {
        console.error("[renderer] getResolvedTheme failed", error);
        // Keep the variant painted at startup so preset changes still apply.
        setResolvedTheme((current) => current ?? getActiveTheme().variant);
      });

    const unsub = piApi.onThemeChanged((theme) => {
      setResolvedTheme(theme);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const themePresetId = snapshot?.themePresetId;
    if (!resolvedTheme || !themePresetId) return;
    applyTheme(themePresetId, resolvedTheme);
  }, [resolvedTheme, snapshot?.themePresetId]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "enable-transparency",
      snapshot?.enableTransparency ?? false,
    );
  }, [snapshot?.enableTransparency]);

  const activeTheme = useActiveTheme();
  const extensionViewTheme = useMemo<ExtensionViewTheme>(
    () => ({
      mode: activeTheme.variant,
      background: activeTheme.tokens["--main"] ?? "",
      foreground: activeTheme.tokens["--text"] ?? "",
      accent: activeTheme.tokens["--accent"] ?? "",
    }),
    [activeTheme, i18n.language],
  );

  return extensionViewTheme;
}
