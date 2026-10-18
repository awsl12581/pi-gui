import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useEffect, useState } from "react";
import type { RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import type { ModelSettingsScopeMode } from "../../../contracts/desktop-state";
import { SettingsSelect, SettingsSegmented, SettingsSwitch } from "./settings-controls";
import { SettingsGroup, SettingsRow } from "./settings-utils";

import type { LanguagePreference } from "../../../contracts/language";

interface SettingsGeneralSectionProps {
  readonly runtime?: RuntimeSnapshot;
  readonly modelSettingsScopeMode: ModelSettingsScopeMode;
  readonly languagePreference: LanguagePreference;
  readonly onSetLanguagePreference: (preference: LanguagePreference) => void;
  readonly integratedTerminalShell: string;
  readonly onSetModelSettingsScopeMode: (mode: ModelSettingsScopeMode) => void;
  readonly onSetIntegratedTerminalShell: (shellPath: string) => void;
  readonly onToggleSkillCommands: (enabled: boolean) => void;
}

export function SettingsGeneralSection({
  runtime,
  modelSettingsScopeMode,
  languagePreference,
  onSetLanguagePreference,
  integratedTerminalShell,
  onSetModelSettingsScopeMode,
  onSetIntegratedTerminalShell,
  onToggleSkillCommands,
}: SettingsGeneralSectionProps) {
  useLocale();
  const [terminalShellDraft, setTerminalShellDraft] = useState(integratedTerminalShell);

  useEffect(() => {
    setTerminalShellDraft(integratedTerminalShell);
  }, [integratedTerminalShell]);

  const commitTerminalShellDraft = () => {
    if (terminalShellDraft !== integratedTerminalShell) {
      onSetIntegratedTerminalShell(terminalShellDraft);
    }
  };

  return (
    <>
      <SettingsGroup title={t("Preferences")}>
        <SettingsRow
          title={t("Language")}
          description={t(
            "Choose the app language. System follows your operating system’s preferred language.",
          )}
        >
          <SettingsSelect
            label={t("App language")}
            value={languagePreference}
            onChange={onSetLanguagePreference}
            options={[
              { value: "system", label: t("System") },
              { value: "zh-CN", label: "简体中文" },
              { value: "en", label: "English" },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title={t("Agent")}>
        <SettingsRow
          title={t("Model settings scope")}
          description={t(
            "Apply the default model and enabled models everywhere, or set them per repo.",
          )}
        >
          <SettingsSegmented
            label={t("Model settings scope")}
            options={[
              { value: "app-global", label: t("App global") },
              { value: "per-repo", label: t("Per repo") },
            ]}
            value={modelSettingsScopeMode}
            onChange={onSetModelSettingsScopeMode}
          />
        </SettingsRow>
        <SettingsRow
          title={t("Skill slash commands")}
          description={t("Offer each skill as a slash command in the composer.")}
        >
          <SettingsSwitch
            checked={runtime?.settings.enableSkillCommands ?? true}
            label={t("Enable skill slash commands")}
            onChange={onToggleSkillCommands}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title={t("Terminal")}>
        <SettingsRow
          title={t("Shell")}
          description={t(
            "The shell the integrated terminal starts. Leave blank to use your login shell.",
          )}
        >
          <input
            aria-label={t("Shell of integrated terminal")}
            className="settings-text-input"
            placeholder="/bin/zsh"
            spellCheck={false}
            type="text"
            value={terminalShellDraft}
            onBlur={commitTerminalShellDraft}
            onChange={(event) => setTerminalShellDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
