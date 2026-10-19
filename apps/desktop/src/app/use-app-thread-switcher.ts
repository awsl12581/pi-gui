import { useEffect, useRef } from "react";
import { buildThreadSidebarModel, sessionThreadKey } from "../features/threads/thread-groups";
import {
  loadThreadSwitcherOrder,
  orderThreadSwitcherEntries,
  saveThreadSwitcherOrder,
  touchThreadSwitcherOrder,
} from "../features/threads/thread-switcher-order";
import { useThreadSwitcher } from "../features/threads/hooks/use-thread-switcher";

export function useAppThreadSwitcher(
  threadSidebarModel: ReturnType<typeof buildThreadSidebarModel> | undefined,
  threadOnScreenKey: string,
) {
  const threadSidebarModelRef = useRef(threadSidebarModel);
  threadSidebarModelRef.current = threadSidebarModel;
  const threadOnScreenKeyRef = useRef(threadOnScreenKey);
  threadOnScreenKeyRef.current = threadOnScreenKey;
  const selectThreadRef = useRef<(target: { workspaceId: string; sessionId: string }) => void>(
    () => {},
  );
  useEffect(() => {
    // Opening a thread is use; sending always happens in the thread on screen.
    if (!threadOnScreenKey) return;
    saveThreadSwitcherOrder(touchThreadSwitcherOrder(loadThreadSwitcherOrder(), threadOnScreenKey));
  }, [threadOnScreenKey]);
  const threadSwitcher = useThreadSwitcher({
    readSource: () => {
      const currentKey = threadOnScreenKeyRef.current;
      const stored = loadThreadSwitcherOrder();
      // Another window may have used a thread since this one did.
      const order = currentKey ? touchThreadSwitcherOrder(stored, currentKey) : stored;
      const recencyOrder = threadSidebarModelRef.current?.recencyOrder ?? [];
      const entries = orderThreadSwitcherEntries(recencyOrder, order);
      const first = entries[0];
      return {
        entries,
        firstIsCurrent: first !== undefined && sessionThreadKey(first) === currentKey,
      };
    },
    onSelect: (entry) =>
      selectThreadRef.current({ workspaceId: entry.workspaceId, sessionId: entry.session.id }),
  });
  return { threadSwitcher, selectThreadRef };
}
