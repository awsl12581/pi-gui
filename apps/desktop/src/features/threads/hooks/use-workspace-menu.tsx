import { ConfirmationDialog } from "../../../components/ui/confirmation-dialog";
import { t } from "../../../../i18n";
import { useLocale } from "../../../ui/use-locale";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import type {
  DesktopAppState,
  WorkspaceRecord,
  WorktreeRecord,
} from "../../../../contracts/desktop-state";
import type { PiDesktopApi } from "../../../../contracts/ipc";

interface UseWorkspaceMenuParams {
  readonly api: PiDesktopApi | undefined;
  readonly setSnapshot: Dispatch<SetStateAction<DesktopAppState | null>>;
  readonly updateSnapshot: (
    setSnapshot: Dispatch<SetStateAction<DesktopAppState | null>>,
    action: () => Promise<DesktopAppState>,
  ) => Promise<DesktopAppState>;
}

export interface WorkspaceMenuState {
  readonly confirmationDialog: React.ReactNode;
  readonly workspaceMenuId: string | null;
  readonly workspaceRenameId: string | null;
  readonly workspaceRenameDraft: string;
  readonly setWorkspaceRenameDraft: Dispatch<SetStateAction<string>>;
  readonly workspaceRenamePanelRef: RefObject<HTMLFormElement | null>;
  readonly workspaceRenameInputRef: RefObject<HTMLInputElement | null>;
  readonly openWorkspaceMenu: (workspaceId: string) => void;
  readonly closeWorkspaceMenu: () => void;
  readonly startRename: (workspace: WorkspaceRecord) => void;
  readonly submitRename: (workspace: WorkspaceRecord) => void;
  readonly cancelRename: () => void;
  readonly removeWorkspace: (workspace: WorkspaceRecord) => void;
  readonly createWorktree: (
    workspaceId: string,
    fromSessionWorkspaceId?: string,
    fromSessionId?: string,
  ) => void;
  readonly removeWorktree: (workspaceId: string, worktree: WorktreeRecord) => void;
  readonly selectWorkspace: (workspaceId: string) => void;
  readonly runWorkspaceMenuAction: (
    event: ReactMouseEvent<HTMLElement>,
    action: () => void,
  ) => void;
}

export function useWorkspaceMenu(params: UseWorkspaceMenuParams): WorkspaceMenuState {
  useLocale();
  const { api, setSnapshot, updateSnapshot } = params;

  const [confirmation, setConfirmation] = useState<{
    kind: "workspace" | "worktree";
    name: string;
    run: () => Promise<DesktopAppState>;
  } | null>(null);
  const [workspaceMenuId, setWorkspaceMenuId] = useState<string | null>(null);
  const [workspaceRenameId, setWorkspaceRenameId] = useState<string | null>(null);
  const [workspaceRenameDraft, setWorkspaceRenameDraft] = useState("");

  const workspaceRenamePanelRef = useRef<HTMLFormElement | null>(null);
  const workspaceRenameInputRef = useRef<HTMLInputElement | null>(null);

  // Focus/select rename input when rename starts
  useEffect(() => {
    if (!workspaceRenameId) {
      return undefined;
    }

    workspaceRenameInputRef.current?.focus();
    workspaceRenameInputRef.current?.select();
    return undefined;
  }, [workspaceRenameId]);

  // Click-outside / Escape handler for workspace menu and rename panel
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const renamePanelContains = workspaceRenamePanelRef.current?.contains(target) ?? false;
      if (!renamePanelContains) {
        setWorkspaceRenameId(null);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspaceRenameId(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openWorkspaceMenu = (workspaceId: string) => {
    setWorkspaceMenuId((current) => (current === workspaceId ? null : workspaceId));
  };

  const closeWorkspaceMenu = () => {
    setWorkspaceMenuId(null);
  };

  const startRename = (workspace: WorkspaceRecord) => {
    setWorkspaceMenuId(null);
    setWorkspaceRenameId(workspace.id);
    setWorkspaceRenameDraft(workspace.name);
  };

  const submitRename = (workspace: WorkspaceRecord) => {
    const nextName = workspaceRenameDraft.trim();
    setWorkspaceMenuId(null);
    setWorkspaceRenameId(null);
    if (!nextName || nextName === workspace.name) {
      setWorkspaceRenameDraft("");
      return;
    }
    setWorkspaceRenameDraft("");
    if (!api) {
      return;
    }
    void updateSnapshot(setSnapshot, () => api.renameWorkspace(workspace.id, nextName)).catch(
      (error: unknown) => {
        console.error("[renderer] renameWorkspace failed", error);
      },
    );
  };

  const cancelRename = () => {
    setWorkspaceRenameId(null);
    setWorkspaceRenameDraft("");
  };

  const removeWorkspace = (workspace: WorkspaceRecord) => {
    if (!api) return;
    setWorkspaceMenuId(null);
    setWorkspaceRenameId(null);
    setConfirmation({
      kind: "workspace",
      name: workspace.name,
      run: () => updateSnapshot(setSnapshot, () => api.removeWorkspace(workspace.id)),
    });
  };

  const createWorktree = (
    workspaceId: string,
    fromSessionWorkspaceId?: string,
    fromSessionId?: string,
  ) => {
    setWorkspaceMenuId(null);
    if (!api) {
      return;
    }
    void updateSnapshot(setSnapshot, () =>
      api.createWorktree({ workspaceId, fromSessionWorkspaceId, fromSessionId }),
    ).catch((error: unknown) => {
      console.error("[renderer] updateSnapshot failed", error);
    });
  };

  const removeWorktree = (workspaceId: string, worktree: WorktreeRecord) => {
    if (!api) return;
    setConfirmation({
      kind: "worktree",
      name: worktree.name,
      run: () =>
        updateSnapshot(setSnapshot, () =>
          api.removeWorktree({ workspaceId, worktreeId: worktree.id }),
        ),
    });
  };

  const selectWorkspace = (workspaceId: string) => {
    if (!api) {
      return;
    }
    void updateSnapshot(setSnapshot, () => api.selectWorkspace(workspaceId)).catch(
      (error: unknown) => {
        console.error("[renderer] selectWorkspace failed", error);
      },
    );
  };

  const runWorkspaceMenuAction = (event: ReactMouseEvent<HTMLElement>, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    setWorkspaceMenuId(null);
    action();
  };

  return {
    confirmationDialog: confirmation ? (
      <ConfirmationDialog
        description={
          confirmation.kind === "workspace"
            ? t("Remove {{value0}} from pi-gui? This will not delete any files.", {
                value0: confirmation.name,
              })
            : t("Remove worktree {{value0}}? This removes the git worktree from disk.", {
                value0: confirmation.name,
              })
        }
        onConfirm={confirmation.run}
        onClose={() => setConfirmation(null)}
      />
    ) : null,
    workspaceMenuId,
    workspaceRenameId,
    workspaceRenameDraft,
    setWorkspaceRenameDraft,
    workspaceRenamePanelRef,
    workspaceRenameInputRef,
    openWorkspaceMenu,
    closeWorkspaceMenu,
    startRename,
    submitRename,
    cancelRename,
    removeWorkspace,
    createWorktree,
    removeWorktree,
    selectWorkspace,
    runWorkspaceMenuAction,
  };
}
