import { t } from "../../../i18n";
import type { ReactNode } from "react";
import {
  BellIcon,
  ExtensionIcon,
  KeyboardIcon,
  ModelIcon,
  PlugIcon,
  SettingsIcon,
  SkillIcon,
  SunIcon,
} from "../../ui/icons";

export interface SettingsSectionDefinition {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly icon: ReactNode;
  /** Words people search for that are not in the title, such as the page's row titles. */
  readonly keywords: readonly string[];
  readonly description: (workspaceName: string) => string;
  /** Pages that read or write one workspace's runtime. */
  readonly needsWorkspace: boolean;
}

/** Nav order: grouped the way Codex groups its settings, one entry per page. */
export const SETTINGS_SECTIONS = [
  {
    id: "general",
    get title() {
      return t("General");
    },
    get group() {
      return t("App");
    },
    icon: <SettingsIcon />,
    keywords: [
      "Language",
      "Preferences",
      "语言",
      "偏好",
      "model settings scope",
      "per repo",
      "skill slash commands",
      "terminal",
      "shell",
    ],
    description: () => t("App and runtime defaults."),
    needsWorkspace: false,
  },
  {
    id: "appearance",
    get title() {
      return t("Appearance");
    },
    get group() {
      return t("App");
    },
    icon: <SunIcon />,
    keywords: ["theme", "light", "dark", "system", "preset", "colors", "transparency"],
    description: () => t("Choose light, dark or system mode and a color preset."),
    needsWorkspace: false,
  },
  {
    id: "notifications",
    get title() {
      return t("Notifications");
    },
    get group() {
      return t("App");
    },
    icon: <BellIcon />,
    keywords: ["alerts", "background", "completion", "failures", "approval", "macos"],
    description: () => t("Choose which background events alert you."),
    needsWorkspace: false,
  },
  {
    id: "shortcuts",
    get title() {
      return t("Keyboard shortcuts");
    },
    get group() {
      return t("App");
    },
    icon: <KeyboardIcon />,
    keywords: ["keys", "hotkeys", "keybindings"],
    description: () => t("Shortcuts available across the app."),
    needsWorkspace: false,
  },
  {
    id: "licenses",
    get title() {
      return t("Open-source licenses");
    },
    get group() {
      return t("App");
    },
    icon: <ExtensionIcon />,
    keywords: ["legal", "copyright", "MIT", "third-party", "notices", "open source"],
    description: () => t("License terms and copyright notices for the software behind pi-gui."),
    needsWorkspace: false,
  },
  {
    id: "providers",
    get title() {
      return t("Providers");
    },
    get group() {
      return t("Agent");
    },
    icon: <PlugIcon />,
    keywords: ["login", "logout", "oauth", "api key", "auth", "custom endpoint"],
    description: (workspaceName) =>
      t("Connect providers and manage auth for {{value0}}.", { value0: workspaceName }),
    needsWorkspace: true,
  },
  {
    id: "models",
    get title() {
      return t("Models");
    },
    get group() {
      return t("Agent");
    },
    icon: <ModelIcon />,
    keywords: ["default model", "reasoning", "thinking", "enabled models"],
    description: () => t("Choose the default model and which models appear in pickers."),
    needsWorkspace: true,
  },
  {
    id: "mcp",
    get title() {
      return t("MCP servers");
    },
    get group() {
      return t("Agent");
    },
    icon: <ExtensionIcon />,
    keywords: ["mcp", "mcp.json", "model context protocol", "servers", "code mode", "codemode"],
    description: () => t("Add, remove and switch the MCP servers pi connects in each thread."),
    needsWorkspace: true,
  },
] as const satisfies readonly SettingsSectionDefinition[];

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["id"];

/** Skills and extensions live in the settings nav but are their own app views. */
export const CUSTOMIZE_SECTION_ID = "customize";

export const SETTINGS_NAV_ITEMS = [
  ...SETTINGS_SECTIONS,
  {
    id: CUSTOMIZE_SECTION_ID,
    get title() {
      return t("Skills and extensions");
    },
    get group() {
      return t("Customize");
    },
    icon: <SkillIcon />,
    keywords: ["skills", "extensions", "plugins", "slash commands", "tools"],
  },
] as const;

export function settingsSectionDefinition(section: SettingsSection): SettingsSectionDefinition {
  return SETTINGS_SECTIONS.find((definition) => definition.id === section) ?? SETTINGS_SECTIONS[0];
}

export function sectionTitle(section: SettingsSection): string {
  return settingsSectionDefinition(section).title;
}
