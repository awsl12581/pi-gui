import { t } from "../../i18n";
import { NewThreadView } from "../features/threads/new-thread-view";
import type { useNewThreadController } from "../features/threads/hooks/use-new-thread-controller";
import type { WorkspaceRecord } from "../../contracts/desktop-state";
import type { SettingsSection } from "../features/settings/settings-view";

interface NewThreadSurfaceProps {
  rootWorkspaceOptions: readonly WorkspaceRecord[];
  newThread: ReturnType<typeof useNewThreadController>;
  openSettings: (workspaceId?: string, section?: SettingsSection) => void;
}

export function NewThreadSurface({
  rootWorkspaceOptions,
  newThread,
  openSettings,
}: NewThreadSurfaceProps) {
  return rootWorkspaceOptions.length > 0 ? (
    <NewThreadView
      workspaces={rootWorkspaceOptions}
      selectedWorkspaceId={newThread.rootWorkspaceId || rootWorkspaceOptions[0]?.id || ""}
      runtime={newThread.runtime}
      environment={newThread.environment}
      prompt={newThread.prompt}
      attachments={newThread.attachments}
      lastError={newThread.composerError}
      provider={newThread.resolvedProvider}
      modelId={newThread.resolvedModelId}
      thinkingLevel={newThread.resolvedThinkingLevel}
      modelOnboarding={newThread.modelOnboarding}
      composerRef={newThread.composerRef}
      activeSlashCommand={newThread.slashMenu.activeSlashFlow?.command}
      activeSlashCommandMeta={newThread.slashMenu.activeSlashFlow?.command?.description}
      slashSections={newThread.slashMenu.slashSections}
      slashOptions={newThread.slashMenu.slashOptions}
      selectedSlashCommand={
        newThread.slashMenu.activeSlashOptionCommand ?? newThread.slashMenu.selectedSlashCommand
      }
      selectedSlashOption={newThread.slashMenu.selectedSlashOption}
      showSlashMenu={newThread.slashMenu.showSlashMenu}
      showSlashOptionMenu={newThread.slashMenu.showSlashOptionMenu}
      slashOptionEmptyState={newThread.slashMenu.slashOptionEmptyState}
      showMentionMenu={newThread.mentionMenu.showMentionMenu}
      mentionOptions={newThread.mentionMenu.mentionOptions}
      selectedMentionIndex={newThread.mentionMenu.selectedIndex}
      onChangePrompt={newThread.setPrompt}
      onSelectEnvironment={newThread.setEnvironment}
      onSelectWorkspace={newThread.selectWorkspace}
      onSetModel={(provider, modelId) => {
        newThread.setProvider(provider);
        newThread.setModelId(modelId);
      }}
      onSetThinking={newThread.setThinkingLevel}
      extensionFlags={newThread.extensionFlags}
      onSetExtensionFlag={newThread.setExtensionFlag}
      onOpenModelSettings={(section) => openSettings(newThread.workspace?.id, section)}
      onComposerKeyDown={newThread.handleComposerKeyDown}
      onComposerPaste={newThread.handleComposerPaste}
      onComposerDrop={newThread.handleComposerDrop}
      onClearSlashCommand={newThread.slashMenu.resetSlashUi}
      onSelectSlashCommand={(command) => {
        newThread.slashMenu.applySlashCommandSelection(command, "click");
      }}
      onSelectSlashOption={(option) => {
        newThread.slashMenu.applySlashOptionSelection(option);
      }}
      onSelectMention={newThread.mentionMenu.insertMention}
      onEnableMentionExtension={newThread.mentionMenu.enableMentionExtension}
      onAddAttachments={newThread.addAttachments}
      onRemoveAttachment={newThread.removeAttachment}
      onSubmit={newThread.startThread}
    />
  ) : (
    <section className="canvas canvas--empty">
      <div className="empty-panel">
        <div className="session-header__eyebrow">{t("Workspace")}</div>
        <h1>{t("Open a folder to start")}</h1>
        <p>{t("Add a project folder before creating a new thread.")}</p>
      </div>
    </section>
  );
}
