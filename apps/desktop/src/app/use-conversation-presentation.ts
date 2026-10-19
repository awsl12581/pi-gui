import { useCallback, useMemo, useRef, useState } from "react";
import { i18n } from "../../i18n";
import type { SessionRef } from "@pi-gui/session-driver";
import type { PiDesktopApi } from "../../contracts/ipc";
import type { SessionRecord, WorkspaceRecord } from "../../contracts/desktop-state";
import {
  nonCompletedBindingForSession,
  scheduledOriginsByMessageId,
} from "../../contracts/scheduled-tasks";
import type { DesktopAppSession } from "./desktop-app-state";
import { usePinnedCards } from "../features/extensions/pinned-cards";
import { useTurnChanges } from "../features/conversation/hooks/use-turn-changes";
import { buildDisplayTimelineItems } from "../features/conversation/timeline-turns";
import { useTimelineViewport } from "../features/conversation/hooks/use-timeline-viewport";
import { useThreadSearch } from "../features/conversation/hooks/use-thread-search";
import type { useWorkbench } from "../features/workbench/use-workbench";

interface ConversationPresentationOptions {
  desktop: DesktopAppSession;
  api: PiDesktopApi | undefined;
  selectedWorkspace: WorkspaceRecord | undefined;
  selectedSession: SessionRecord | undefined;
  selectedSessionKey: string;
  workbenchTarget: SessionRef | null;
  workbench: ReturnType<typeof useWorkbench>;
}

export function useConversationPresentation({
  desktop,
  api,
  selectedWorkspace,
  selectedSession,
  selectedSessionKey,
  workbenchTarget,
  workbench,
}: ConversationPresentationOptions) {
  const { snapshot, selectedTranscript } = desktop;
  const timelinePaneRef = useRef<HTMLDivElement | null>(null);
  const [dismissedSchemaSkewSessionKeys, setDismissedSchemaSkewSessionKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const selectedTranscriptForSession =
    selectedTranscript &&
    selectedWorkspace &&
    selectedSession &&
    selectedTranscript.workspaceId === selectedWorkspace.id &&
    selectedTranscript.sessionId === selectedSession.id
      ? selectedTranscript
      : null;
  const activeTranscript = selectedTranscriptForSession?.transcript ?? [];
  const pins = usePinnedCards(selectedSessionKey, activeTranscript);
  const scheduledOrigins = useMemo(() => {
    if (!snapshot || !selectedWorkspace || !selectedSession) {
      return new Map();
    }
    return scheduledOriginsByMessageId(
      snapshot.scheduledTasks,
      selectedWorkspace.id,
      selectedSession.id,
      pins.timeline,
    );
  }, [pins.timeline, selectedSession, selectedWorkspace, snapshot, i18n.language]);
  const scheduledBinding = selectedSession
    ? nonCompletedBindingForSession(snapshot?.scheduledTasks ?? [], selectedSession.id)
    : undefined;
  const transcriptHydration = desktop.view.kind === "ready" ? desktop.view.transcript : undefined;
  const transcriptFailed = transcriptHydration?.kind === "failed" ? transcriptHydration : null;
  const isTranscriptLoading =
    Boolean(selectedSession) && !selectedTranscriptForSession && !transcriptFailed;
  const selectedSessionRunning = selectedSession?.status === "running";
  const turnChanges = useTurnChanges({
    api,
    target: workbenchTarget,
    running: selectedSessionRunning,
    workbench,
  });
  const timelineRows = useMemo(
    () =>
      buildDisplayTimelineItems(pins.timeline, {
        lastTurnRunning: selectedSessionRunning,
        turnChanges: turnChanges.turns,
      }),
    [pins.timeline, selectedSessionRunning, turnChanges.turns, i18n.language],
  );
  const viewport = useTimelineViewport({
    sessionKey: selectedSessionKey,
    rows: timelineRows,
    active: snapshot?.activeView === "threads" && Boolean(selectedSession),
    transcriptReady: !isTranscriptLoading && !transcriptFailed,
    paneRef: timelinePaneRef,
  });
  const threadSearch = useThreadSearch(
    timelinePaneRef,
    viewport.navigateToElement,
    viewport.setSearchMode,
  );
  const showSchemaSkewNotice =
    selectedTranscriptForSession?.schemaInfo?.writtenByNewerRuntime === true &&
    Boolean(selectedSessionKey) &&
    !dismissedSchemaSkewSessionKeys.has(selectedSessionKey);
  const dismissSchemaSkewNotice = useCallback(
    (sessionKey: string) => {
      setDismissedSchemaSkewSessionKeys((current) => {
        if (current.has(sessionKey)) {
          return current;
        }
        const next = new Set(current);
        next.add(sessionKey);
        return next;
      });
    },
    [i18n.language],
  );

  return {
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
  };
}
