export type AppLanguage = "en" | "zh-CN";
export type LanguagePreference = "system" | AppLanguage;

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "system" || value === "en" || value === "zh-CN";
}

export function resolveAppLanguage(
  preference: LanguagePreference,
  systemLanguages: readonly string[],
): AppLanguage {
  if (preference !== "system") return preference;
  // Use the OS's first preferred language. Unsupported languages fall back to English.
  return /^zh(?:[-_]|$)/i.test(systemLanguages[0] ?? "") ? "zh-CN" : "en";
}

/** App-authored presentation text; external messages remain plain strings. */
export interface UiMessage {
  readonly key: string;
  readonly values?: Readonly<Record<string, string | number>>;
}
export type UiLabel = UiMessage | readonly UiMessage[];

export function message(key: string, values?: UiMessage["values"]): UiMessage {
  return values ? { key, values } : { key };
}

export function sourceMessage(label: UiLabel): string {
  if ("key" in label) {
    return label.key.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) =>
      String(label.values?.[key] ?? match),
    );
  }
  return label.map(sourceMessage).join(", ");
}

export function labelFields(label: string | UiLabel): { label: string; labelMessage?: UiLabel } {
  return typeof label === "string"
    ? { label }
    : { label: sourceMessage(label), labelMessage: label };
}
