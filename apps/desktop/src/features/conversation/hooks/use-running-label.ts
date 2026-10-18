import { t, i18n } from "../../../../i18n";
import { useLocale } from "../../../ui/use-locale";
import { useEffect, useState } from "react";

export function useRunningLabel(startedAt: string | undefined) {
  useLocale();
  const [label, setLabel] = useState(() => formatRunningLabel(startedAt));

  useEffect(() => {
    setLabel(formatRunningLabel(startedAt));
    if (!startedAt) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLabel(formatRunningLabel(startedAt));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [startedAt, i18n.language]);

  return label;
}

function formatRunningLabel(startedAt: string | undefined): string {
  if (!startedAt) {
    return t("Working…");
  }

  const diffMs = Math.max(0, Date.now() - Date.parse(startedAt));
  const seconds = Math.max(1, Math.floor(diffMs / 1000));
  if (seconds < 60) {
    return t("Working for {{value0}}s", { value0: seconds });
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining === 0
    ? t("Working for {{value0}}m", { value0: minutes })
    : t("Working for {{value0}}m {{value1}}s", { value0: minutes, value1: remaining });
}
