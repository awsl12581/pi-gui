import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

/** Subscribe without remounting the conversation, composer or open dialogs. */
export function useLocale(): string {
  return useTranslation(undefined, { i18n }).i18n.language;
}
