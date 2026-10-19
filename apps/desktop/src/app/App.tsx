import { useConversationPresentation } from "./use-conversation-presentation";
import { useAppNavigation } from "./use-app-navigation";
import { useAppAppearance } from "./use-app-appearance";
import { useAppThreadSwitcher } from "./use-app-thread-switcher";
import { NewThreadSurface } from "./new-thread-surface";
import { AppWorkbench } from "./app-workbench";
import { Button } from "../components/ui/button";
import { t, i18n } from "../../i18n";
import { useLocale } from "../ui/use-locale";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SecondarySurfaces } from "./lazy-surfaces";
import type { RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import { getSelectedSession, type CreateScheduledTaskInput } from "../../contracts/desktop-state";
import { updateSnapshot, useDesktopAppState } from "./desktop-app-state";
import {
  DesktopStartupSurface,
  WorkspaceRefreshNotice,
  toStartupSurfaceState,
} from "./desktop-recovery";
import { buildFileWorkbenchContexts } from "./file-workbench-contexts";
import { canTogglePrimarySidebar } from "./app-shell-utils";
import { useDesktopCommands } from "./use-desktop-commands";
import { useRunningLabel } from "../features/conversation/hooks/use-running-label";
import { formatRelativeTime } from "../lib/string-utils";
import { restoreTopmostDialogFocus } from "../ui/dialog-focus";
import { ComposerPanel } from "../features/conversation/composer-panel";
import type { DiffPanelFileRequest } from "../features/workbench/diff-panel-types";
import { useWorkbench } from "../features/workbench/use-workbench";
import { useExtensionViews } from "../features/extensions/use-extension-views";
import { useExtensionCardActions } from "../features/extensions/use-extension-card-actions";
import { useExtensionHostActions } from "../features/extensions/use-extension-host-actions";
import { useExtensionToolLabels } from "../features/extensions/extension-tool-labels";
import { useSidePanelTabHintsVisible } from "../features/workbench/side-panel-tab-hints";
import { useWorkbenchWidth } from "../features/workbench/use-workbench-width";
import type { WorkspaceFileLine } from "../features/conversation/workspace-file-line";
import { buildModelOptions } from "../features/conversation/composer-commands";
import { getDesktopShortcutLabel } from "../../contracts/ipc";
import { CommandPaletteSurface } from "../features/command-palette/command-palette-surface";
import { deriveModelOnboardingState } from "../features/settings/model-onboarding";
import { buildThreadSidebarModel, type ThreadListEntry } from "../features/threads/thread-groups";
import { Sidebar } from "../features/threads/sidebar";
import { ThreadSwitcher } from "../features/threads/thread-switcher";
import { SidebarToggleButton } from "../features/threads/sidebar-toggle-button";
import { Topbar } from "./topbar";
import { ConversationTimeline } from "../features/conversation/conversation-timeline";
import { ScheduledTasksView } from "../features/scheduled-tasks/scheduled-tasks-view";
import {
  ScheduledTaskEditor,
  type ScheduledEditorState,
} from "../features/scheduled-tasks/scheduled-task-editor";
import { ScheduledTaskChip } from "../features/scheduled-tasks/scheduled-task-chip";
import { useSlashMenu } from "../features/conversation/hooks/use-slash-menu";
import { useMentionMenu } from "../features/conversation/hooks/use-mention-menu";
import { useWorkspaceMenu } from "../features/threads/hooks/use-workspace-menu";
import { useThreadActions } from "../features/threads/hooks/use-thread-actions";
import { ThreadActionsMenu } from "../features/threads/thread-actions";
import { useNewThreadController } from "../features/threads/hooks/use-new-thread-controller";
import {
  buildExtensionDockModel,
  ExtensionDialog,
  hasExtensionDockContent,
  useDismissibleExtensionDock,
} from "../features/extensions/extension-session-ui";
import { PinnedCards } from "../features/extensions/pinned-cards";
import { TreeModal } from "../features/conversation/tree-modal";
import { ForkModal } from "../features/conversation/fork-modal";
import { getEffectiveModelRuntime } from "../features/settings/model-settings";
import { deriveWorkspaceContext } from "./workspace-context";
import { useTreeForkModals } from "../features/conversation/hooks/use-tree-fork-modals";
import { useComposerDraftSync } from "../features/conversation/hooks/use-composer-draft-sync";
import { useSessionComposer } from "../features/conversation/hooks/use-session-composer";
import { useTranscriptAnnotations } from "../features/conversation/annotations/use-transcript-annotations";
export default function App() {
  useLocale();
  const desktop = useDesktopAppState();
  const workbenchWidth = useWorkbenchWidth();
  const snapshot = desktop.snapshot;
  const setSnapshot = desktop.setSnapshot;
  const [dockExpandedBySession, setDockExpandedBySession] = useState<Record<string, string>>({});
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [diffFileRequest, setDiffFileRequest] = useState<{
    readonly sessionKey: string;
    readonly request: DiffPanelFileRequest;
  } | null>(null);
  const [scheduledEditor, setScheduledEditor] = useState<ScheduledEditorState | null>(null);
  const api = window.piApp;
  const extensionViewTheme = useAppAppearance(snapshot);

  const {
    activeWorktrees,
    linkedWorktreeByWorkspaceId,
    rootWorkspace,
    rootWorkspaceOptions,
    selectedWorkspace,
    visibleWorkspaces,
  } = useMemo(() => deriveWorkspaceContext(snapshot), [snapshot, i18n.language]);
  const {
    settingsSection,
    setSettingsSection,
    settingsWorkspaceId,
    setSettingsWorkspaceId,
    skillsWorkspaceId,
    setSkillsWorkspaceId,
    extensionsWorkspaceId,
    setExtensionsWorkspaceId,
    openSettings,
    openSkills,
    openExtensions,
    setActiveView,
  } = useAppNavigation({ api, setSnapshot, rootWorkspaceOptions });
  const selectedSession = snapshot
    ? (getSelectedSession(snapshot) ?? selectedWorkspace?.sessions[0])
    : undefined;
  const selectedRuntime = selectedWorkspace
    ? snapshot?.runtimeByWorkspace[selectedWorkspace.id]
    : undefined;
  const extensionToolLabels = useExtensionToolLabels(selectedRuntime);
  const selectedModelRuntime = snapshot
    ? getEffectiveModelRuntime(snapshot, selectedWorkspace)
    : undefined;
  const selectedWorktree = selectedWorkspace
    ? linkedWorktreeByWorkspaceId.get(selectedWorkspace.id)
    : undefined;
  const selectedModelOptions = buildModelOptions(selectedModelRuntime);
  const selectedDefaultEnabled = selectedModelOptions.some(
    (m) =>
      m.providerId === selectedModelRuntime?.settings.defaultProvider &&
      m.modelId === selectedModelRuntime?.settings.defaultModelId,
  );
  const resolvedSessionProvider =
    selectedSession?.config?.provider ??
    (selectedDefaultEnabled ? selectedModelRuntime?.settings.defaultProvider : undefined);
  const resolvedSessionModelId =
    selectedSession?.config?.modelId ??
    (selectedDefaultEnabled ? selectedModelRuntime?.settings.defaultModelId : undefined);
  const resolvedSessionThinkingLevel =
    selectedSession?.config?.thinkingLevel ?? selectedModelRuntime?.settings.defaultThinkingLevel;
  const selectedSessionModelOnboarding = deriveModelOnboardingState(selectedModelRuntime, {
    provider: resolvedSessionProvider,
    modelId: resolvedSessionModelId,
  });
  const queuedComposerMessages = snapshot?.queuedComposerMessages ?? [];
  const editingQueuedMessageId = snapshot?.editingQueuedMessageId;
  const runningLabel = useRunningLabel(
    selectedSession?.status === "running" ? selectedSession.runningSince : undefined,
  );
  const selectedSessionKey =
    selectedWorkspace && selectedSession ? `${selectedWorkspace.id}:${selectedSession.id}` : "";
  const workbenchTarget = useMemo(
    () =>
      selectedWorkspace && selectedSession
        ? { workspaceId: selectedWorkspace.id, sessionId: selectedSession.id }
        : null,
    [selectedWorkspace?.id, selectedSession?.id, i18n.language],
  );
  const {
    composerDraft,
    setComposerDraft,
    composerDraftRef,
    flushComposerDraft,
    flushComposerDraftAsync,
  } = useComposerDraftSync({ api, snapshot, selectedSession: workbenchTarget });
  const extensionViews = useExtensionViews({ api, target: workbenchTarget });
  const workbench = useWorkbench({ api, target: workbenchTarget });
  // Tracked while the panel is closed too, so a chord that opens it shows the hints.
  const sidePanelTabHintsVisible = useSidePanelTabHintsVisible(api?.platform ?? "linux");
  const workbenchTargetRef = useRef(workbenchTarget);
  workbenchTargetRef.current = workbenchTarget;
  const extensionHostActions = useExtensionHostActions({
    api,
    target: workbenchTarget,
    workbench,
    flushComposerDraftAsync,
  });
  const workbenchRef = useRef(workbench);
  workbenchRef.current = workbench;
  const selectedToolId =
    workbench.view.selection.kind === "tool" ? workbench.view.selection.toolId : null;
  const sidePanelAvailable = snapshot?.activeView === "threads" && Boolean(workbenchTarget);
  const sidePanelVisible = sidePanelAvailable && workbench.view.visibility === "visible";
  const {
    pins,
    scheduledOrigins,
    scheduledBinding,
    transcriptFailed,
    isTranscriptLoading,
    turnChanges,
    viewport,
    threadSearch,
    showSchemaSkewNotice,
    dismissSchemaSkewNotice,
  } = useConversationPresentation({
    desktop,
    api,
    selectedWorkspace,
    selectedSession,
    selectedSessionKey,
    workbenchTarget,
    workbench,
  });
  const selectedSessionCommands = selectedSession
    ? (snapshot?.sessionCommandsBySession[selectedSessionKey] ?? [])
    : [];
  const selectedExtensionUi = selectedSession
    ? snapshot?.sessionExtensionUiBySession[selectedSessionKey]
    : undefined;
  const selectedWorkspaceCommandCompatibility = selectedWorkspace
    ? (snapshot?.extensionCommandCompatibilityByWorkspace[selectedWorkspace.id] ?? [])
    : [];
  const fileWorkbenchContexts = useMemo(
    () =>
      buildFileWorkbenchContexts({
        workspaces: snapshot?.workspaces ?? [],
        selectedWorkspace,
        selectedSessionTitle: selectedExtensionUi?.title || selectedSession?.title,
        rootWorkspace,
        activeWorktrees,
      }),
    [
      activeWorktrees,
      rootWorkspace,
      selectedExtensionUi?.title,
      selectedSession?.title,
      selectedWorkspace,
      snapshot?.workspaces,
      ,
      i18n.language,
    ],
  );
  const selectedExtensionDock = useMemo(
    () => buildExtensionDockModel(selectedExtensionUi),
    [selectedExtensionUi, i18n.language],
  );
  const shownExtensionDock = useDismissibleExtensionDock(
    selectedSessionKey,
    selectedExtensionUi,
    selectedExtensionDock,
  );
  const displayedSessionTitle = selectedExtensionUi?.title ?? selectedSession?.title ?? "";
  const activeExtensionDialog = selectedExtensionUi?.pendingDialogs[0];
  const selectedExtensionUiInstance =
    snapshot?.sessionExtensionUiBySession[selectedSessionKey]?.instanceId;
  const isSelectedExtensionDockExpanded =
    selectedExtensionUiInstance !== undefined &&
    dockExpandedBySession[selectedSessionKey] === selectedExtensionUiInstance;
  const threadSidebarModel = useMemo(
    () => (snapshot ? buildThreadSidebarModel(snapshot) : undefined),
    [snapshot, i18n.language],
  );
  const { threadSwitcher, selectThreadRef } = useAppThreadSwitcher(
    threadSidebarModel,
    snapshot?.activeView === "threads" ? selectedSessionKey : "",
  );
  const threadShortcutOrderRef = useRef<readonly ThreadListEntry[] | null>(null);
  const focusComposer = () => {
    window.requestAnimationFrame(() => {
      if (restoreTopmostDialogFocus()) {
        return;
      }
      composerRef.current?.focus();
    });
  };
  const handleViewFileInDiff = useCallback(
    (path: string) => {
      const workspace = selectedWorkspaceRef.current;
      if (!workspace) return;
      const current = workbenchRef.current;
      current.setChanges({
        workspaceId: workspace.id,
        selectedPath: path,
        scope: { kind: "uncommitted" },
      });
      current.openTool({ kind: "changes" });
      setDiffFileRequest({
        sessionKey: selectedSessionKeyRef.current,
        request: { workspaceId: workspace.id, path, nonce: Date.now() },
      });
    },
    [i18n.language],
  );
  const selectedSessionKeyRef = useRef(selectedSessionKey);
  selectedSessionKeyRef.current = selectedSessionKey;
  const selectedWorkspaceRef = useRef(selectedWorkspace);
  selectedWorkspaceRef.current = selectedWorkspace;
  // Snapshot ticks replace selectedWorkspace. A new callback identity reparses every
  // visible assistant message and drops stick-to-bottom while a reply is streaming.
  const handleOpenWorkspaceFileLine = useCallback(
    (target: WorkspaceFileLine) => {
      const workspace = selectedWorkspaceRef.current;
      if (!api || !workspace) {
        return;
      }
      void workbenchRef.current
        .openFile({
          workspaceId: workspace.id,
          path: target.path,
          line: target.line,
          endLine: target.endLine,
        })
        .catch(() => {
          // Missing, unreadable, or outside the workspace: leave the panel unchanged.
        });
    },
    [api, i18n.language],
  );
  const runExtensionCardAction = useExtensionCardActions({
    api,
    target: workbenchTarget,
    openWorkspaceFileLine: handleOpenWorkspaceFileLine,
    composerDraftRef,
    setComposerDraft,
    focusComposer,
  });

  const {
    treeModalState,
    forkModalState,
    closeTreeModal,
    openTreeModal,
    navigateTreeSelection,
    closeForkModal,
    openForkModal,
    handleForkSubmit,
    canUseWorktree,
  } = useTreeForkModals({
    api,
    snapshot,
    setSnapshot,
    selectedWorkspace,
    selectedSession,
    selectedSessionKey,
    rootWorkspace,
    activeView: snapshot?.activeView,
    setComposerDraft,
    focusComposer,
  });

  const slashMenu = useSlashMenu({
    composerDraft,
    setComposerDraft,
    selectedRuntime,
    selectedModelRuntime,
    sessionCommands: selectedSessionCommands,
    commandCompatibility: selectedWorkspaceCommandCompatibility,
    selectedSessionKey,
    selectedSession,
    selectedWorkspace,
    isRunning: selectedSession?.status === "running",
    api,
    setSnapshot,
    focusComposer,
    openSettings,
    updateSnapshot,
    allowTreeCommand: true,
    onRunTreeCommand: openTreeModal,
  });

  const enableSelectedMentionExtension = useCallback(
    (filePath: string) => {
      if (!api || !selectedWorkspace) {
        return Promise.resolve();
      }
      return updateSnapshot(setSnapshot, () =>
        api.setExtensionEnabled(selectedWorkspace.id, filePath, true),
      ).then(() => undefined);
    },
    [api, selectedWorkspace, i18n.language],
  );

  const mentionMenu = useMentionMenu({
    composerDraft,
    setComposerDraft,
    composerRef,
    workspaceId: selectedWorkspace?.id,
    runtime: selectedRuntime,
    api,
    onEnableExtension: enableSelectedMentionExtension,
  });

  const wsMenu = useWorkspaceMenu({
    api,
    setSnapshot,
    updateSnapshot,
  });
  const threadMenu = useThreadActions({
    api,
    setSnapshot,
    updateSnapshot,
    scheduledTasks: snapshot?.scheduledTasks ?? [],
    sidebarCollapsed: snapshot?.sidebarCollapsed ?? false,
    openScheduledEditor: setScheduledEditor,
    flushComposerDraft,
  });

  const newThread = useNewThreadController({
    api,
    snapshot,
    setSnapshot,
    rootWorkspace,
    rootWorkspaceOptions,
    visibleWorkspaces,
    selectedWorkspace,
    openSettings,
    flushComposerDraft,
  });

  const transcriptAnnotations = useTranscriptAnnotations(selectedSessionKey);
  const {
    composerAttachments,
    submitComposerDraft,
    stopCurrentRun,
    handlePickAttachments,
    handleRemoveAttachment,
    handleEditQueuedMessage,
    handleCancelQueuedEdit,
    handleRemoveQueuedMessage,
    handleSteerQueuedMessage,
    handleComposerPaste,
    handleComposerDrop,
    handlePastedClipboardImage,
    handleComposerKeyDown,
  } = useSessionComposer({
    api,
    snapshot,
    setSnapshot,
    selectedSession,
    composerDraft,
    setComposerDraft,
    composerDraftRef,
    flushComposerDraft,
    composerRef,
    requiresModelSelection: selectedSessionModelOnboarding.requiresModelSelection,
    openTreeModal,
    handleMentionKeyDown: mentionMenu.handleMentionKeyDown,
    handleSlashKeyDown: slashMenu.handleSlashKeyDown,
    newThreadComposerRef: newThread.composerRef,
    appendNewThreadAttachment: newThread.appendAttachment,
    onNewThreadComposerError: newThread.setComposerError,
    annotations: transcriptAnnotations,
  });

  useEffect(() => {
    const sessionExtensionUiBySession = snapshot?.sessionExtensionUiBySession;
    if (!sessionExtensionUiBySession) {
      setDockExpandedBySession((current) => (Object.keys(current).length > 0 ? {} : current));
      return;
    }

    setDockExpandedBySession((current) => {
      let next: Record<string, string> | undefined;
      for (const [sessionKey, instanceId] of Object.entries(current)) {
        if (
          sessionExtensionUiBySession[sessionKey]?.instanceId === instanceId &&
          hasExtensionDockContent(sessionExtensionUiBySession[sessionKey])
        ) {
          continue;
        }
        if (!next) {
          next = { ...current };
        }
        delete next[sessionKey];
      }
      return next ?? current;
    });
  }, [snapshot?.sessionExtensionUiBySession]);

  const primarySidebarToggleVisible = canTogglePrimarySidebar(snapshot?.activeView);
  const sidebarToggleShortcutLabel = api ? getDesktopShortcutLabel(api.platform, "B") : "";

  const selectedThreadTarget =
    snapshot?.activeView === "threads" && selectedWorkspace && selectedSession
      ? { workspaceId: selectedWorkspace.id, sessionId: selectedSession.id }
      : undefined;
  const selectedThreadActions =
    selectedThreadTarget && selectedSession
      ? threadMenu.actionsFor({
          workspaceId: selectedThreadTarget.workspaceId,
          session: selectedSession,
        })
      : undefined;
  const selectedRootWorkspaceId = selectedWorkspace?.rootWorkspaceId ?? selectedWorkspace?.id;
  const commands = useDesktopCommands({
    api,
    snapshot,
    setSnapshot,
    hasWorkspace: rootWorkspaceOptions.length > 0,
    selectedRootWorkspaceId,
    selectedThread: selectedThreadActions
      ? { actions: selectedThreadActions, canSwitchModel: selectedModelOptions.length > 0 }
      : undefined,
    threadSidebarModel,
    threadShortcutOrderRef,
    selectThread: (target) => selectThreadRef.current(target),
    threadSearch,
    workbench,
    sidePanelAvailable,
    sidePanelVisible,
    selectedToolId,
    extensionViews: extensionViews.views,
    openNewThread: newThread.openSurface,
    openSettings,
    openSkills,
    openExtensions,
    setActiveView,
  });

  useEffect(() => {
    const removeWorkspacePickedListener = window.piApp?.onWorkspacePicked?.((workspaceId) => {
      newThread.setPendingWorkspaceId(workspaceId);
      newThread.resetSurface();
    });
    const removeClipboardImageListener = window.piApp?.onClipboardImagePasted?.(
      handlePastedClipboardImage,
    );
    return () => {
      removeWorkspacePickedListener?.();
      removeClipboardImageListener?.();
    };
  }, [handlePastedClipboardImage, newThread]);

  useEffect(() => {
    // The composer is keyed by session: focus only after its new node commits.
    // An IPC completion can precede that commit and focus the outgoing node.
    if (snapshot?.activeView !== "threads" || !selectedSessionKey) return;
    if (!restoreTopmostDialogFocus()) composerRef.current?.focus();
  }, [selectedSessionKey, snapshot?.activeView]);

  if (!api || desktop.view.kind !== "ready" || !snapshot) {
    return (
      <DesktopStartupSurface
        state={toStartupSurfaceState(desktop.view)}
        onRetry={desktop.retry}
        onRelaunch={desktop.canRelaunch ? desktop.relaunch : undefined}
      />
    );
  }

  const secondarySurfaceView =
    snapshot.activeView === "settings" ||
    snapshot.activeView === "skills" ||
    snapshot.activeView === "extensions"
      ? snapshot.activeView
      : null;
  const filesWorkspace = snapshot.workspaces.find(
    (workspace) => workspace.id === workbench.view.files.workspaceId,
  );
  const filesWorktree = filesWorkspace
    ? linkedWorktreeByWorkspaceId.get(filesWorkspace.id)
    : undefined;
  const mainClassName = [
    "main",
    sidePanelVisible ? "main--with-side-panel" : "",
    snapshot.startupDiagnostics.length > 0 ? "main--with-startup-diagnostics" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const handleSetSessionModel = (provider: string, modelId: string) => {
    if (!selectedWorkspace || !selectedSession) {
      return;
    }
    void updateSnapshot(setSnapshot, () =>
      api.setSessionModel(selectedWorkspace.id, selectedSession.id, provider, modelId),
    ).catch((error: unknown) => {
      console.error("[renderer] updateSnapshot failed", error);
    });
  };

  const handleSetSessionThinking = (level: string) => {
    if (!selectedWorkspace || !selectedSession) {
      return;
    }
    void updateSnapshot(setSnapshot, () =>
      api.setSessionThinkingLevel(
        selectedWorkspace.id,
        selectedSession.id,
        level as NonNullable<RuntimeSnapshot["settings"]["defaultThinkingLevel"]>,
      ),
    ).catch((error: unknown) => {
      console.error("[renderer] updateSnapshot failed", error);
    });
  };

  const handleTrySkill = (command: string) => {
    void updateSnapshot(setSnapshot, () => api.setActiveView("threads")).catch((error: unknown) => {
      console.error("[renderer] setActiveView failed", error);
    });
    slashMenu.fillComposerFromSlash(command);
  };

  const handleSelectSession = (target: { workspaceId: string; sessionId: string }) => {
    // Flush any debounced draft write before the active session changes, otherwise the pending
    // write for the current session is lost (and would land on the wrong session if deferred).
    flushComposerDraft();
    viewport.savePosition();
    if (target.workspaceId === selectedWorkspace?.id && target.sessionId === selectedSession?.id)
      focusComposer();
    void updateSnapshot(setSnapshot, () => api.selectSession(target)).catch((error: unknown) => {
      console.error("[renderer] selectSession failed", error);
    });
  };
  selectThreadRef.current = handleSelectSession;

  const handleRespondToExtensionDialog = (
    response:
      | { readonly requestId: string; readonly value: string }
      | { readonly requestId: string; readonly confirmed: boolean }
      | { readonly requestId: string; readonly cancelled: true },
  ) => {
    if (!selectedWorkspace || !selectedSession) {
      return;
    }

    void updateSnapshot(setSnapshot, () =>
      api.respondToHostUiRequest(selectedWorkspace.id, selectedSession.id, response),
    )
      .then(() => {
        focusComposer();
      })
      .catch((error: unknown) => {
        console.error("[renderer] updateSnapshot failed", error);
      });
  };

  const handleToggleExtensionDock = () => {
    if (!selectedExtensionDock || !selectedExtensionUiInstance) {
      return;
    }

    setDockExpandedBySession((current) => {
      const next = { ...current };
      if (current[selectedSessionKey] === selectedExtensionUiInstance)
        delete next[selectedSessionKey];
      else next[selectedSessionKey] = selectedExtensionUiInstance;
      return next;
    });
  };

  const handleCreateScheduledTaskWithPi = () => {
    void updateSnapshot(setSnapshot, () => api.beginScheduledTaskInterview()).catch(
      (error: unknown) => {
        console.error("[renderer] beginScheduledTaskInterview failed", error);
      },
    );
  };

  const handleSubmitScheduledTask = (input: CreateScheduledTaskInput) => {
    const action =
      scheduledEditor?.mode === "edit"
        ? () => api.updateScheduledTask(scheduledEditor.taskId, input)
        : () => api.createScheduledTask(input);
    void updateSnapshot(setSnapshot, action)
      .then((state) => {
        if (!state.lastError) {
          setScheduledEditor(null);
        }
      })
      .catch((error: unknown) => {
        console.error("[renderer] save scheduled task failed", error);
      });
  };

  const handleOpenScheduledChat = (target: { workspaceId: string; sessionId: string }) => {
    setScheduledEditor(null);
    handleSelectSession(target);
  };

  const commandPalette =
    commands.paletteMode && threadSidebarModel ? (
      <CommandPaletteSurface
        key={commands.paletteMode}
        api={api}
        mode={commands.paletteMode}
        onModeChange={commands.setPaletteMode}
        onClose={() => commands.setPaletteMode(null)}
        threads={threadSidebarModel.recencyOrder}
        workspaces={threadSidebarModel.folders}
        currentThread={selectedThreadTarget}
        actions={commands.paletteActions}
        fileScope={
          selectedThreadTarget && selectedWorkspace
            ? {
                workspaceId: selectedWorkspace.id,
                label: selectedWorktree?.name ?? selectedWorkspace.name,
                openTabs:
                  workbench.view.files.workspaceId === selectedWorkspace.id
                    ? workbench.view.files.tabs.tabs
                    : [],
              }
            : undefined
        }
        modelScope={
          selectedThreadTarget
            ? {
                options: selectedModelOptions,
                currentProvider: resolvedSessionProvider,
                currentModelId: resolvedSessionModelId,
              }
            : undefined
        }
        onOpenThread={handleSelectSession}
        onOpenWorkspace={wsMenu.selectWorkspace}
        onOpenFile={(path) => {
          if (!selectedWorkspace) return;
          void workbench
            .openFile({ workspaceId: selectedWorkspace.id, path })
            .catch((error: unknown) => {
              console.error("[renderer] open file from palette failed", error);
            });
        }}
        onSelectModel={handleSetSessionModel}
      />
    ) : null;
  if (secondarySurfaceView) {
    return (
      <>
        <Suspense
          fallback={<DesktopStartupSurface state={{ kind: "loading" }} onRetry={desktop.retry} />}
        >
          <SecondarySurfaces
            api={api}
            snapshot={snapshot}
            setSnapshot={setSnapshot}
            activeView={secondarySurfaceView}
            rootWorkspaceOptions={rootWorkspaceOptions}
            settingsSection={settingsSection}
            onSelectSettingsSection={setSettingsSection}
            settingsWorkspaceId={settingsWorkspaceId}
            onSelectSettingsWorkspace={setSettingsWorkspaceId}
            skillsWorkspaceId={skillsWorkspaceId}
            onSelectSkillsWorkspace={setSkillsWorkspaceId}
            extensionsWorkspaceId={extensionsWorkspaceId}
            onSelectExtensionsWorkspace={setExtensionsWorkspaceId}
            onBack={() => setActiveView("threads")}
            onSelectView={setActiveView}
            onTrySkill={handleTrySkill}
          />
        </Suspense>
        {wsMenu.confirmationDialog}
        {commandPalette}
      </>
    );
  }

  const shellClassName = `shell${snapshot.sidebarCollapsed ? " shell--sidebar-collapsed" : ""}`;
  return (
    <div className={shellClassName}>
      {primarySidebarToggleVisible ? (
        <SidebarToggleButton
          collapsed={snapshot.sidebarCollapsed}
          shortcutLabel={sidebarToggleShortcutLabel}
          onToggle={commands.togglePrimarySidebar}
        />
      ) : null}
      {!snapshot.sidebarCollapsed ? (
        <Sidebar
          activeView={snapshot.activeView}
          selectedWorkspace={selectedWorkspace}
          selectedSession={selectedSession}
          visibleWorkspaces={visibleWorkspaces}
          threadSidebarModel={threadSidebarModel ?? buildThreadSidebarModel(snapshot)}
          threadShortcutOrderRef={threadShortcutOrderRef}
          threadGrouping={snapshot.threadGrouping}
          collapsedWorkspaceIds={snapshot.collapsedWorkspaceIds}
          linkedWorktreeByWorkspaceId={linkedWorktreeByWorkspaceId}
          wsMenu={wsMenu}
          threadMenu={threadMenu}
          api={api}
          setSnapshot={setSnapshot}
          updateSnapshot={updateSnapshot}
          onNewThread={(workspaceId) =>
            newThread.openSurface(
              workspaceId ?? selectedWorkspace?.rootWorkspaceId ?? selectedWorkspace?.id,
            )
          }
          onSetActiveView={setActiveView}
          onOpenSkills={openSkills}
          onOpenExtensions={openExtensions}
          onOpenSettings={openSettings}
          onArchiveSession={threadMenu.archive}
          onSelectSession={handleSelectSession}
          onSetSessionPinned={threadMenu.setPinned}
          onUnarchiveSession={threadMenu.restore}
        />
      ) : null}

      <main className={mainClassName} style={workbenchWidth.style}>
        <Topbar
          activeView={snapshot.activeView}
          rootWorkspace={
            snapshot.activeView === "new-thread"
              ? (newThread.workspace ?? rootWorkspace)
              : rootWorkspace
          }
          selectedWorkspace={selectedWorkspace}
          selectedWorktree={selectedWorktree}
          api={api}
          panelAvailable={sidePanelAvailable}
          panelVisible={sidePanelVisible}
          onTogglePanel={commands.toggleSidePanel}
          sessionTitle={
            snapshot.activeView === "threads" && selectedSession ? displayedSessionTitle : undefined
          }
        >
          {snapshot.activeView === "threads" && selectedWorkspace && selectedSession ? (
            <>
              <div className="chat-header__status">
                {selectedSession.status === "running"
                  ? runningLabel
                  : formatRelativeTime(selectedSession.updatedAt)}
              </div>
              {selectedThreadActions ? (
                <ThreadActionsMenu
                  actions={selectedThreadActions}
                  className="chat-header__menu"
                  open={threadMenu.openMenu?.surface === "header"}
                  onOpenChange={(open) => {
                    threadMenu.setHeaderMenu(open);
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("Thread actions")}
                      data-testid="thread-header-menu"
                      type="button"
                    >
                      …
                    </Button>
                  }
                />
              ) : null}
            </>
          ) : null}
        </Topbar>

        <WorkspaceRefreshNotice diagnostics={snapshot.startupDiagnostics} />

        <>
          {snapshot.activeView === "scheduled" ? (
            <ScheduledTasksView
              tasks={snapshot.scheduledTasks}
              lastError={snapshot.lastError}
              api={api}
              setSnapshot={setSnapshot}
              updateSnapshot={updateSnapshot}
              onCreateWithPi={handleCreateScheduledTaskWithPi}
              onOpenEditor={setScheduledEditor}
            />
          ) : snapshot.activeView === "new-thread" ? (
            <NewThreadSurface
              rootWorkspaceOptions={rootWorkspaceOptions}
              newThread={newThread}
              openSettings={openSettings}
            />
          ) : selectedWorkspace && selectedSession ? (
            <>
              <section className="canvas canvas--thread">
                <div className="conversation conversation--thread">
                  {showSchemaSkewNotice ? (
                    <div
                      className="schema-skew-notice"
                      role="status"
                      data-testid="schema-skew-notice"
                    >
                      <span className="schema-skew-notice__text">
                        {t(
                          "This session was written by a newer version of pi — some content may not display. Update pi-gui (or open it with the pi CLI) to see everything.",
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        type="button"
                        className="schema-skew-notice__dismiss"
                        aria-label={t("Dismiss notice")}
                        onClick={() => dismissSchemaSkewNotice(selectedSessionKey)}
                      >
                        {t("Dismiss")}
                      </Button>
                    </div>
                  ) : null}

                  <ConversationTimeline
                    key={selectedSessionKey}
                    transcript={pins.timeline}
                    isTranscriptLoading={isTranscriptLoading}
                    transcriptFailed={transcriptFailed}
                    onRetryTranscript={desktop.retry}
                    viewport={viewport}
                    threadSearch={threadSearch}
                    onViewFileInDiff={handleViewFileInDiff}
                    onOpenTurnChange={turnChanges.openTurnChange}
                    onOpenWorkspaceFileLine={handleOpenWorkspaceFileLine}
                    onExtensionAction={runExtensionCardAction}
                    extensionToolLabels={extensionToolLabels}
                    workspacePath={selectedWorkspace.path}
                    onForkFromMessage={
                      selectedSession.status === "running" ? undefined : openForkModal
                    }
                    scheduledOrigins={scheduledOrigins}
                    annotations={transcriptAnnotations}
                    platform={api?.platform ?? "linux"}
                  />
                </div>
              </section>
              {scheduledBinding ? (
                <ScheduledTaskChip
                  task={scheduledBinding}
                  onOpen={() => setScheduledEditor({ mode: "edit", taskId: scheduledBinding.id })}
                />
              ) : null}
              <ComposerPanel
                key={selectedSessionKey}
                preparingTaskDraft={extensionHostActions.preparingTaskDraft}
                activeSlashCommand={slashMenu.activeSlashFlow?.command}
                activeSlashCommandMeta={slashMenu.activeSlashFlow?.command?.description}
                attachments={composerAttachments}
                queuedMessages={queuedComposerMessages}
                editingQueuedMessageId={editingQueuedMessageId}
                composerDraft={composerDraft}
                composerRef={composerRef}
                runtime={selectedModelRuntime}
                usage={
                  selectedSessionKey
                    ? snapshot?.sessionUsageBySession[selectedSessionKey]
                    : undefined
                }
                extensionFlags={snapshot.extensionFlagsBySession[selectedSessionKey]}
                provider={resolvedSessionProvider}
                modelId={resolvedSessionModelId}
                thinkingLevel={resolvedSessionThinkingLevel}
                onClearSlashCommand={slashMenu.resetSlashUi}
                onComposerKeyDown={handleComposerKeyDown}
                onComposerPaste={handleComposerPaste}
                onComposerDrop={handleComposerDrop}
                onPickAttachments={handlePickAttachments}
                onRemoveAttachment={handleRemoveAttachment}
                onEditQueuedMessage={handleEditQueuedMessage}
                onCancelQueuedEdit={handleCancelQueuedEdit}
                onRemoveQueuedMessage={handleRemoveQueuedMessage}
                onSteerQueuedMessage={handleSteerQueuedMessage}
                onSelectSlashCommand={(command) => {
                  slashMenu.applySlashCommandSelection(command, "click");
                }}
                onSelectSlashOption={(option) => {
                  slashMenu.applySlashOptionSelection(option);
                }}
                onSetModel={handleSetSessionModel}
                onSetThinking={handleSetSessionThinking}
                modelOnboarding={selectedSessionModelOnboarding}
                onOpenModelSettings={(section) =>
                  openSettings(selectedWorkspace?.rootWorkspaceId ?? selectedWorkspace?.id, section)
                }
                onSubmit={submitComposerDraft}
                onStop={stopCurrentRun}
                selectedSession={selectedSession}
                lastError={snapshot.lastError}
                selectedSlashCommand={
                  slashMenu.activeSlashOptionCommand ?? slashMenu.selectedSlashCommand
                }
                selectedSlashOption={slashMenu.selectedSlashOption}
                slashOptionEmptyState={slashMenu.slashOptionEmptyState}
                setComposerDraft={setComposerDraft}
                showSlashOptionMenu={slashMenu.showSlashOptionMenu}
                showSlashMenu={slashMenu.showSlashMenu}
                slashOptions={slashMenu.slashOptions}
                slashSections={slashMenu.slashSections}
                showMentionMenu={mentionMenu.showMentionMenu}
                mentionOptions={mentionMenu.mentionOptions}
                selectedMentionIndex={mentionMenu.selectedIndex}
                onSelectMention={mentionMenu.insertMention}
                onEnableMentionExtension={mentionMenu.enableMentionExtension}
                pinnedCards={
                  <PinnedCards
                    pins={pins.visiblePins}
                    collapsedPinIds={pins.collapsedPinIds}
                    onToggle={pins.togglePin}
                    onDismiss={pins.dismissPin}
                    onAction={runExtensionCardAction}
                  />
                }
                extensionDock={shownExtensionDock.dock}
                extensionDockExpanded={isSelectedExtensionDockExpanded}
                onToggleExtensionDock={handleToggleExtensionDock}
                onDismissExtensionDock={shownExtensionDock.dismiss}
                extensionNotices={selectedExtensionUi?.notices}
                annotations={transcriptAnnotations}
              />
              {activeExtensionDialog ? (
                <ExtensionDialog
                  dialog={activeExtensionDialog}
                  onRespond={handleRespondToExtensionDialog}
                />
              ) : null}
              {treeModalState.open ? (
                <TreeModal
                  error={treeModalState.error}
                  loading={treeModalState.loading}
                  submitting={treeModalState.submitting}
                  tree={treeModalState.tree}
                  onClose={closeTreeModal}
                  onNavigate={navigateTreeSelection}
                />
              ) : null}
              {forkModalState.open ? (
                <ForkModal
                  error={forkModalState.error}
                  submitting={forkModalState.submitting}
                  messagePreview={forkModalState.messagePreview}
                  canUseWorktree={canUseWorktree}
                  onClose={closeForkModal}
                  onSubmit={handleForkSubmit}
                />
              ) : null}
            </>
          ) : selectedWorkspace ? (
            <section className="canvas canvas--empty">
              <div className="empty-panel">
                <div className="session-header__eyebrow">{t("Workspace")}</div>
                <h1>{selectedWorkspace.name}</h1>
                <p>
                  {t(
                    "Create a thread for this folder, then jump between sessions from the sidebar.",
                  )}
                </p>
                <div className="empty-panel__actions">
                  <Button
                    variant="default"

                    type="button"
                    onClick={() =>
                      newThread.openSurface(
                        selectedWorkspace?.rootWorkspaceId ?? selectedWorkspace?.id,
                      )
                    }
                  >
                    {t("New thread")}
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="canvas canvas--empty">
              <div className="empty-panel">
                <div className="session-header__eyebrow">{t("Workspace")}</div>
                <h1>{t("Open a folder to start")}</h1>
                <p>
                  {t(
                    "Add project folders, group sessions under them, and jump between threads from the sidebar.",
                  )}
                </p>
              </div>
            </section>
          )}
        </>
        {sidePanelVisible && selectedWorkspace && selectedSession ? (
          <AppWorkbench
            api={api}
            selectedWorkspace={selectedWorkspace}
            selectedSession={selectedSession}
            selectedSessionKey={selectedSessionKey}
            workbench={workbench}
            extensionViews={extensionViews}
            extensionHostActions={extensionHostActions}
            extensionViewTheme={extensionViewTheme}
            workbenchTarget={workbenchTarget}
            sidePanelTabHintsVisible={sidePanelTabHintsVisible}
            onResize={workbenchWidth.setWidth}
            onTogglePanel={commands.toggleSidePanel}
            diffFileRequest={diffFileRequest}
            fileWorkbenchContexts={fileWorkbenchContexts}
            filesWorkspace={filesWorkspace}
            filesWorktree={filesWorktree}
          />
        ) : null}
      </main>
      {scheduledEditor ? (
        <ScheduledTaskEditor
          editor={scheduledEditor}
          task={
            scheduledEditor.mode === "edit"
              ? snapshot.scheduledTasks.find((task) => task.id === scheduledEditor.taskId)
              : undefined
          }
          workspaces={snapshot.workspaces}
          selectedWorkspaceId={snapshot.selectedWorkspaceId}
          busy={false}
          error={snapshot.lastError}
          onClose={() => setScheduledEditor(null)}
          onSubmit={handleSubmitScheduledTask}
          onOpenChat={handleOpenScheduledChat}
        />
      ) : null}
      {threadSwitcher.state?.overlayVisible ? (
        <ThreadSwitcher state={threadSwitcher.state} onChoose={threadSwitcher.choose} />
      ) : null}
      {commandPalette}
    </div>
  );
}
