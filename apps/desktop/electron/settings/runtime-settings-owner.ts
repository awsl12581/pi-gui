import type { PiSdkDriver } from "@pi-gui/pi-sdk-driver";
import type { CreateSessionOptions, SessionRef, WorkspaceRef } from "@pi-gui/session-driver";
import type {
  ModelSettingsSnapshot,
  RuntimeLoginCallbacks,
  RuntimeSettingsSnapshot,
  RuntimeSnapshot,
} from "@pi-gui/session-driver/runtime-types";
import type { DesktopAppState, ModelSettingsScopeMode } from "../../contracts/desktop-state";
import type {
  CustomProviderConfig,
  McpServerScope,
  McpServersSnapshot,
  NewMcpServerInput,
} from "../../contracts/ipc";
import { resolveRepoWorkspaceId } from "../../contracts/workspace-roots";
import { t } from "../../i18n";
import type { RefreshStateOptions } from "../application/refresh-state-options";
import {
  applyModelSettingsSnapshot,
  hasStoredModelSettings,
  mergeEnabledModelPatterns,
  mergeModelSettingsSnapshot,
  readProjectModelSettingsFile,
  withHomeAsTilde,
} from "./model-settings";

export interface RuntimeSettingsOwnerHost {
  readonly runtimeSupervisor: PiSdkDriver["runtimeSupervisor"];
  reloadSessionWhenIdle(sessionRef: SessionRef): ReturnType<PiSdkDriver["reloadSessionWhenIdle"]>;
  settingsState(): Pick<
    DesktopAppState,
    "workspaces" | "selectedWorkspaceId" | "modelSettingsScopeMode" | "globalModelSettings"
  >;
  updateModelSettingsScopeMode(mode: ModelSettingsScopeMode): void;
  setRuntimeSnapshot(workspaceId: string, snapshot: RuntimeSnapshot): void;
  hasRuntimeSnapshot(workspaceId: string): boolean;
  runtimeSnapshots(): Record<string, RuntimeSnapshot>;
  isBuiltinExtensionDisabled(name: string): boolean;
  setBuiltinExtensionDisabled(name: string, disabled: boolean): void;
  initialize(): Promise<void>;
  emit(): DesktopAppState;
  persistUiState(): Promise<void>;
  recordSettingsSelfWrite(): Promise<void>;
  refreshSessionCommandsForWorkspace(workspaceId: string): Promise<void>;
  refreshState(options?: RefreshStateOptions): Promise<DesktopAppState>;
  sessionRefsForWorkspace(workspaceId: string): SessionRef[];
  withError(error: unknown): Promise<DesktopAppState>;
  withErrorHandling(fn: () => Promise<DesktopAppState>): Promise<DesktopAppState>;
  workspaceRefFromState(workspaceId: string): WorkspaceRef | undefined;
}

export class RuntimeSettingsOwner {
  constructor(private readonly host: RuntimeSettingsOwnerHost) {}

  async setModelSettingsScopeMode(
    modelSettingsScopeMode: ModelSettingsScopeMode,
  ): Promise<DesktopAppState> {
    await this.host.initialize();
    if (this.host.settingsState().modelSettingsScopeMode === modelSettingsScopeMode) {
      return this.host.emit();
    }
    if (modelSettingsScopeMode === "app-global") {
      await this.restoreGlobalModelSettings(this.host.settingsState().globalModelSettings);
    }
    this.host.updateModelSettingsScopeMode(modelSettingsScopeMode);
    await this.host.persistUiState();
    return this.host.refreshState({ clearLastError: true });
  }

  async refreshRuntime(workspaceId?: string): Promise<DesktopAppState> {
    await this.host.initialize();
    const resolvedWorkspaceId = workspaceId || this.host.settingsState().selectedWorkspaceId;
    const ws = this.host.workspaceRefFromState(resolvedWorkspaceId);
    if (!ws) {
      return this.host.emit();
    }

    return this.host.withErrorHandling(async () => {
      const snapshot = await this.host.runtimeSupervisor.refreshRuntime(ws);
      this.host.setRuntimeSnapshot(ws.workspaceId, snapshot);
      const reloaded = await this.reloadOpenSessions([ws.workspaceId]);
      await this.host.refreshSessionCommandsForWorkspace(ws.workspaceId);
      const state = await this.host.refreshState({ clearLastError: true });
      return reloaded
        ? state
        : this.host.withError(
            t("Some open threads could not reload; they pick up the change when reopened."),
          );
    });
  }

  async setDefaultModel(
    workspaceId: string,
    provider: string,
    modelId: string,
  ): Promise<DesktopAppState> {
    const targetWorkspaceId = this.resolveModelSettingsWorkspaceId(workspaceId);
    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      return this.withRuntimeUpdate(targetWorkspaceId, (ws) =>
        this.host.runtimeSupervisor.setDefaultModel(ws, { provider, modelId }),
      );
    }
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(targetWorkspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: targetWorkspaceId }));
    }
    return this.host.withErrorHandling(async () => {
      const snapshot = await this.host.runtimeSupervisor.setProjectDefaultModel(ws, {
        provider,
        modelId,
      });
      await this.host.recordSettingsSelfWrite();
      this.host.setRuntimeSnapshot(ws.workspaceId, snapshot);
      return this.host.refreshState({ clearLastError: true });
    });
  }

  async setDefaultThinkingLevel(
    workspaceId: string,
    thinkingLevel: RuntimeSettingsSnapshot["defaultThinkingLevel"],
  ): Promise<DesktopAppState> {
    const targetWorkspaceId = this.resolveModelSettingsWorkspaceId(workspaceId);
    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      return this.withRuntimeUpdate(targetWorkspaceId, (ws) =>
        this.host.runtimeSupervisor.setDefaultThinkingLevel(ws, thinkingLevel),
      );
    }
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(targetWorkspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: targetWorkspaceId }));
    }
    return this.host.withErrorHandling(async () => {
      const snapshot = await this.host.runtimeSupervisor.setProjectDefaultThinkingLevel(
        ws,
        thinkingLevel,
      );
      await this.host.recordSettingsSelfWrite();
      this.host.setRuntimeSnapshot(ws.workspaceId, snapshot);
      return this.host.refreshState({ clearLastError: true });
    });
  }

  async loginProvider(
    workspaceId: string,
    providerId: string,
    callbacks: RuntimeLoginCallbacks,
  ): Promise<DesktopAppState> {
    await this.host.initialize();
    const targetWorkspaceId = this.resolveModelSettingsWorkspaceId(workspaceId);
    const ws = this.host.workspaceRefFromState(workspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: workspaceId }));
    }

    return this.host.withErrorHandling(async () => {
      const snapshot = await this.host.runtimeSupervisor.login(ws, providerId, callbacks);
      this.host.setRuntimeSnapshot(workspaceId, snapshot);
      await this.autoEnableModelsForConnectedProvider(targetWorkspaceId, providerId, snapshot);
      await this.host.refreshSessionCommandsForWorkspace(workspaceId);
      return this.host.refreshState({ clearLastError: true });
    });
  }

  async logoutProvider(workspaceId: string, providerId: string): Promise<DesktopAppState> {
    return this.withRuntimeUpdate(workspaceId, (ws) =>
      this.host.runtimeSupervisor.logout(ws, providerId),
    );
  }

  async setProviderApiKey(
    workspaceId: string,
    providerId: string,
    apiKey: string,
  ): Promise<DesktopAppState> {
    return this.withRuntimeUpdate(workspaceId, (ws) =>
      this.host.runtimeSupervisor.setProviderApiKey(ws, providerId, apiKey),
    );
  }

  async listCustomProviders(): Promise<readonly CustomProviderConfig[]> {
    await this.host.initialize();
    const entries = await this.host.runtimeSupervisor.listCustomProviders();
    return entries.map((entry) => ({
      providerId: entry.providerId,
      baseUrl: entry.baseUrl,
      ...(entry.apiKey !== undefined ? { apiKey: entry.apiKey } : {}),
      models: entry.models.map((model) => ({
        id: model.id,
        ...(model.contextWindow !== undefined ? { contextWindow: model.contextWindow } : {}),
      })),
    }));
  }

  async setCustomProvider(
    workspaceId: string,
    config: CustomProviderConfig,
  ): Promise<DesktopAppState> {
    return this.withRuntimeUpdate(
      workspaceId,
      (ws) =>
        this.host.runtimeSupervisor.setCustomProvider(ws, {
          providerId: config.providerId,
          baseUrl: config.baseUrl,
          ...(config.apiKey !== undefined ? { apiKey: config.apiKey } : {}),
          models: config.models.map((model) => ({
            id: model.id,
            ...(model.contextWindow !== undefined ? { contextWindow: model.contextWindow } : {}),
          })),
        }),
      { refreshAllWorkspaces: true },
    );
  }

  async deleteCustomProvider(workspaceId: string, providerId: string): Promise<DesktopAppState> {
    return this.withRuntimeUpdate(
      workspaceId,
      (ws) => this.host.runtimeSupervisor.deleteCustomProvider(ws, providerId),
      { refreshAllWorkspaces: true },
    );
  }

  async setEnableSkillCommands(workspaceId: string, enabled: boolean): Promise<DesktopAppState> {
    return this.withRuntimeUpdate(
      workspaceId,
      (ws) => this.host.runtimeSupervisor.setEnableSkillCommands(ws, enabled),
      { reloadSessions: true },
    );
  }

  async setScopedModelPatterns(
    workspaceId: string,
    patterns: readonly string[],
  ): Promise<DesktopAppState> {
    const targetWorkspaceId = this.resolveModelSettingsWorkspaceId(workspaceId);
    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      return this.withRuntimeUpdate(targetWorkspaceId, (ws) =>
        this.host.runtimeSupervisor.setScopedModelPatterns(ws, patterns),
      );
    }
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(targetWorkspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: targetWorkspaceId }));
    }
    return this.host.withErrorHandling(async () => {
      const snapshot = await this.host.runtimeSupervisor.setProjectScopedModelPatterns(
        ws,
        patterns,
      );
      await this.host.recordSettingsSelfWrite();
      this.host.setRuntimeSnapshot(ws.workspaceId, snapshot);
      return this.host.refreshState({ clearLastError: true });
    });
  }

  private async autoEnableModelsForConnectedProvider(
    workspaceId: string,
    providerId: string,
    snapshot: RuntimeSnapshot,
  ): Promise<void> {
    const providerModelPatterns = [
      ...new Set(
        snapshot.models
          .filter((model) => model.available && model.providerId === providerId)
          .map((model) => `${model.providerId}/${model.modelId}`),
      ),
    ];
    if (providerModelPatterns.length === 0) {
      return;
    }

    const currentPatterns = snapshot.settings.enabledModelPatterns;
    if (currentPatterns.length === 0) {
      return;
    }

    const nextPatterns = mergeEnabledModelPatterns(currentPatterns, providerModelPatterns);
    if (nextPatterns.length === currentPatterns.length) {
      return;
    }

    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      const ownerWorkspace = this.host.workspaceRefFromState(workspaceId);
      if (!ownerWorkspace) {
        return;
      }
      const updatedSnapshot = await this.host.runtimeSupervisor.setScopedModelPatterns(
        ownerWorkspace,
        nextPatterns,
      );
      this.host.setRuntimeSnapshot(workspaceId, updatedSnapshot);
      return;
    }

    const ownerWorkspace = this.host.workspaceRefFromState(workspaceId);
    if (!ownerWorkspace) {
      return;
    }
    const updatedSnapshot = await this.host.runtimeSupervisor.setProjectScopedModelPatterns(
      ownerWorkspace,
      nextPatterns,
    );
    this.host.setRuntimeSnapshot(workspaceId, updatedSnapshot);
  }

  async setSkillEnabled(
    workspaceId: string,
    filePath: string,
    enabled: boolean,
  ): Promise<DesktopAppState> {
    return this.withRuntimeUpdate(
      workspaceId,
      (ws) => this.host.runtimeSupervisor.setSkillEnabled(ws, filePath, enabled),
      { reloadSessions: true },
    );
  }

  async setExtensionEnabled(
    workspaceId: string,
    filePath: string,
    enabled: boolean,
  ): Promise<DesktopAppState> {
    const builtinName = this.host.runtimeSupervisor.builtinExtensionName(filePath);
    if (builtinName) {
      return this.setBuiltinExtensionEnabled(workspaceId, builtinName, enabled);
    }
    // pi's own add-ons (`builtin:mcp` …) are switched in pi's global settings, so every
    // workspace's runtime and threads pick the change up.
    const global = filePath.startsWith("builtin:");
    return this.withRuntimeUpdate(
      workspaceId,
      (ws) => this.host.runtimeSupervisor.setExtensionEnabled(ws, filePath, enabled),
      { reloadSessions: true, refreshAllWorkspaces: global },
    );
  }

  /** Built-in extension switches belong to pi-gui and apply to every workspace. */
  private async setBuiltinExtensionEnabled(
    workspaceId: string,
    name: string,
    enabled: boolean,
  ): Promise<DesktopAppState> {
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(workspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: workspaceId }));
    }
    const wasDisabled = this.host.isBuiltinExtensionDisabled(name);
    const setDisabled = (disabled: boolean) =>
      this.host.setBuiltinExtensionDisabled(name, disabled);
    setDisabled(!enabled);
    try {
      await this.host.persistUiState();
    } catch (error) {
      // New sessions read the set directly, so an unsaved change must not stay in effect.
      setDisabled(wasDisabled);
      return this.host.withError(error);
    }

    return this.host.withErrorHandling(async () => {
      const snapshot = await this.host.runtimeSupervisor.refreshRuntime(ws);
      await this.refreshRuntimeForAllWorkspaces(workspaceId, snapshot);
      const reloaded = await this.reloadOpenSessions(
        this.host.settingsState().workspaces.map((workspace) => workspace.id),
      );
      await this.refreshSessionCommandsForAllWorkspaces();
      const state = await this.host.refreshState({ clearLastError: true });
      return reloaded
        ? state
        : this.host.withError(
            t(
              "Some open threads could not reload; they pick up the pi-gui tools change when reopened.",
            ),
          );
    });
  }

  /** Reload idle threads independently; busy threads defer reload until their turn ends. */
  private async reloadOpenSessions(workspaceIds: readonly string[]): Promise<boolean> {
    const reloads = await Promise.allSettled(
      workspaceIds
        .flatMap((workspaceId) => this.host.sessionRefsForWorkspace(workspaceId))
        // The driver resets the thread's extension UI as it reloads (a "reset" host UI
        // request, before the extensions start again), whether now or after the turn.
        .map((sessionRef) => this.host.reloadSessionWhenIdle(sessionRef)),
    );
    const failed = reloads.filter((result) => result.status === "rejected");
    for (const result of failed) {
      console.error("[app-store] reloading open threads failed", result.reason);
    }
    return failed.length === 0;
  }

  async listMcpServers(workspaceId: string): Promise<McpServersSnapshot> {
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(workspaceId);
    if (!ws) {
      throw new Error(t("Unknown workspace: {{value0}}", { value0: workspaceId }));
    }
    const listing = this.host.runtimeSupervisor.listMcpServers(ws);
    return {
      globalConfigPath: withHomeAsTilde(listing.globalConfigPath),
      servers: listing.servers.map((server) => ({ ...server })),
      errors: [...listing.errors],
      codemodeAlwaysOn: await this.host.runtimeSupervisor.getCodemodeAlwaysOn(ws),
    };
  }

  async addMcpServer(workspaceId: string, server: NewMcpServerInput): Promise<DesktopAppState> {
    // The global file reaches every folder, so a clash with any folder's project file counts.
    return this.withMcpConfigChange(workspaceId, "global", (ws) =>
      this.host.runtimeSupervisor.addMcpServer(
        ws,
        server,
        this.host.settingsState().workspaces.flatMap((workspace) => {
          const ref = this.host.workspaceRefFromState(workspace.id);
          return ref && ref.workspaceId !== ws.workspaceId ? [ref] : [];
        }),
      ),
    );
  }

  async removeMcpServer(workspaceId: string, name: string): Promise<DesktopAppState> {
    return this.withMcpConfigChange(workspaceId, "global", () =>
      this.host.runtimeSupervisor.removeMcpServer(name),
    );
  }

  async setMcpServerEnabled(
    workspaceId: string,
    scope: McpServerScope,
    name: string,
    enabled: boolean,
  ): Promise<DesktopAppState> {
    return this.withMcpConfigChange(workspaceId, scope, (ws) =>
      this.host.runtimeSupervisor.setMcpServerEnabled(ws, scope, name, enabled),
    );
  }

  async setCodemodeAlwaysOn(workspaceId: string, alwaysOn: boolean): Promise<DesktopAppState> {
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(workspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: workspaceId }));
    }
    return this.host.withErrorHandling(async () => {
      await this.host.runtimeSupervisor.setCodemodeAlwaysOn(ws, alwaysOn);
      await this.host.recordSettingsSelfWrite();
      // pi's reload turns on tools newly added to defaultTools but leaves removed ones on, so
      // only switching on reaches open threads (a thread mid-turn picks it up when it ends).
      const reloaded = alwaysOn
        ? await this.reloadOpenSessions(
            this.host.settingsState().workspaces.map((workspace) => workspace.id),
          )
        : true;
      const state = await this.host.refreshState({ clearLastError: true });
      return reloaded
        ? state
        : this.host.withError(
            t("Some open threads could not reload; they get code mode when reopened."),
          );
    });
  }

  private async withMcpConfigChange(
    workspaceId: string,
    scope: McpServerScope,
    change: (ws: WorkspaceRef) => void | Promise<void>,
  ): Promise<DesktopAppState> {
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(workspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: workspaceId }));
    }
    return this.host.withErrorHandling(async () => {
      await change(ws);
      const workspaceIds =
        scope === "global"
          ? this.host.settingsState().workspaces.map((workspace) => workspace.id)
          : [workspaceId];
      const reloaded = await this.reloadOpenSessions(workspaceIds);
      await Promise.all(workspaceIds.map((id) => this.host.refreshSessionCommandsForWorkspace(id)));
      const state = await this.host.refreshState({ clearLastError: true });
      return reloaded
        ? state
        : this.host.withError(
            t("Some open threads could not reload; they pick up the MCP change when reopened."),
          );
    });
  }

  private async withRuntimeUpdate(
    workspaceId: string,
    action: (ws: WorkspaceRef) => Promise<RuntimeSnapshot>,
    options?: {
      readonly reloadSessions?: boolean;
      readonly refreshAllWorkspaces?: boolean;
    },
  ): Promise<DesktopAppState> {
    await this.host.initialize();
    const ws = this.host.workspaceRefFromState(workspaceId);
    if (!ws) {
      return this.host.withError(t("Unknown workspace: {{value0}}", { value0: workspaceId }));
    }

    return this.host.withErrorHandling(async () => {
      const snapshot = await action(ws);
      // The action just flushed settings files that focus reconcile watches by mtime; record the
      // new mtimes so this self-write is not mistaken for an external edit on the next focus.
      await this.host.recordSettingsSelfWrite();
      if (options?.refreshAllWorkspaces) {
        await this.refreshRuntimeForAllWorkspaces(workspaceId, snapshot);
      } else {
        this.host.setRuntimeSnapshot(workspaceId, snapshot);
      }
      const reloaded = options?.reloadSessions
        ? await this.reloadOpenSessions(
            options.refreshAllWorkspaces
              ? this.host.settingsState().workspaces.map((workspace) => workspace.id)
              : [workspaceId],
          )
        : true;
      if (options?.refreshAllWorkspaces) {
        await this.refreshSessionCommandsForAllWorkspaces();
      } else {
        await this.host.refreshSessionCommandsForWorkspace(workspaceId);
      }
      const state = await this.host.refreshState({ clearLastError: true });
      return reloaded
        ? state
        : this.host.withError(
            t("Some open threads could not reload; they pick up the change when reopened."),
          );
    });
  }

  private async refreshRuntimeForAllWorkspaces(
    updatedWorkspaceId: string,
    updatedSnapshot: RuntimeSnapshot,
  ): Promise<void> {
    this.host.setRuntimeSnapshot(updatedWorkspaceId, updatedSnapshot);
    const workspacesToRefresh = this.host
      .settingsState()
      .workspaces.filter((workspace) => workspace.id !== updatedWorkspaceId);
    const snapshots = await Promise.allSettled(
      workspacesToRefresh.map(async (workspace) => {
        const runtime = await this.host.runtimeSupervisor.refreshRuntime({
          workspaceId: workspace.id,
          path: workspace.path,
          displayName: workspace.name,
        });
        return [workspace, runtime] as const;
      }),
    );
    snapshots.forEach((result, index) => {
      const workspace = workspacesToRefresh[index];
      if (result.status === "fulfilled") {
        this.host.setRuntimeSnapshot(result.value[0].id, result.value[1]);
        return;
      }
      console.warn(
        `[pi-gui] Failed to refresh runtime for ${workspace?.path ?? "unknown workspace"} after custom provider update: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`,
      );
    });
  }

  private async refreshSessionCommandsForAllWorkspaces(): Promise<void> {
    const results = await Promise.allSettled(
      this.host
        .settingsState()
        .workspaces.map((workspace) => this.host.refreshSessionCommandsForWorkspace(workspace.id)),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        return;
      }
      const workspace = this.host.settingsState().workspaces[index];
      console.warn(
        `[pi-gui] Failed to refresh session commands for ${workspace?.path ?? "unknown workspace"} after custom provider update: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`,
      );
    });
  }

  private resolveModelSettingsWorkspaceId(workspaceId: string): string {
    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      return workspaceId;
    }
    return resolveRepoWorkspaceId(this.host.settingsState().workspaces, workspaceId) ?? workspaceId;
  }

  async loadLiveGlobalModelSettings(
    workspaces: readonly { workspaceId: string; path: string; displayName: string }[],
    preferredWorkspaceId?: string,
  ): Promise<ModelSettingsSnapshot> {
    const fallbackWorkspace =
      (preferredWorkspaceId
        ? workspaces.find((entry) => entry.workspaceId === preferredWorkspaceId)
        : undefined) ?? workspaces[0];
    if (!fallbackWorkspace) {
      return this.host.settingsState().globalModelSettings;
    }
    return this.host.runtimeSupervisor.getGlobalModelSettings({
      workspaceId: fallbackWorkspace.workspaceId,
      path: fallbackWorkspace.path,
      displayName: fallbackWorkspace.displayName,
    });
  }

  async buildCreateSessionOptions(workspaceId: string): Promise<CreateSessionOptions | undefined> {
    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      return undefined;
    }
    const effectiveSettings = await this.loadEffectiveModelSettingsForWorkspace(workspaceId);
    if (!effectiveSettings) {
      return undefined;
    }
    return {
      ...(effectiveSettings.defaultProvider && effectiveSettings.defaultModelId
        ? {
            initialModel: {
              provider: effectiveSettings.defaultProvider,
              modelId: effectiveSettings.defaultModelId,
            },
          }
        : {}),
      ...(effectiveSettings.defaultThinkingLevel
        ? { initialThinkingLevel: effectiveSettings.defaultThinkingLevel }
        : {}),
    };
  }

  async loadScopedModelSettingsByWorkspace(
    workspaces: DesktopAppState["workspaces"],
    workspaceRefs: readonly { workspaceId: string; path: string; displayName: string }[],
    globalModelSettings: ModelSettingsSnapshot,
  ): Promise<Record<string, ModelSettingsSnapshot>> {
    const uniqueOwnerIds = [
      ...new Set(
        workspaces.map(
          (workspace) => resolveRepoWorkspaceId(workspaces, workspace.id) ?? workspace.id,
        ),
      ),
    ];
    const refsByWorkspaceId = new Map(
      workspaceRefs.map((workspace) => [workspace.workspaceId, workspace] as const),
    );
    const ownerSettings = await Promise.all(
      uniqueOwnerIds.map(async (workspaceId) => {
        const workspace = refsByWorkspaceId.get(workspaceId);
        if (!workspace) {
          return undefined;
        }
        return [
          workspaceId,
          mergeModelSettingsSnapshot(
            globalModelSettings,
            await readProjectModelSettingsFile(workspace.path),
          ),
        ] as const;
      }),
    );

    return Object.fromEntries(
      ownerSettings.filter((entry): entry is readonly [string, ModelSettingsSnapshot] =>
        Boolean(entry),
      ),
    );
  }

  serializeEffectiveRuntimeState(
    workspaces: DesktopAppState["workspaces"],
    scopedModelSettingsByWorkspace?: Record<string, ModelSettingsSnapshot>,
  ): Record<string, RuntimeSnapshot> {
    const runtimeByWorkspace = this.host.runtimeSnapshots();
    if (this.host.settingsState().modelSettingsScopeMode !== "per-repo") {
      return runtimeByWorkspace;
    }

    for (const workspace of workspaces) {
      const ownerWorkspaceId = resolveRepoWorkspaceId(workspaces, workspace.id);
      const workspaceRuntime = runtimeByWorkspace[workspace.id];
      const modelSettings = ownerWorkspaceId
        ? scopedModelSettingsByWorkspace?.[ownerWorkspaceId]
        : undefined;
      if (!workspaceRuntime || !modelSettings) {
        continue;
      }
      runtimeByWorkspace[workspace.id] = applyModelSettingsSnapshot(
        workspaceRuntime,
        modelSettings,
      );
    }

    return runtimeByWorkspace;
  }

  private async loadEffectiveModelSettingsForWorkspace(
    workspaceId: string,
  ): Promise<ModelSettingsSnapshot | undefined> {
    const ownerWorkspaceId = this.resolveModelSettingsWorkspaceId(workspaceId);
    const ownerWorkspace = this.host.workspaceRefFromState(ownerWorkspaceId);
    if (!ownerWorkspace) {
      return undefined;
    }
    const globalModelSettings =
      this.host.settingsState().modelSettingsScopeMode === "per-repo" &&
      hasStoredModelSettings(this.host.settingsState().globalModelSettings)
        ? this.host.settingsState().globalModelSettings
        : await this.loadLiveGlobalModelSettings(
            this.host.settingsState().workspaces.map((workspace) => ({
              workspaceId: workspace.id,
              path: workspace.path,
              displayName: workspace.name,
            })),
            ownerWorkspaceId,
          );
    return mergeModelSettingsSnapshot(
      globalModelSettings,
      await readProjectModelSettingsFile(ownerWorkspace.path),
    );
  }

  async restoreGlobalModelSettings(
    settings: ModelSettingsSnapshot,
    workspaces?: readonly { workspaceId: string; path: string; displayName: string }[],
    preferredWorkspaceId?: string,
  ): Promise<void> {
    if (!hasStoredModelSettings(settings)) {
      return;
    }
    const workspaceRefs =
      workspaces ??
      this.host.settingsState().workspaces.map((workspace) => ({
        workspaceId: workspace.id,
        path: workspace.path,
        displayName: workspace.name,
      }));
    const fallbackWorkspace =
      (preferredWorkspaceId
        ? workspaceRefs.find((entry) => entry.workspaceId === preferredWorkspaceId)
        : undefined) ?? workspaceRefs[0];
    if (!fallbackWorkspace) {
      return;
    }
    const workspaceRef = {
      workspaceId: fallbackWorkspace.workspaceId,
      path: fallbackWorkspace.path,
      displayName: fallbackWorkspace.displayName,
    };
    await this.host.runtimeSupervisor.setScopedModelPatterns(
      workspaceRef,
      settings.enabledModelPatterns,
    );
    if (settings.defaultThinkingLevel) {
      await this.host.runtimeSupervisor.setDefaultThinkingLevel(
        workspaceRef,
        settings.defaultThinkingLevel,
      );
    }
    if (settings.defaultProvider && settings.defaultModelId) {
      await this.host.runtimeSupervisor.setDefaultModel(workspaceRef, {
        provider: settings.defaultProvider,
        modelId: settings.defaultModelId,
      });
    }
    if (this.host.hasRuntimeSnapshot(workspaceRef.workspaceId)) {
      this.host.setRuntimeSnapshot(
        workspaceRef.workspaceId,
        await this.host.runtimeSupervisor.refreshRuntime(workspaceRef),
      );
    }
  }
}
