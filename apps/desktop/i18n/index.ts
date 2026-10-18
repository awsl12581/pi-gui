import { createInstance, type TOptions } from "i18next";
import type { AppLanguage, UiLabel } from "../contracts/language";
import zhCN from "./zh-CN.json";

/** Each Electron process owns an instance; no Node or IPC capabilities live here. */
export const i18n = createInstance();
void i18n
  .init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "zh-CN"],
    resources: { en: { translation: {} }, "zh-CN": { translation: zhCN } },
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    interpolation: { escapeValue: false },
  })
  .catch((error: unknown) => {
    console.error("[i18n] initialization failed", error);
  });

/** English source messages are also the fallback catalog. */
export function t(message: string, values?: TOptions): string {
  return i18n.t(message, { defaultValue: message, ...values });
}

export function setLanguage(language: AppLanguage): void {
  if (i18n.language !== language)
    void i18n.changeLanguage(language).catch((error: unknown) => {
      console.error("[i18n] language change failed", error);
    });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language).format(value);
}

export function translateMessage(label: UiLabel): string {
  return "key" in label ? t(label.key, label.values) : label.map(translateMessage).join(", ");
}
