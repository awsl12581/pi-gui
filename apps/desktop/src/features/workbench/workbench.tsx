import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  formatShortcut,
  getSidePanelTabShortcutLabel,
  SIDE_PANEL_TAB_SHORTCUT_SLOT_COUNT,
} from "../../../contracts/ipc";
import { toolRefId, type TaskWorkbenchTemplate, type ToolRef } from "../../../contracts/workbench";
import type { DesktopExtensionViewInfo } from "../../../contracts/extension-views";
import { CloseIcon, ExtensionIcon, PlusIcon, SidePanelIcon } from "../../ui/icons";
import { BUILTIN_TOOL_ENTRIES, BUILTIN_TOOLS } from "./builtin-tools";
import { WorkbenchResizeHandle } from "./workbench-resize-handle";
import { activeWorkbenchTool } from "./workbench-state";

interface WorkbenchProps {
  readonly view: TaskWorkbenchTemplate;
  readonly platform: NodeJS.Platform;
  /** Whether the side panel tab modifier is held, so tabs show their numbers. */
  readonly tabHintsVisible: boolean;
  readonly onResize: (width: number) => void;
  readonly onTogglePanel: () => void;
  readonly onOpenTool: (tool: ToolRef) => void;
  readonly onActivateTool: (toolId: string) => void;
  readonly onCloseTool: (toolId: string) => void;
  readonly onShowChooser: () => void;
  readonly children?: ReactNode;
  readonly error?: string;
  readonly loading?: boolean;
  readonly onRetryRestore?: () => void;
  readonly extensionViews?: readonly DesktopExtensionViewInfo[];
  readonly extensionViewsLoading?: boolean;
  readonly extensionViewsError?: string;
  readonly onReloadExtensionViews?: () => void;
}

export function workbenchToolLabel(tool: ToolRef): string {
  return tool.kind === "extension" ? tool.viewId : BUILTIN_TOOLS[tool.kind].label;
}

function ToolIcon({ tool }: { readonly tool: ToolRef }) {
  useLocale();
  if (tool.kind === "extension") return <ExtensionIcon />;
  const { Icon } = BUILTIN_TOOLS[tool.kind];
  return <Icon />;
}

export function Workbench({
  view,
  platform,
  tabHintsVisible,
  onResize,
  onTogglePanel,
  onOpenTool,
  onActivateTool,
  onCloseTool,
  onShowChooser,
  children,
  error,
  loading = false,
  onRetryRestore,
  extensionViews = [],
  extensionViewsLoading = false,
  extensionViewsError = "",
  onReloadExtensionViews,
}: WorkbenchProps) {
  useLocale();
  const panelId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeTool = activeWorkbenchTool(view);
  const activeExtension =
    activeTool?.kind === "extension"
      ? extensionViews.find(
          (entry) => entry.extensionId === activeTool.extensionId && entry.id === activeTool.viewId,
        )
      : undefined;
  useEffect(() => {
    if (view.visibility === "visible" && view.selection.kind === "tool") {
      tabRefs.current
        .get(view.selection.toolId)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [view.selection, view.visibility]);

  const tabId = (toolId: string) => `${panelId}-${encodeURIComponent(toolId)}`;

  const closeAndFocus = (toolId: string) => {
    const index = view.tools.findIndex((tool) => toolRefId(tool) === toolId);
    const remaining = view.tools.filter((tool) => toolRefId(tool) !== toolId);
    const neighbor = remaining[Math.min(index, remaining.length - 1)];
    const active = view.selection;
    const nextId =
      active.kind === "tool" && active.toolId !== toolId
        ? active.toolId
        : neighbor
          ? toolRefId(neighbor)
          : undefined;
    onCloseTool(toolId);
    window.requestAnimationFrame(() => {
      if (nextId) tabRefs.current.get(nextId)?.focus();
      else addRef.current?.focus();
    });
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, toolId: string) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      closeAndFocus(toolId);
      return;
    }
  };

  if (view.visibility === "hidden") return null;

  return (
    <Tabs
      asChild
      className="gap-0"
      value={view.selection.kind === "tool" ? view.selection.toolId : ""}
      onValueChange={onActivateTool}
    >
      <aside
        aria-label={t("Side workspace")}
        className="workbench side-panel"
        data-testid="workbench"
        id="task-workbench"
      >
        <WorkbenchResizeHandle onResize={onResize} />
        <div className="workbench__tabbar">
          <TabsList variant="line" aria-label={t("Workspace tools")} className="workbench__tabs">
            {view.tools.map((tool, index) => {
              const toolId = toolRefId(tool);
              const label =
                tool.kind === "extension"
                  ? (extensionViews.find(
                      (entry) => entry.extensionId === tool.extensionId && entry.id === tool.viewId,
                    )?.title ?? workbenchToolLabel(tool))
                  : workbenchToolLabel(tool);
              const selected = view.selection.kind === "tool" && view.selection.toolId === toolId;
              const slot = index < SIDE_PANEL_TAB_SHORTCUT_SLOT_COUNT ? index + 1 : undefined;
              const shortcut = slot ? getSidePanelTabShortcutLabel(platform, slot) : undefined;
              return (
                <div className="workbench__tab-wrapper" key={toolId} role="presentation">
                  <TabsTrigger
                    value={toolId}
                    aria-controls={panelId}
                    aria-keyshortcuts={
                      slot ? `${platform === "darwin" ? "Control" : "Alt"}+${slot}` : undefined
                    }
                    aria-label={label}
                    className={`workbench__tab${selected ? " workbench__tab--active" : ""}`}
                    data-tab-shortcut={tabHintsVisible && slot ? String(slot) : undefined}
                    data-testid={`workbench-tab-${toolId}`}
                    disabled={loading}
                    id={tabId(toolId)}
                    onKeyDown={(event) => onTabKeyDown(event, toolId)}
                    ref={(button) => {
                      if (button) tabRefs.current.set(toolId, button);
                      else tabRefs.current.delete(toolId);
                    }}
                    title={shortcut ? `${label} (${shortcut})` : label}
                    type="button"
                  >
                    {tabHintsVisible && shortcut ? (
                      <span className="workbench__tab-shortcut" aria-hidden="true">
                        {shortcut}
                      </span>
                    ) : (
                      <ToolIcon tool={tool} />
                    )}
                    <span>{label}</span>
                  </TabsTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("Close {{value0}} tab", { value0: label })}
                    className="workbench__tab-close"
                    disabled={loading}
                    onClick={() => closeAndFocus(toolId)}
                    tabIndex={-1}
                    title={t("Close {{value0}} tab", { value0: label })}
                    type="button"
                  >
                    <CloseIcon />
                  </Button>
                </div>
              );
            })}
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Add tab")}
            className="workbench__add"
            data-testid="workbench-add-tab"
            disabled={loading}
            onClick={onShowChooser}
            ref={addRef}
            title={t("Add tab")}
            type="button"
          >
            <PlusIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Toggle side panel")}
            aria-pressed="true"
            aria-controls="task-workbench"
            data-testid="toggle-side-panel"
            className="workbench__add"
            onClick={onTogglePanel}
            title={t("Hide side panel")}
            type="button"
          >
            <SidePanelIcon />
          </Button>
        </div>
        {error ? (
          <div className="workbench__error" role="status">
            <p>{error ? t(error) : error}</p>
            {loading && onRetryRestore ? (
              <Button onClick={onRetryRestore} type="button">
                {t("Retry restoring tabs")}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div
          aria-labelledby={activeTool ? tabId(toolRefId(activeTool)) : undefined}
          className="workbench__content"
          id={panelId}
          role={activeTool ? "tabpanel" : undefined}
        >
          {loading ? (
            <p className="workbench__loading" role="status">
              {error
                ? t("Saved tabs are unavailable until restoration succeeds.")
                : t("Restoring tool tabs…")}
            </p>
          ) : view.selection.kind === "chooser" ? (
            <div className="workbench__chooser" data-testid="workbench-chooser">
              <h2>{t("Open a tool")}</h2>
              <p>{t("Keep the tools you need alongside your conversation.")}</p>
              {BUILTIN_TOOL_ENTRIES.map(({ kind, label, description, Icon, shortcutKey }) => (
                <Button
                  variant="ghost"
                  aria-keyshortcuts={
                    shortcutKey
                      ? `${platform === "darwin" ? "Meta" : "Control"}+${shortcutKey}`
                      : undefined
                  }
                  aria-label={label}
                  className="workbench__choice"
                  key={kind}
                  onClick={() => onOpenTool({ kind })}
                  type="button"
                >
                  <span className="workbench__choice-icon">
                    <Icon />
                  </span>
                  <span className="workbench__choice-copy">
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </span>
                  {shortcutKey ? (
                    <kbd className="workbench__choice-shortcut">
                      {formatShortcut(platform, shortcutKey)}
                    </kbd>
                  ) : null}
                </Button>
              ))}
              <h3 className="workbench__extension-heading">{t("Extension views")}</h3>
              {extensionViewsLoading ? <p role="status">{t("Loading extension views…")}</p> : null}
              {extensionViewsError ? (
                <div role="status">
                  <p>{extensionViewsError}</p>
                  {onReloadExtensionViews ? (
                    <Button type="button" onClick={onReloadExtensionViews}>
                      {t("Refresh views")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {extensionViews.map((extension) => (
                <Button
                  variant="ghost"
                  aria-label={extension.title}
                  className="workbench__choice"
                  key={toolRefId({
                    kind: "extension",
                    extensionId: extension.extensionId,
                    viewId: extension.id,
                  })}
                  onClick={() =>
                    onOpenTool({
                      kind: "extension",
                      extensionId: extension.extensionId,
                      viewId: extension.id,
                    })
                  }
                  type="button"
                >
                  <span className="workbench__choice-icon">
                    <ExtensionIcon />
                  </span>
                  <span className="workbench__choice-copy">
                    <strong>{extension.title}</strong>
                    {extension.state === "error" ? (
                      <span>{extension.error ?? t("View unavailable")}</span>
                    ) : null}
                  </span>
                </Button>
              ))}
              {!extensionViewsLoading && !extensionViewsError && extensionViews.length === 0 ? (
                <p>{t("Installed extensions can provide additional views here.")}</p>
              ) : null}
            </div>
          ) : activeTool?.kind === "extension" && activeExtension?.state !== "ready" ? (
            <div className="workbench__unavailable" role="status">
              <ExtensionIcon />
              <h2>
                {extensionViewsLoading
                  ? t("Finding this extension view…")
                  : t("This extension view is unavailable")}
              </h2>
              <p>
                {activeExtension?.error ||
                  extensionViewsError ||
                  t(
                    "Your saved tab is retained. Extension commands can still be used when installed.",
                  )}
              </p>
              {!extensionViewsLoading && onReloadExtensionViews ? (
                <Button type="button" onClick={onReloadExtensionViews}>
                  {t("Refresh views")}
                </Button>
              ) : null}
              <Button onClick={() => closeAndFocus(toolRefId(activeTool))} type="button">
                {t("Close tab")}
              </Button>
            </div>
          ) : (
            children
          )}
        </div>
      </aside>
    </Tabs>
  );
}
