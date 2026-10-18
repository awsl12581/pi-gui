import { t } from "../../i18n";
export function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRelativeTime(value: string): string {
  if (!value) {
    return "";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return t("now");
  if (diffMinutes < 60) return t("{{value0}}m", { value0: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t("{{value0}}h", { value0: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t("{{value0}}d", { value0: diffDays });
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return t("{{value0}}w", { value0: diffWeeks });
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return t("{{value0}}mo", { value0: diffMonths });
  const diffYears = Math.floor(diffDays / 365);
  return t("{{value0}}y", { value0: diffYears });
}
