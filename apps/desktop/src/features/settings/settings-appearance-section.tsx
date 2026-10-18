import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import type { ThemeMode, ThemePresetId } from "../../../contracts/desktop-state";
import { SettingsSelect, SettingsSwitch } from "./settings-controls";
import { SettingsGroup, SettingsRow } from "./settings-utils";
import type { CSSProperties } from "react";
import { themePreset, themePresets, themeSwatches, themeTokensFor } from "../../../contracts/theme";
import { useActiveTheme } from "../../ui/active-theme";

interface SettingsAppearanceSectionProps {
  readonly themeMode: ThemeMode;
  readonly themePresetId: ThemePresetId;
  readonly onSetThemeMode: (mode: ThemeMode) => void;
  readonly onSetThemePresetId: (presetId: ThemePresetId) => void;
  readonly enableTransparency: boolean;
  readonly onSetEnableTransparency: (enabled: boolean) => void;
}

const THEME_MODES: readonly { readonly mode: ThemeMode; readonly label: string }[] = [
  {
    mode: "system",
    get label() {
      return t("System");
    },
  },
  {
    mode: "light",
    get label() {
      return t("Light");
    },
  },
  {
    mode: "dark",
    get label() {
      return t("Dark");
    },
  },
];

export function SettingsAppearanceSection({
  themeMode,
  themePresetId,
  onSetThemeMode,
  onSetThemePresetId,
  enableTransparency,
  onSetEnableTransparency,
}: SettingsAppearanceSectionProps) {
  useLocale();
  const activePreset = themePreset(themePresetId);
  const { variant } = useActiveTheme();
  return (
    <>
      <SettingsGroup title={t("Theme")} plain>
        <RadioGroup
          aria-label={t("Theme")}
          className="theme-mode-tiles"
          value={themeMode}
          onValueChange={(value) => onSetThemeMode(value as ThemeMode)}
          style={tilePalette(themePresetId)}
        >
          {THEME_MODES.map((option) => (
            <label
              className="theme-mode-tile"
              key={option.mode}
              htmlFor={`theme-mode-${option.mode}`}
            >
              <RadioGroupItem id={`theme-mode-${option.mode}`} value={option.mode} />
              <span
                aria-hidden="true"
                className={`theme-mode-tile__preview theme-mode-tile__preview--${option.mode}`}
              >
                <span className="theme-mode-tile__window">
                  <span className="theme-mode-tile__line theme-mode-tile__line--title" />
                  <span className="theme-mode-tile__line" />
                  <span className="theme-mode-tile__line" />
                </span>
              </span>
              <span className="theme-mode-tile__label">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow title={t("Color preset")} description={activePreset.description}>
          <span className="settings-preset-control">
            <span aria-hidden="true" className="settings-preset-swatches">
              {themeSwatches(themePresetId, variant).map((swatch, index) => (
                <span key={index} style={{ background: swatch }} />
              ))}
            </span>
            <SettingsSelect
              label={t("Color preset")}
              options={themePresets.map((preset) => ({ value: preset.id, label: preset.name }))}
              value={themePresetId}
              onChange={onSetThemePresetId}
            />
          </span>
        </SettingsRow>
        <SettingsRow
          title={t("Window transparency")}
          description={t("Let desktop colors show through supported surfaces.")}
        >
          <SettingsSwitch
            checked={enableTransparency}
            label={t("Window transparency")}
            onChange={onSetEnableTransparency}
          />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}

function tilePalette(presetId: ThemePresetId): CSSProperties {
  const light = themeTokensFor(presetId, "light");
  const dark = themeTokensFor(presetId, "dark");
  return {
    "--tile-light-bg": light["--sidebar"],
    "--tile-light-window": light["--main"],
    "--tile-light-line": light["--line-strong"],
    "--tile-dark-bg": dark["--sidebar"],
    "--tile-dark-window": dark["--main"],
    "--tile-dark-line": dark["--line-strong"],
  } as CSSProperties;
}
