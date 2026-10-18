# Workspace redesign: implementation design

> 最后修改时间：2026-10-18 20:45 CST
> 文档版本：v3
> 修改说明：将维护中插件明确为第一方扩展，同步新目录和使用入口，标注打包内置为规划。

The tabbed workbench, Review/capture and optional extension views are implemented. Current manifests declare Pi/Chord `^1.2.0`. This document describes current behavior; prior macOS validation and its limits are retained in the [historical report](archive/workspace-redesign-verification.md) and [foundation record](archive/workspace-foundation-verification.md).

## Recommendation

The conversation remains the main surface. Files, Changes, Terminal, and optional extension views share one companion workspace with task-local tabs. The built-in workspace, review/capture and extension host retain the established desktop owners.

The composer keeps both model and reasoning level visible. The side-workspace toggle is icon-only, with an accessible name, tooltip, pressed state, and existing keyboard shortcut. Appearance and density stay in Settings. There is no local/cloud picker when only local operation exists.

Chord supplies extension services, replicated state and facet lifecycle. Pi-gui supplies the desktop view host and a small registration adapter to existing Pi extensions. Authors provide browser interfaces connected to extension services and state. The [custom frontend design](chord-desktop-extension-design.md) records the implemented contract, ownership and verification scope. Its Pi EventBus bridge performs discovery only.

## Baseline behavior before the workspace foundation

| Area         | Historical baseline                                                                                                               | Implemented direction                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Shell        | `App.tsx` separately owns Files/Changes mode, document tabs, and terminal visibility. Selection changes clear some of this state. | One workbench controller owns opening, focusing, closing, hiding, and restoring tools.                                     |
| Conversation | Draft synchronization, timeline viewport, explicit session targeting, queued messages, model/thinking controls already exist.     | Recompose and restyle these features; preserve their behavior and ownership.                                               |
| Changes      | Current working-tree status, grouped across checkout contexts. The file-diff helper prefers unstaged over staged content.         | Explicit checkout and comparison, correct partial-staging presentation, then branch and captured-turn review.              |
| Terminal     | Main owns PTYs, scoped by window, canonical checkout, and task. Renderer unmount does not terminate them.                         | Render the same service in a tool tab; view lifetime remains separate from shell lifetime.                                 |
| Extensions   | Pi UI calls become dialogs, notifications, status, and text widgets. The app has no desktop view registration API.                | Preserve existing compatibility and add registered browser views connected through Chord to the original Pi extension.     |
| Persistence  | Pi owns session data; catalogs own workspace/session records; desktop owns validated UI state.                                    | Add layout preferences and review metadata to desktop-owned storage; do not copy Pi history or extension findings into it. |

Baseline: `f06a5501dbcf1f39e105f0375ae7646bd9841c8f`. Current source: [shell](../apps/desktop/src/app/App.tsx), [draft synchronization](../apps/desktop/src/features/conversation/hooks/use-composer-draft-sync.ts), [desktop owners](architecture.md), [UI persistence](../apps/desktop/electron/persistence/app-store-persistence.ts), [Git review adapter](../apps/desktop/electron/platform/files/git-review.ts), [extension binding](../packages/pi-sdk-driver/src/session-supervisor.ts).

## Implemented workspace foundation

The live layout now follows one [workbench controller](../apps/desktop/src/features/workbench/use-workbench.ts) and [reducer](../apps/desktop/src/features/workbench/workbench-state.ts). Files, Changes and Terminal share the outer tab strip and chooser. New threads choose Local or Worktree in the composer. Worktrees is not a workbench tool; saved templates containing that retired kind are rejected. A single icon toggles visibility. Files keeps its document tabs; Terminal keeps its shell tabs and process owner. The old picker, bottom terminal drawer and independent visibility flags are removed.

Each task retains its ordered tools, selected tool, visibility, file references and selected Changes checkout/path. Settings does not clear that layout. File refresh no longer deletes saved document tabs; a missing file remains an explicit read error. Last-shell close callbacks are invalidated when their view unmounts, so they cannot close another task's tool tab.

The [browser-safe contract](../apps/desktop/contracts/workbench.ts) is also the strict persistence/IPC decoder. Main stores the last explicit layout template per task, outside broadcast snapshots. Windows restore once and keep independent live state. Early interactions are rebased onto the saved template after loading; failed restores offer Retry and do not overwrite unknown saved layout. Main serializes saves, rejects stale per-renderer sequence numbers and resets that sequence on renderer navigation. Only schema v19 is accepted, with an explicit `changes.scope`. Unsupported versions and removed tool kinds fail without rewriting the saved file.

Neutral Default light/dark colors, consistent spacing, a quieter sidebar and composer, and the tab styles use the existing token system. Named themes retain their own colors. Model and reasoning controls remain visible. Existing conversation controllers and the single timeline viewport owner remain in place. Registered extension views now appear in the chooser. A saved extension tab whose registration is missing or broken remains visible with an unavailable reason and recovery/close controls.

## First-party extension workflow

A user opens **+ → PR Review**, asks Pi to review, and creates a fix task:

1. The workbench adds or focuses the extension's tool tab for the selected task. Opening the tab does not start a review.
2. Pi-gui's view host mounts the extension's desktop interface and connects it to the backend for that exact Pi session. The custom frontend and its connection are scoped to the current runtime generation.
3. The user refreshes the real GitHub PR and presses **Review with Pi**. The frontend calls the extension's backend through Chord. Pi's public `sendUserMessage` returns before admission, so the example displays Requested until the matching Pi hook confirms Running. Transcript and normal Stop controls show the actual run.
4. The extension saves its findings in Pi extension state and updates the state exposed to its frontend. The frontend renders the findings with its own layout. Its live state is a projection, not a second durable findings store.
5. **Create fix task** calls a narrow host action which prepares a draft in the PR's checkout. The user sends it through the normal composer.
6. Closing PR Review releases its presentation and subscriptions. Findings and commands remain available. A stale connection or changed task rejects presentation; results remain with the extension and are not automatically replayed.

The **Test Runs** plugin executes fixed local `node:test` suites through Pi's released bash operations, streams bounded output, and supports explicit Stop and timeout. Both are ordinary file-based extensions using the same local helper and host; neither requires a feature-specific desktop IPC route. See the [local author workflow](guides/first-party-extensions.md).

```mermaid
flowchart LR
  W[Conversation and tool tabs] -->|typed requests| P[Preload and validated IPC]
  P -->|explicit task target| D[Desktop owners]
  D -->|session operations| A[Thin Pi adapter]
  A -->|public SDK calls| PI[Pi Coding Agent]
  PI -->|loads once| E[Pi extension backend]
  E -->|registration| A
  A -->|loaded catalog and declarations| V[Desktop view host]
  P -->|scoped Chord messages| V
  V <-->|services and state| E
  V -->|connection replies| P
  D -->|scoped snapshots| W
```

Arrows describe requests/data flow. The renderer never imports the host or Pi implementation.

## Components and ownership

| Component              | Owns                                                                               | Location and change                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell              | Startup/recovery, sidebar, app routes, composition                                 | Slim down `src/app/App.tsx`; keep Settings/Extensions/Skills/schedules reachable.                                                                                                |
| Conversation screen    | Selected task's transcript/composer composition                                    | Currently composed in `src/app/App.tsx` using the existing draft, viewport, attachment and command controllers; a separate screen module is not required for the tab foundation. |
| Workbench              | Current window's per-task tool order, active tool, visibility and view preferences | New `src/features/workbench/workbench.tsx`, `workbench-state.ts`, `use-workbench.ts`; replace the old picker and parallel visibility paths.                                      |
| Tool content           | Files and inner document tabs, review, terminal shells                             | Reuse/adapt existing feature components. A small explicit built-in resolver is enough.                                                                                           |
| Durable layout storage | Validated last-saved layout template per task                                      | Extend `electron/persistence/app-store-persistence.ts`, narrow application-store operations, and IPC. No new renderer localStorage path.                                         |
| Review owner           | Comparison identities, pinned revisions and revision-scoped reviewed marks         | `electron/workbench/review-owner.ts`, `reviewed-store.ts`, and `electron/platform/files/git-review.ts`.                                                                          |
| Checkpoint store       | App-owned Git snapshots, interval metadata and transcript lookup                   | `electron/workbench/checkpoint-store.ts`; receives portable capture boundaries, never drives Pi or task selection.                                                               |
| Desktop view host      | Registration, backend hosts, scoped connections, assets and allowed host actions   | `electron/extensions/extension-view-owner.ts`, `extension-view-source.ts`, `extension-view-actions.ts`; renderer `extension-view-panel.tsx` owns the iframe/port.                |
| Pi adapter             | Session lifecycle and translation to public Pi APIs                                | Extend `packages/pi-sdk-driver` narrowly; no tab layout, Git checkpoint implementation, React, or PR business rules here.                                                        |

Browser-safe contracts live in `apps/desktop/contracts/workbench.ts`, `review.ts` and `extension-views.ts`. `packages/session-driver/src/turn-capture.ts` carries portable capture identities and boundaries. `packages/extension-ui` owns registration, browser host-action types and the Chord wire adapter; `packages/pi-sdk-driver/src/desktop-extension-bridge.ts` adapts discovery to Pi's loaded catalog. Shared packages have no dependency on desktop implementation, and Chord owns service/state semantics.

The workbench reducer is the only writer of live layout in a renderer window. Main's existing persistence owner is the only writer of its durable representation. These are separate responsibilities: main supplies restore templates, not a second live layout controller.

## Task, checkout, and tab identity

Use the existing `SessionRef` (`workspaceId`, `sessionId`) as task identity. A viewed checkout is a separate explicit workspace reference. Never infer operation targets from the globally selected task after awaiting an operation.

```ts
type ToolRef =
  | { kind: "files" }
  | { kind: "changes" }
  | { kind: "terminal" }
  | { kind: "extension"; extensionId: string; viewId: string };

type ToolSelection = { kind: "chooser" } | { kind: "tool"; toolId: string };

interface TaskWorkbenchTemplate {
  visibility: "visible" | "hidden";
  tools: readonly ToolRef[];
  selection: ToolSelection;
  files: FileViewState; // existing document-tab model, checkout + path
  changes: { workspaceId: string; selectedPath: string | null; scope: ReviewScope };
}
```

The reducer and saved-state decoder enforce unique tool identity and selected-tool membership. Invalid external data is rejected before it reaches that reducer. File references are resolved through existing host path validation; a missing file does not silently open an unrelated path.

- One outer tab per built-in tool; Files retains its inner document tabs and Terminal its inner shell tabs. Do not flatten those different resources into the outer strip in this iteration.
- Reopening a tool focuses it. Closing the active tool selects its neighbor; closing the last shows the chooser. Hidden layout retains selection and tool state.
- With no saved layout, existing tasks start with Changes on Uncommitted; a new unsent task starts with its side workspace hidden. Completion may update data but does not steal focus or replace the selected tool. A transcript Review action resolves that exact persisted message to a checkpoint and opens its turn comparison. An uncaptured message stays unavailable instead of falling back to the latest turn.
- Close Terminal's outer tab means close its view. An explicit shell-close action terminates that shell. App/window exit retains existing PTY disposal semantics; restoring a saved tab does not claim a live process survived.
- Settings and Extensions are management routes; entering/leaving them does not mutate task layout. Their return action and Escape restore the prior workspace.
- Each window keeps its own live per-task layouts. Opening the same task in a second window seeds from its last-saved template; subsequent clicks do not rearrange the other window. The last explicit layout change wins the durable template. Serialize writes and reject older saves from the same renderer; async data refreshes never write layout.
- Save only references and small preferences. File bytes, diff bodies, terminal replay, extension results and transcripts remain with their respective owners.

New thread offers Local or Worktree and creates a task in the chosen checkout. A checkout switch does not relocate an existing conversation runtime or live shell. Files/Changes may explicitly browse another checkout.

## Conversation behavior and visual foundation

Keep the existing draft flush before task switch, immediate targeted Stop path, model/think-setting scope, slash/mention discovery, attachments, queue editing, and timeline reading anchors. Preserve current queue/steer semantics and labels during this redesign rather than copying the prototype's simplified simulation.

Use existing `src/ui` and `src/styles` as the single source for typography, spacing, surfaces, borders, controls, focus rings and light/dark colors. Apply tokens to built-in and extension components. Avoid a second component library or extension-specific theme system. Density is a Settings preference affecting spacing; it must not remove composer controls or shrink readable text.

Derive user-facing activity from real runtime events and pending input requests. Persist the last known run outcome needed to distinguish completed, stopped, failed and interrupted work. An app restart without a live recoverable runtime means interrupted; a continuation starts through supported Pi APIs and must not be described as restoring the old JavaScript execution. No new scheduler or custom agent loop is part of this plan.

Success includes keyboard access, stable composer focus, sensible empty/error states, long transcripts, background completion/unread state, and truthful run controls. Keep the existing timeline viewport owner as the sole scroll writer.

## Review is a comparison, not a panel mode

```ts
type ReviewScope =
  | { kind: "uncommitted" }
  | { kind: "staged" }
  | { kind: "unstaged" }
  | { kind: "branch"; baseRef?: string }
  | { kind: "turn"; checkpointId?: string };

getReview(input: { target: SessionRef; checkoutId: string; scope: ReviewScope }): Promise<ReviewResult>;
getReviewFile(input: { reviewId: string; fileId: string }): Promise<ReviewFileResult>;
getTurnChanges(input: { target: SessionRef }): Promise<TurnChangesResult>;
```

The [review contract](../apps/desktop/contracts/review.ts) returns `available | stale | unavailable | failed`. Available results include an immutable comparison identity, resolved checkout/revisions, file identities and `complete | partial` coverage with notes. The [review owner](../apps/desktop/electron/workbench/review-owner.ts) retains up to 16 comparisons in memory. File reads, reviewed marks and staging use the returned comparison/file IDs; evicted or changed comparisons require Refresh. The requested scope is persisted, but asynchronous resolution never writes layout: Branch without `baseRef` resolves the repository default again on refresh; Last turn without `checkpointId` means latest. `getTurnChanges` lists each captured turn's changed files with line counts; the timeline shows them as a card after that turn, and opening a file from it stores that turn's exact checkpoint ID.

Reviewed marks live in host-owned `reviewed-files.json`, keyed by task, checkout, scope and file-content identity. Changes invalidate the relevant mark, and restarting can retain marks for unchanged content. Renderer-local path-only marks are no longer read or written; old bytes are left intact. Temporary Git errors do not erase marks.

| Scope       | Meaning                                                                                                | Edge behavior                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uncommitted | HEAD to current tracked contents, plus nonignored untracked files; staged/unstaged indicators retained | Partially staged files expose both portions, including staged changes cancelled by later edits. Empty/unborn repositories use an empty baseline.                              |
| Staged      | HEAD to index                                                                                          | Excludes unstaged edits; permits Unstage after freshness checks.                                                                                                              |
| Unstaged    | Index to current contents                                                                              | Excludes staged-only edits; permits Stage after freshness checks.                                                                                                             |
| Branch      | Merge-base of selected base and HEAD to pinned HEAD                                                    | Excludes dirty edits. Default resolution prefers the tracking remote's HEAD, then a sole remote HEAD, then the branch's upstream. Missing or unrelated bases are unavailable. |
| Last turn   | Saved before/after contents for a user-facing interval                                                 | Never substitutes a HEAD diff. Uncaptured/imported history stays unavailable. Stopped/failed/interrupted intervals with both captures carry partial-coverage notes.           |

The working scopes are Uncommitted (HEAD → current bytes), Staged (HEAD → index) and Unstaged (index → current bytes). Separate scopes preserve index changes that cancel out in the combined Uncommitted view. Reads check freshness around file access. Changed content returns stale rather than a new patch under an old identity. Conflict stages, binary files, submodules and truncation receive summaries/coverage. Stage/Unstage applies to working scopes and revalidates the file under a per-checkout mutation queue: Uncommitted permits both, Staged permits Unstage, and Unstaged permits Stage. Branch and turn comparisons remain pinned. **Open in Files** explicitly opens the current file separately from its historical patch.

The hidden [capture extension](../packages/pi-sdk-driver/src/turn-capture.ts) uses Pi's ordinary awaited extension-factory hooks. `agent_start` captures the baseline before tools; a user `message_start` after assistant work closes the previous interval and opens the next with one shared snapshot. Consecutive user messages before assistant work share a baseline. Retry and before-settle continuation retain that baseline; `agent_settled` closes the final interval, and shutdown records interruption. Observer failure/timeout does not block coding indefinitely or fabricate a usable capture.

Checkpoint metadata stores native Pi branch-entry anchors. A separate hidden transcript-identity hook uses released `turn_end.messageEntryId` to attach `sourceMessageId` to live assistant rows; canonical transcript reads carry the same native ID. The Review action uses that source ID, preserving the renderer row identity and timing while the exact captured interval remains addressable before or after transcript reload.

The [checkpoint store](../apps/desktop/electron/workbench/checkpoint-store.ts) owns `userData/turn-checkpoints/objects.git`, its temporary index/spooled bytes, app-owned refs and `checkpoints.json`. It inventories tracked and nonignored untracked paths, then records their actual bytes/modes in that independent bare repository. It does not run clean filters or follow file symlinks; inherited Git routing variables are removed. Source Git objects, refs, index, HEAD, branch and working files remain untouched, including linked worktrees. Initialization publishes a validated bare repository atomically. Metadata records task, checkout, runtime/run identity, entry anchors, outcome, timestamps and tree IDs; finalized checkpoints cannot be rewritten by replay. Restart treats unfinished intervals as interrupted, not recovered live execution.

Capture defaults are 2 seconds, 10,000 paths, 64 MiB total and 16 MiB per file. Sparse entries, submodules, conflicts, unavailable roots and exceeded limits make captures explicitly unavailable. Both review and capture currently require the Git checkout root. Review itself limits lists to 2,000 files, individual content to 8 MiB, patches to 1 MiB, and working-byte preparation to 32 MiB/10 seconds; these limits produce coverage notes rather than a false clean result. Raw-byte patches may differ from Git attribute/EOL conversions, which are reported.

Captures show edits during an interval, including concurrent human or other-agent edits. They cannot prove authorship or an atomic filesystem snapshot. Same-checkout runs carry overlap provenance. Stored turn comparisons can still be read from the independent object store when their original checkout is missing. There is no restore/reset command. Checkpoint retention keeps the newest 50 finalized intervals per task and 500 overall; open intervals are retained. Dropped records or 200 boundaries can schedule background maintenance, at most hourly. Maintenance waits for active captures, clears cached inventories, removes unneeded app-owned refs and runs Git GC in `objects.git`; refs and objects younger than one hour survive. It does not prune the source checkout or Pi session history. The [checkpoint store](../apps/desktop/electron/workbench/checkpoint-store.ts) owns these limits.

## Functional extension views

Pi extensions can provide custom browser interfaces for their own workflows. PR Review renders structured findings and Test Runs renders live process output. Authors receive theme values and bundle their own frontend dependencies; there is no shared React instance or fixed text/button/finding schema. Views cannot replace the app shell.

The [implemented author contract](chord-desktop-extension-design.md) uses the released Coding Agent extension API and Chord service/state primitives. `registerDesktopView` registers from the original Pi extension closure; discovery matches its canonical source against Pi's final loaded catalog. It does not load another backend or use the unimportable experimental Pi plugin entrypoint. Each validated view has one backend facet host per task runtime generation, shared by its windows/connections.

The helper is private, not an npm publication or upstream Pi API. The [author README](guides/first-party-extensions.md) documents local configuration, browser builds, offline checks, terminal fallback, editing and reload. In the historical 0.87 verification, both examples passed desktop workflows, and separate locally packed helper/example tarballs loaded through actual Pi outside this repository. The [verification report](archive/workspace-redesign-verification.md) distinguishes that loader proof from Electron and provider execution.

Pi-gui's view host owns the connection between a registered frontend and a tool tab; the extension owns its domain data, operations and rendering. Loading, ready, unavailable and failed states must be visible. Backend operations require validated inputs, explicit outcomes, bounded pending requests and no automatic replay after an unknown outcome. Use upstream identity, cancellation and replacement behavior where it applies, while retaining explicit task targeting at the desktop boundary. Do not invent parallel lifecycle or state-replication mechanisms by default.

Main binds each connection to its initiating IPC sender, task, view and runtime generation. Actions validate that connection and the window's current task after awaited work and again when a queued state action starts. The renderer persists the outgoing task's pending composer draft before forwarding a draft-creation action, and drops the action if its mount/task changed during preflight. File navigation returns only to the initiating window; closed, crashed or obsolete connections cannot redirect it to the foreground window. The implemented recovery is an unavailable/rejected presentation action with extension-owned results retained, not a new late-result link or inbox. Background state updates do not navigate.

Existing `ctx.ui` compatibility remains for command-only/TUI-oriented extensions. A terminal custom component does not automatically become a desktop interface. Pi's resource discovery, trust decision and diagnostics remain authoritative; no second installer, marketplace or manifest scanner was added.

The frontend mounts in an opaque-origin `sandbox="allow-scripts"` iframe with a dedicated message port. The `pi-extension://<connection>/` route serves only validated local assets below the matched extension entry's directory. Per-connection CSP restricts scripts/styles/images/fonts, denies network fetches and nested frames, and retains the sandbox. Main rejects unrelated frame navigation; the frame receives neither Node nor the app preload API. The actual Electron security tests passed. These boundaries do not sandbox the already-trusted Pi backend, which owns filesystem/network/tool work.

The extension owns commands/tools, execution and saved findings. It uses Pi's extension entries and session-branch lifecycle to restore validated, versioned state. PR results include repository/checkout, PR identity and reviewed head revision; changed heads show stale findings. Desktop snapshots are disposable projections. Closing a view does not unload its backend; hiding it does not cancel work.

Reload/session rebind immediately revokes retired capabilities and reconnects against a new runtime. Desktop discovery notification does not await authored activation/disposal on Pi's lifecycle path; activation has a timeout and late activation is disposed. A failed view stays visible with diagnostics and does not block ordinary conversation or legacy commands. Closing a connection releases subscriptions and rejects waiting browser calls while accepted backend work can finish; an explicit backend cancellation remains separate. Unknown-outcome mutations are never replayed automatically.

The host actions are validated existing-file navigation and preparing an unsent coding-task draft in the connection's checkout. Neither accepts a caller-supplied window/task identity or auto-sends a prompt. The current authoring workflow is local edit → checks/build → Reload view for browser changes, or idle `/reload` for backend changes. A dedicated **Ask Pi to improve this extension** action and npm publication are not implemented; they are not required to use the two local examples.

## Verification and historical scope

Pi Coding Agent and Chord currently use 1.2. The adapter delegates execution to the released SDK; the view host uses Chord remote contracts, client handles and scoped connections. The current [extension design](chord-desktop-extension-design.md) describes the author contract.

The [foundation record](archive/workspace-foundation-verification.md) preserves the original Pi/Pico investigation, upgrade checks, workspace proof and phase plan. The [September final report](archive/workspace-redesign-verification.md) records review/capture and extension-view verification on 0.87. These are historical results, not a current 1.2 regression pass. Use the [baseline](ci-baseline.md) and [isolated desktop guide](guides/isolated-desktop-verification.md) for new checks. Real-provider, native OS and packaged-app proof remain separate lanes.

## Current formats and enforcement

- UI-state accepts v19 only and catalogs accept v2 only. Workbench templates require a review scope. Old inline attachments/transcripts and retired tools are unsupported. Current-format validation, atomic writes, backup recovery and corrupt-file preservation remain; no old-format conversion or migration copy is created. Existing user files are not deleted.
- The workbench replaced `sidePanelMode`, terminal visibility keys and the old picker. Inner Files/Terminal resource ownership remains unchanged.
- Host-owned revision-based reviewed marks replace renderer-local path-only persistence. Old localStorage bytes are left intact and are never applied to new scopes.
- Keep renderer/host/contract/state-owner/timeline guards. Add focused rejected fixtures for renderer-to-Pi/Git/PTY imports, package-to-desktop imports, full-store access from new owners, and direct layout writes bypassing the workbench controller. Use bounded interfaces instead of expanding allowlists.
- Validate external view messages and persistence formats at their entry points. Use exhaustive unions internally; no raw casts to bypass unknown payloads.
- Keep evidence levels separate: the upgrade/workspace foundation have historical proof; the [final report](archive/workspace-redesign-verification.md) records review/capture/custom-view unit, Core, real-provider and local macOS packaged proof. Windows/Linux behavior, notarization and release publication were not exercised.

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                                        |
| ---- | -------------------- | ------------------------------------------------------------------------------- |
| v1   | 2026-10-14 16:56 CST | 同步当前 Workbench、Review 和数据格式，移除旧迁移与退役工具设计说明。           |
| v2   | 2026-10-18 20:18 CST | 同步 Pi/Chord 1.2、独立 Review scope 与 checkpoint 维护，归档旧阶段验证与计划。 |
| v3   | 2026-10-18 20:45 CST | 将维护中插件明确为第一方扩展，同步新目录和使用入口，标注打包内置为规划。        |
