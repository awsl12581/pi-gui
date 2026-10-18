import { t, i18n } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { WorkspaceRecord, WorkspaceSessionTarget } from "../../../contracts/desktop-state";
import type { PiDesktopApi } from "../../../contracts/ipc";
import { sessionLastInteractedAt } from "../../../contracts/thread-recency";
import { formatRelativeTime } from "../../lib/string-utils";
import { ChatIcon, FileIcon, FolderIcon, ModelIcon } from "../../ui/icons";
import type { ComposerModelOption } from "../conversation/composer-commands";
import type { ThreadListEntry } from "../threads/thread-groups";
import { CommandPalette, type PaletteSection } from "./command-palette";
import { rankPaths } from "./fuzzy-match";
import type { PaletteAction, PaletteMode } from "./palette-actions";
import {
  buildCommandSections,
  buildFileSections,
  buildListSection,
  COMMAND_FILTERS,
  FILE_RESULT_LIMIT,
  splitPath,
  type CommandFilter,
  type PaletteCandidate,
} from "./palette-sections";

export interface PaletteFileScope {
  readonly workspaceId: string;
  readonly label: string;
  readonly openTabs: readonly string[];
}

export interface PaletteModelScope {
  readonly options: readonly ComposerModelOption[];
  readonly currentProvider?: string;
  readonly currentModelId?: string;
}

/** Mount one per mode (key it by mode) so each list starts with an empty query. */
interface CommandPaletteSurfaceProps {
  readonly api: PiDesktopApi;
  readonly mode: PaletteMode;
  readonly onModeChange: (mode: PaletteMode) => void;
  readonly onClose: () => void;
  /** Unarchived threads across every workspace, most recently used first. */
  readonly threads: readonly ThreadListEntry[];
  readonly workspaces: readonly WorkspaceRecord[];
  readonly currentThread?: WorkspaceSessionTarget;
  readonly actions: readonly PaletteAction[];
  /** Present when a thread is open; Cmd-P searches its workspace. */
  readonly fileScope?: PaletteFileScope;
  readonly modelScope?: PaletteModelScope;
  readonly onOpenThread: (target: WorkspaceSessionTarget) => void;
  readonly onOpenWorkspace: (workspaceId: string) => void;
  readonly onOpenFile: (path: string) => void;
  readonly onSelectModel: (provider: string, modelId: string) => void;
}

type FileListing =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly files: readonly string[] }
  | { readonly status: "error" };

export function CommandPaletteSurface({
  api,
  mode,
  onModeChange,
  onClose,
  threads,
  workspaces,
  currentThread,
  actions,
  fileScope,
  modelScope,
  onOpenThread,
  onOpenWorkspace,
  onOpenFile,
  onSelectModel,
}: CommandPaletteSurfaceProps) {
  useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommandFilter>("all");
  const [listing, setListing] = useState<FileListing>({ status: "loading" });
  const fileWorkspaceId = fileScope?.workspaceId;
  const files = listing.status === "ready" ? listing.files : undefined;
  // Ranking a large tree can take tens of milliseconds; keep typing responsive.
  const fileQuery = useDeferredValue(query);
  const rankedFiles = useMemo(
    () => (mode === "files" && files ? rankPaths(files, fileQuery, FILE_RESULT_LIMIT) : []),
    [fileQuery, files, mode, i18n.language],
  );

  useEffect(() => {
    if (mode !== "files" || !fileWorkspaceId) {
      return undefined;
    }
    let current = true;
    setListing({ status: "loading" });
    void api
      .listWorkspaceFiles(fileWorkspaceId)
      .then((files) => {
        if (current) setListing({ status: "ready", files });
      })
      .catch((error: unknown) => {
        console.error("[renderer] listWorkspaceFiles failed", error);
        if (current) setListing({ status: "error" });
      });
    return () => {
      current = false;
    };
  }, [api, fileWorkspaceId, mode]);

  // Cheap for hundreds of threads; only the file ranking is memoized.
  const chatCandidates: readonly PaletteCandidate[] = threads.map((thread) => {
    const target = { workspaceId: thread.workspaceId, sessionId: thread.session.id };
    const isCurrent =
      currentThread?.workspaceId === target.workspaceId &&
      currentThread.sessionId === target.sessionId;
    return {
      id: `chat:${target.workspaceId}:${target.sessionId}`,
      title: thread.session.title,
      detail: [thread.contextLabel, formatRelativeTime(sessionLastInteractedAt(thread.session))]
        .filter(Boolean)
        .join(" · "),
      icon: <ChatIcon />,
      hint: isCurrent
        ? t("Current")
        : thread.session.status === "running"
          ? t("Running")
          : undefined,
      run: () => {
        onClose();
        onOpenThread(target);
      },
    };
  });

  const workspaceCandidates: readonly PaletteCandidate[] = workspaces.map((workspace) => ({
    id: `workspace:${workspace.id}`,
    title: workspace.name,
    detail: workspace.path,
    icon: <FolderIcon />,
    run: () => {
      onClose();
      onOpenWorkspace(workspace.id);
    },
  }));

  const actionCandidates: readonly PaletteCandidate[] = actions.map((action) => ({
    id: `action:${action.id}`,
    title: action.title,
    icon: action.icon,
    hint: action.hint,
    run: () => {
      if (!action.keepsOpen) onClose();
      action.run();
    },
  }));

  let label: string;
  let placeholder: string;
  let sections: readonly PaletteSection[];
  let emptyText: string;
  if (mode === "files") {
    label = t("Go to file");
    placeholder = fileScope
      ? t("Search files in {{value0}}", { value0: fileScope.label })
      : t("Search files");
    sections =
      fileScope && files
        ? buildFileSections({
            query: fileQuery,
            ranked: rankedFiles,
            openTabs: fileScope.openTabs,
            toCandidate: (path) => {
              const { name, directory } = splitPath(path);
              return {
                id: `file:${path}`,
                title: name,
                detail: directory || undefined,
                icon: <FileIcon />,
                run: () => {
                  onClose();
                  onOpenFile(path);
                },
              };
            },
          })
        : [];
    emptyText = !fileScope
      ? t("Open a thread to search its files.")
      : listing.status === "loading"
        ? t("Loading files…")
        : listing.status === "error"
          ? t("Couldn't load files.")
          : query !== fileQuery
            ? t("Searching…")
            : query.trim()
              ? t("No matching files.")
              : t("Type to search {{value0}} files.", {
                  value0: (files?.length ?? 0).toLocaleString(i18n.language),
                });
  } else if (mode === "models") {
    label = t("Switch model");
    placeholder = t("Switch model");
    sections = buildListSection({
      id: "models",
      label: t("Models"),
      query,
      candidates: (modelScope?.options ?? []).map((option) => ({
        id: `model:${option.providerId}/${option.modelId}`,
        title: option.label,
        icon: <ModelIcon />,
        hint:
          option.providerId === modelScope?.currentProvider &&
          option.modelId === modelScope.currentModelId
            ? t("Current")
            : undefined,
        run: () => {
          onClose();
          onSelectModel(option.providerId, option.modelId);
        },
      })),
    });
    emptyText = modelScope?.options.length ? t("No matching models.") : t("No models available.");
  } else {
    label = t("Command palette");
    placeholder = t("Search chats, workspaces and actions");
    sections = buildCommandSections({
      query,
      filter,
      chats: chatCandidates,
      workspaces: workspaceCandidates,
      actions: actionCandidates,
    });
    emptyText = query.trim() ? t("No matches.") : t("Nothing here yet.");
  }

  return (
    <CommandPalette
      activeFilter={mode === "commands" ? filter : undefined}
      emptyText={emptyText}
      filters={mode === "commands" ? COMMAND_FILTERS : undefined}
      label={label}
      placeholder={placeholder}
      query={query}
      sections={sections}
      settling={mode === "files" && query !== fileQuery}
      onBack={mode === "models" ? () => onModeChange("commands") : undefined}
      onClose={onClose}
      onFilterChange={setFilter}
      onQueryChange={setQuery}
    />
  );
}
