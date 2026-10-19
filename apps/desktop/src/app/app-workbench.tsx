import { Suspense } from "react";
import type { ComponentProps } from "react";
import type { SessionRecord } from "../../contracts/desktop-state";
import { t } from "../../i18n";
import { DiffPanel, FileWorkbench, TerminalPanel } from "./lazy-surfaces";
import { Workbench } from "../features/workbench/workbench";
import { renderBuiltinToolPanel } from "../features/workbench/builtin-tools";
import { ExtensionViewPanel } from "../features/extensions/extension-view-panel";
import type { ExtensionViewTheme } from "../features/extensions/extension-view-panel";
import type { useWorkbench } from "../features/workbench/use-workbench";
import type { useExtensionViews } from "../features/extensions/use-extension-views";
import type { useExtensionHostActions } from "../features/extensions/use-extension-host-actions";
import type { DiffPanelFileRequest } from "../features/workbench/diff-panel-types";

interface AppWorkbenchProps {
  api: ComponentProps<typeof DiffPanel>["api"];
  selectedWorkspace: ComponentProps<typeof TerminalPanel>["workspace"];
  selectedSession: SessionRecord;
  selectedSessionKey: string;
  workbench: ReturnType<typeof useWorkbench>;
  extensionViews: ReturnType<typeof useExtensionViews>;
  extensionHostActions: ReturnType<typeof useExtensionHostActions>;
  extensionViewTheme: ExtensionViewTheme;
  workbenchTarget: ComponentProps<typeof ExtensionViewPanel>["target"] | null;
  sidePanelTabHintsVisible: boolean;
  onResize: ComponentProps<typeof Workbench>["onResize"];
  onTogglePanel: ComponentProps<typeof Workbench>["onTogglePanel"];
  diffFileRequest: { readonly sessionKey: string; readonly request: DiffPanelFileRequest } | null;
  fileWorkbenchContexts: ComponentProps<typeof DiffPanel>["contexts"];
  filesWorkspace: ComponentProps<typeof FileWorkbench>["workspace"] | undefined;
  filesWorktree: ComponentProps<typeof FileWorkbench>["worktree"];
}

export function AppWorkbench({
  api,
  selectedWorkspace,
  selectedSession,
  selectedSessionKey,
  workbench,
  extensionViews,
  extensionHostActions,
  extensionViewTheme,
  workbenchTarget,
  sidePanelTabHintsVisible,
  onResize,
  onTogglePanel,
  diffFileRequest,
  fileWorkbenchContexts,
  filesWorkspace,
  filesWorktree,
}: AppWorkbenchProps) {
  const activeTool = workbench.activeTool;
  const activeExtensionView =
    activeTool?.kind === "extension"
      ? extensionViews.views.find(
          (view) => view.extensionId === activeTool.extensionId && view.id === activeTool.viewId,
        )
      : undefined;

  return (
    <Workbench
      view={workbench.view}
      platform={api?.platform ?? "linux"}
      tabHintsVisible={sidePanelTabHintsVisible}
      onResize={onResize}
      onTogglePanel={onTogglePanel}
      extensionViews={extensionViews.views}
      extensionViewsLoading={extensionViews.loading}
      extensionViewsError={extensionViews.error}
      onReloadExtensionViews={extensionViews.reload}
      onOpenTool={workbench.openTool}
      onActivateTool={workbench.activateTool}
      onCloseTool={workbench.closeTool}
      onShowChooser={workbench.showChooser}
      error={workbench.error || extensionHostActions.fileError}
      loading={!workbench.ready}
      onRetryRestore={workbench.retryRestore}
    >
      <Suspense fallback={null}>
        {activeExtensionView?.state === "ready" && workbenchTarget && api ? (
          <ExtensionViewPanel
            api={api}
            target={workbenchTarget}
            view={activeExtensionView}
            theme={extensionViewTheme}
            onBeforePrepareTaskDraft={extensionHostActions.beforePrepareTaskDraft}
            onPrepareTaskDraftPendingChange={
              extensionHostActions.handlePrepareTaskDraftPendingChange
            }
          />
        ) : activeTool && activeTool.kind !== "extension" ? (
          renderBuiltinToolPanel(activeTool.kind, {
            changes: () => (
              <DiffPanel
                key={selectedSessionKey}
                workspaceId={selectedWorkspace.id}
                sessionId={selectedSession.id}
                api={api}
                sessionStatus={selectedSession.status}
                selection={workbench.view.changes}
                onSelectionChange={workbench.setChanges}
                onOpenFile={workbench.openFile}
                fileRequest={
                  diffFileRequest?.sessionKey === selectedSessionKey
                    ? diffFileRequest.request
                    : null
                }
                contexts={fileWorkbenchContexts}
              />
            ),
            files: () =>
              filesWorkspace ? (
                <FileWorkbench
                  key={selectedSessionKey}
                  api={api}
                  onTabsChange={workbench.setFiles}
                  sessionStatus={selectedSession.status}
                  tabs={workbench.view.files.tabs}
                  worktree={filesWorktree}
                  workspace={filesWorkspace}
                />
              ) : (
                <p className="workbench__unavailable" role="status">
                  {t("This file checkout is unavailable.")}
                </p>
              ),
            terminal: () => (
              <TerminalPanel
                key={selectedSessionKey}
                workspace={selectedWorkspace}
                sessionId={selectedSession.id}
                onHide={() => workbench.closeTool("terminal")}
              />
            ),
          })
        ) : null}
      </Suspense>
    </Workbench>
  );
}
