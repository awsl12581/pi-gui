# Workspace 基础阶段与 Pi 0.87 验证记录

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v1
> 修改说明：归档旧版 Pi 调研、基础验证与阶段计划，保留结果及限制。

本文从原 Workspace 设计抽出，保留九月 Pi/Pico 调研、升级与工作台基础验收、原阶段计划。下文的版本、命令、通过数量和未来措辞均属于当时范围，不作为当前实施待办。当前行为见[Workspace 设计](../workspace-redesign-plan.md)，后续验收见[历史验证报告](workspace-redesign-verification.md)。

## Pi and Pico compatibility

The initial upgrade moved Pi Coding Agent and Chord from 0.85.1 to 0.87.0. The subsequent UI polish pass updates both to [0.87.1](https://github.com/earendil-works/pi/releases/tag/v0.87.1), published with GPT-6 Sol/Luna support. Staying current is a product requirement. The upgrade separates visible transcript history from model-context edits and finalizes desktop runs at Pi's settled boundary; verification results are recorded with the upgrade.

Keep three evidence levels distinct:

- **Released Coding Agent SDK:** the adapter uses the package root's existing session/extension integration, with the completed upgrade proof below. Version 0.87.0 changed session/context ownership and event boundaries; future upgrades still require runtime verification.
- **Released Chord package:** the implemented desktop host uses its services, state codecs and facet lifecycle independently of Pi's experimental plugin host. Earlier Node/browser probes and current Electron integration are different evidence levels.
- **Experimental Coding Agent/Pico integration:** repository code is not automatically an importable npm API. The [0.87.0 package manifest](https://github.com/earendil-works/pi/blob/v0.87.0/packages/coding-agent/package.json) gives `./experimental/plugin` only a `source` export and excludes experimental build output from published files. The installed import failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`; the design therefore uses the existing public extension API. Upgrading the Coding Agent does not enable desktop facets automatically.

Cached `origin/pico` at `eed5263cdd2bd049f743965b7564626abafa8e8f` informed earlier research, but it is not the design baseline. Use the selected release's source and published artifacts for implementation decisions. Any proposal-only or branch-only capability must be labeled separately.

Before freezing the extension SDK or capture hooks, record the exact release, package exports, integration example and remaining host gap, and exercise a minimal integration on that version. Keep only the GUI functionality Pi does not supply. Do not import an experimental Pico scheduler or introduce another session database for the frontend redesign.

## Historical verified upgrade baseline — September 22, 2026

Pi Coding Agent 0.87.0 is implemented and verified. Visible history now uses Pi's original session entries instead of its edited model context. Desktop completion waits for `agent_settled`, while individual assistant messages keep separate rows. Extension `waitForIdle` also follows the public session boundary. Deterministic tests exercise the installed Pi runtime, including continuation, retry, cancellation, context edits and extension-initiated runs.

- `pnpm check` passed with an isolated `PI_CODING_AGENT_DIR`: formatting, lint, architecture checks, typechecks and baseline tests, including 142 desktop unit tests.
- Fourteen focused Core Electron tests passed: extension continuation, dock/reload, dialogs, session isolation, provider models and tree navigation.
- The visible real-provider conversation recipe passed all ten checkpoints with `openai-codex/gpt-5.6-sol`: sending/streaming, reading during output, tools, switching during a run, stop, drafts, archive/restore and restart. The captured trace had no errors. This used freshly built development Electron, not the packaged app.
- The macOS arm64 packaged app launched and created a thread through its real UI. Packaged model-registry, provider implementation imports, native dependency presence and recursive Pi dependency-version checks passed. The recursive audit covered 137 packages. Staging pins and two explicit nested copies prevent the packager from silently selecting incompatible versions.
- Independent review found and rechecked the assistant-message and idle-boundary fixes; no concrete findings remain in the final reviewed changes.

Local evidence is retained under `.artifacts/pi-087-upgrade/` and `.artifacts/verify-pi-gui/run-vYTlSs/`. The Chord probes and their scope are documented in the [extension design](../chord-desktop-extension-design.md). Windows/Linux packaging, notarization and the proposed custom-view Electron host were not verified or implemented in the upgrade. The subsequent daily coding polish and tool tabs are described above.

## Historical workspace foundation verification — September 22, 2026

P0.1/P0.2 now run in the actual Electron app. `pnpm check` passed with an isolated Pi profile, including formatting, lint, architecture boundaries, workspace typechecks and 165 desktop unit tests. Fifty-two distinct fixture-backed Core cases passed across the focused runs. These cover tab lifecycle, task and Settings return, independent windows, restart/drafts, file navigation, Changes, worktrees, shell survival, visible image attachment and oversized-image error recovery. Six inspected screenshots cover populated Files, Changes and Terminal at 1280 and 1040 pixels.

The first runs exposed stale tests for the removed title/picker controls and one real missing behavior: Escape from Settings did not return to the task. The implementation now handles Escape while respecting nested dialogs, and the task layout/draft/restart test passes. Independent review also caught a late last-shell close callback that could target a newly selected task; unmount now invalidates that callback. Both fixes were rechecked. The narrow-window provider notice was corrected and recaptured.

The visible `openai-codex/gpt-5.6-sol` conversation proof passed all ten checkpoints in `run-Kbam6L`: send/stream, reading and typing during output, completion, switching during a tool run, real tool output/file creation, Stop, draft isolation, archive/restore, and both conversations after restart. The maintenance proof passed all seven checkpoints in `run-E5XxGQ`, including Skills Try/aliases, pinning while running, thread-list expansion, permanent worktree creation checked against Git, and real queued follow-up/steering. No assertion failures were recorded. The conversation and follow-up traces were opened in the trace viewer and showed no errors; screenshots and the retained tool result were inspected. All four owned Electron processes exited.

The detailed fixture evidence and baseline log are retained under `.artifacts/workbench-redesign/`; the two provider runs are under `.artifacts/verify-pi-gui/`. This proves the built-in workspace foundation in freshly built development Electron. It does not establish Branch/Last turn review, custom Chord frontend hosting, packaged installation, or Windows/Linux behavior.

## Implementation phases and release gates

P0.0–P0.2 are the previously verified baseline. P0.3/P0.4/P1.1/P1.2 are **implemented and verified** within the macOS scope of the [final report](workspace-redesign-verification.md). Focused Git/capture/transport checks, 27 distinct Core cases, real-provider conversation/maintenance/PR execution, external local-package loading and local packaged-app proof are recorded separately. The real-provider PR test uses fixture GitHub metadata; it does not establish live GitHub access or posting.

| Priority | Deliverable                                                                                               | Exit proof                                                                                                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0.0     | Upgrade to the latest released Pi Coding Agent and audit its extension/Chord integration                  | Record release and published exports; pass adapter checks plus real Electron send/stream/stop, model/provider, extensions, session restore and packaged-runtime proof. Identify experimental gaps before choosing a view contract. |
| P0.1     | Shared visual tokens, conversation composition and visible model/reasoning controls                       | Real Electron send/stream/stop, draft switch, attachment, queue/steer, input/failure and long-transcript flows still work.                                                                                                         |
| P0.2     | Replace the old picker/visibility paths with task-local tabs and durable layout                           | Add/focus/close/hide; inner file/shell tabs; task and Settings return; two windows; restart without losing drafts or fabricating PTY recovery.                                                                                     |
| P0.3     | Correct selected-checkout Uncommitted review and branch comparison                                        | Real temporary Git repositories prove partial staging, rename/delete/untracked/conflict/binary cases, dirty branch exclusion, missing base, stale response and reviewed-mark behavior.                                             |
| P0.4     | Captured Last turn review                                                                                 | Awaited capture blocks the first tool; queued follow-up/steer, retry, cancellation, overlapping runs, failure and relaunch preserve truthful provenance. Capture cost is measured on a large checkout.                             |
| P1.1     | One functional PR Review Pi extension + custom desktop frontend using upstream primitives where supported | Prove browser loading and the installed-package authoring path; register/open/review/update/close/reopen; fix-task draft; session/window isolation; stale PR; malformed data; reload/disable/late replies.                         |
| P1.2     | Test Runs second extension and documented local author workflow                                           | Load both files through Pi's normal configuration; prove the same contract, local edit/build/reload recovery and terminal fallback. The private helper is not published to npm.                                                    |
| P2       | Additional surfaces and advanced orchestration UX                                                         | Separate product/design pass using the released Pi capabilities. Existing orchestration/schedules remain reachable throughout earlier phases.                                                                                      |

The implementation followed the upgrade → workspace → review/capture → extension-host order, and the final gates above passed. P2 remains a separate product scope. Later Pi upgrades remain focused compatibility changes; capture, transcript identity and discovery hooks are explicit compatibility boundaries.

Use the existing [verification skill](../../.agents/skills/verify-pi-gui/SKILL.md) and [baseline](../ci-baseline.md). `pnpm check` is the baseline; targeted desktop specs go through the existing `test:e2e:runner` or named Core scripts. Extend the existing `workspace-files`, `changed-files`, `integrated-terminal`, `composer-draft-sync`, `multi-window`, persistence/reopen, extension-dialog/dock/reload/isolation and worktree coverage. Add deterministic checkpoint and bridge integration fixtures. Then run the real-provider conversation/maintenance recipes with an isolated profile. Packaging/native behavior has its own proof; it is not established by browser prototypes or Core fixtures.

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                               |
| ---- | -------------------- | ------------------------------------------------------ |
| v1   | 2026-10-18 20:18 CST | 归档旧版 Pi 调研、基础验证与阶段计划，保留结果及限制。 |
