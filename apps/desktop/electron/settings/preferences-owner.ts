import {
  isThemeMode,
  isThemePresetId,
  type DesktopAppState,
  type NotificationPreferences,
  type ThemeMode,
  type ThemePresetId,
  type ThreadGrouping,
} from "../../contracts/desktop-state";
import {
  isLanguagePreference,
  resolveAppLanguage,
  type LanguagePreference,
} from "../../contracts/language";
import { t } from "../../i18n";

export type PreferencesState = Pick<
  DesktopAppState,
  | "sidebarCollapsed"
  | "threadGrouping"
  | "collapsedWorkspaceIds"
  | "notificationPreferences"
  | "integratedTerminalShell"
  | "enableTransparency"
  | "languagePreference"
  | "language"
  | "themeMode"
  | "themePresetId"
>;

export interface PreferencesOwnerHost {
  preferencesState(): PreferencesState;
  updatePreferences(patch: Partial<PreferencesState>): void;
  snapshot(): DesktopAppState;
  readonly systemLanguages: readonly string[];
  initialize(): Promise<void>;
  persistUiState(): Promise<void>;
  emit(): DesktopAppState;
}

export class PreferencesOwner {
  constructor(private readonly host: PreferencesOwnerHost) {}

  async setSidebarCollapsed(sidebarCollapsed: boolean): Promise<DesktopAppState> {
    await this.host.initialize();
    if (this.host.preferencesState().sidebarCollapsed === sidebarCollapsed) {
      return this.host.snapshot();
    }
    this.host.updatePreferences({
      sidebarCollapsed,
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setThreadGrouping(threadGrouping: ThreadGrouping): Promise<DesktopAppState> {
    await this.host.initialize();
    if (this.host.preferencesState().threadGrouping === threadGrouping) {
      return this.host.snapshot();
    }
    this.host.updatePreferences({
      threadGrouping,
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setWorkspaceCollapsed(workspaceId: string, collapsed: boolean): Promise<DesktopAppState> {
    await this.host.initialize();
    const collapsedWorkspaceIds = new Set(this.host.preferencesState().collapsedWorkspaceIds);
    if (collapsedWorkspaceIds.has(workspaceId) === collapsed) {
      return this.host.snapshot();
    }
    if (collapsed) collapsedWorkspaceIds.add(workspaceId);
    else collapsedWorkspaceIds.delete(workspaceId);
    this.host.updatePreferences({
      collapsedWorkspaceIds: [...collapsedWorkspaceIds],
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
  ): Promise<DesktopAppState> {
    await this.host.initialize();
    this.host.updatePreferences({
      notificationPreferences: {
        ...this.host.preferencesState().notificationPreferences,
        ...preferences,
      },
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setIntegratedTerminalShell(integratedTerminalShell: string): Promise<DesktopAppState> {
    await this.host.initialize();
    const normalizedShell = integratedTerminalShell.trim();
    if (this.host.preferencesState().integratedTerminalShell === normalizedShell) {
      return this.host.snapshot();
    }
    this.host.updatePreferences({
      integratedTerminalShell: normalizedShell,
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setEnableTransparency(enabled: boolean): Promise<DesktopAppState> {
    await this.host.initialize();
    if (this.host.preferencesState().enableTransparency === enabled) {
      return this.host.snapshot();
    }
    this.host.updatePreferences({
      enableTransparency: enabled,
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setLanguagePreference(languagePreference: LanguagePreference): Promise<DesktopAppState> {
    await this.host.initialize();
    if (!isLanguagePreference(languagePreference))
      throw new TypeError(t("Unsupported language preference"));
    if (this.host.preferencesState().languagePreference === languagePreference)
      return this.host.snapshot();
    this.host.updatePreferences({
      languagePreference,
      language: resolveAppLanguage(languagePreference, this.host.systemLanguages),
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setThemeMode(themeMode: ThemeMode): Promise<DesktopAppState> {
    await this.host.initialize();
    if (!isThemeMode(themeMode)) {
      throw new Error(t("Unsupported theme mode: {{value0}}", { value0: String(themeMode) }));
    }
    if (this.host.preferencesState().themeMode === themeMode) {
      return this.host.snapshot();
    }
    this.host.updatePreferences({
      themeMode,
    });
    await this.host.persistUiState();
    return this.host.emit();
  }

  async setThemePresetId(themePresetId: ThemePresetId): Promise<DesktopAppState> {
    await this.host.initialize();
    if (!isThemePresetId(themePresetId)) {
      throw new Error(t("Unsupported theme preset: {{value0}}", { value0: String(themePresetId) }));
    }
    if (this.host.preferencesState().themePresetId === themePresetId) {
      return this.host.snapshot();
    }
    this.host.updatePreferences({
      themePresetId,
    });
    await this.host.persistUiState();
    return this.host.emit();
  }
}
