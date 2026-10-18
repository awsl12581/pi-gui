# Custom desktop extension views with Chord

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v1
> 修改说明：同步 Chord 1.2 作者契约、传输限制和导航确认，拆出旧版探测与验收证据。

The current implementation uses Pi Coding Agent and Chord 1.2. The private helper registers optional desktop views from the original Pi extension instance. This document describes the current code; it does not claim a fresh Electron, real-provider or packaged-app verification. See the [author workflow](../examples/desktop-extensions/README.md) for local use and the [historical report](archive/workspace-redesign-verification.md) for the September 0.87 validation scope. The helper is not published to npm.

## Decision

An existing Pi extension can register an optional desktop frontend, with Chord connecting its backend services and state to that frontend. Pi-gui owns tab placement, browser loading and the permitted desktop actions. The author owns the workflow and interface.

For example, PR Review remains a Pi extension. Its backend performs the review and saves findings; its desktop frontend draws the findings and review controls. Clicking Review calls the backend. Updated findings flow through Chord. Closing the tab disposes its frontend subscription, not the findings or backend work.

An extension without a desktop frontend keeps its existing commands, tools, dialogs and widgets. A terminal component is not converted into a web component. The optional GUI helper must gracefully report that no desktop host is present when the extension runs in terminal Pi.

## Author contract

The implemented contract has two entries in the existing extension package:

1. The normal Pi extension entry registers its commands/tools and optionally calls a Pi-gui helper with a view ID, title, browser asset location and a backend facet factory. The factory closes over that same extension instance. Do not load a second backend from a parallel plugin scanner.
2. A prebuilt browser ES module mounts the custom interface into a supplied root and returns a disposer. It acquires the backend's shared TypeBox remote contract through the supplied Chord client host. Its framework dependencies are bundled; it cannot assume access to the app's React instance or Node modules.

This is Pi-gui's local helper API, not an upstream Pi API or published npm package:

```ts
export default function extension(pi: ExtensionAPI) {
  // Existing Pi commands and tools remain here.
  registerDesktopView(pi, {
    id: "pr-review",
    title: "PR Review",
    source: import.meta.url,
    frontend: new URL("./dist/desktop.js", import.meta.url),
    backend: () => createReviewFacet(pi),
  });
}

// dist/desktop.js exports this browser entry:
export function mount(root: HTMLElement, host: DesktopViewContext): () => void {
  // Connect Chord services, render the author's UI, return cleanup.
}
```

[`@pi-gui/extension-ui`](../packages/extension-ui/README.md) is a private workspace package. `registerDesktopView` returns `{ available, dispose }`; terminal Pi can report no desktop host while the extension's commands/tools continue to work. Availability acknowledges discovery, not successful source validation or backend activation. `DesktopViewContext` supplies `host: Pick<Host, "get" | "root">`, theme values, an abort signal and `openFile` / `prepareTaskDraft` / `openUrl` / `openThread` actions. The backend facet calls `api.serve` with a shared TypeBox `remote` contract and owns live state through `self.state` and Chord cells. The browser calls `host.host.get(Contract, input, { at: "desktop-extension" })`, awaits `ready`, subscribes to its state and releases the handle during cleanup. Bundle Chord, TypeBox and the contract module with the browser entry. The [Test Runs contract](../examples/desktop-extensions/test-runs/contract.ts), [backend](../examples/desktop-extensions/test-runs/index.ts) and [browser entry](../examples/desktop-extensions/test-runs/desktop.ts) show the complete API.

## Owners and flow

| Owner                  | Responsibility and interface                                                                             | Implemented location                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Author helper          | Register/replay desktop declarations through the Pi extension API; no package scanning                   | `packages/extension-ui/src/index.ts`, `browser.ts`                                          |
| Pi adapter             | Inject the per-session discovery bus before Pi loads extensions; forward registrations/lifecycle changes | `packages/pi-sdk-driver/src/desktop-extension-bridge.ts`                                    |
| Desktop extension host | Own per-session Chord backend host, registration catalog, frontend capabilities and cleanup              | `apps/desktop/electron/extensions/extension-view-owner.ts`                                  |
| Asset handler          | Validate loaded extension identity and contain browser asset reads                                       | `electron/extensions/extension-view-source.ts`, `extension-view-owner.ts`                   |
| IPC and host actions   | Validate main-frame sender/connection, scope file navigation and draft creation                          | `electron/ipc/extension-view-requests.ts`, `electron/extensions/extension-view-actions.ts`  |
| Frame controller       | Mount/unmount a view, exchange a dedicated message port, show unavailable/error states                   | `src/features/extensions/extension-view-panel.tsx`, `use-extension-views.ts`                |
| Browser bootstrap      | Supply the host-owned bridge and mount the author's ES module                                            | `electron/extensions/extension-frame-document.ts`, `packages/extension-ui/src/transport.ts` |
| Workbench              | Add/focus/close tool tabs; persist extension/view references                                             | `src/features/workbench`, `contracts/workbench.ts`                                          |

Desktop paths in the table are relative to `apps/desktop`. Dependency direction remains renderer → narrow preload → desktop host → Pi adapter. Browser-safe desktop requests live in `contracts/extension-views.ts`; the local helper owns registration/action/wire types, and the Pi adapter owns its observer interface. Portable packages never import desktop implementation. The host does not export a general Pi object to the browser.

The small EventBus adapter is **discovery only**. It transports a declaration inside the trusted Node process because released Pi does not expose a desktop registration hook. It does not recreate Chord calls, subscriptions or replicated state. Host listeners exist before extension loading, and discovery can replay the same declaration without running the extension factory again. Registration failure appears in extension diagnostics. Backend declarations carry code and remain entirely outside renderer IPC.

After Pi finishes loading, the host matches the declaration's source real path against the final loaded extension catalog, rejecting missing/ambiguous origins and duplicate IDs. It assigns task, extension, view and runtime-generation identity. Each validated view has one backend facet host per task runtime generation; multiple windows receive separate connections to that host. Replaying discovery does not reactivate the same declaration. Because existing Pi extensions are trusted Node code, source matching prevents accidental misrouting; it is not authentication against a hostile installed backend.

Opening a tab requests a connection bound by main to that task/view and initiating window. The frame sends validated JSON messages over its dedicated port; preload and main route only that connection. The adapter uses Chord `createHost` and `ipcLink` with the `{ chord2: ... }` envelope. The backend accepts connections as clients with a host-assigned `desktop-view` principal. Browser hold requests must target that backend host and a remote contract; forwarded principals, child-host routing and browser-supplied call roots are rejected. Chord owns frame validation, calls, cancellation and state codecs. Main validates the registered main-frame sender and live connection, and exposes only the view's advertised services. File navigation, draft preparation, https links and opening a thread in the same folder are separate narrow host actions.

## Custom frontend boundary

The renderer mounts an iframe with `sandbox="allow-scripts"`, an opaque origin and no same-origin, popup or top-navigation grants. It receives neither Node nor the parent preload API. The initial port handshake targets that exact frame and checks the parent source plus connection ID; later messages use only its dedicated port. Main rejects frame navigation outside the live connection's document route. The frame controller detects frame reload and offers a fresh connection instead of reusing old capabilities.

Authors ship prebuilt browser ES modules and local assets beneath the canonical directory of the matched Pi entrypoint. Main resolves each asset's real path, rejects traversal/symlink escapes, and serves it through `pi-extension://<connection>/assets/…`. The route checks a live connection and rechecks it after file reads. The app supplies its own bundled frame bridge from `/_host/frame-bridge.js`; there is no general filesystem endpoint. Per-connection CSP allows only those scripts/assets and local styling, denies network fetches, workers and nested frames, and repeats the sandbox policy. Network/file/tool work runs in the extension backend. Mounting never installs packages, runs builds or supplies Node-style `require`.

The helper can be consumed through local workspace resolution or locally packed packages and Pi's normal extension configuration. The [author README](../examples/desktop-extensions/README.md) explains dependency placement and project trust; the host does not install or discover packages independently. The historical Electron containment checks are recorded separately; they do not sandbox the already-trusted Pi backend or prove the current version passed a new run.

## State and lifecycle

Pi session entries remain the durable owner of extension results. Chord state is the live projection. Desktop UI storage saves tab references and small presentation preferences only. Closing a view releases its port/subscriptions and mount resources; closing it does not cancel an ongoing review.

Each open window/view gets its own connection to the task/view's backend host. Main captures the task and sender rather than trusting identities in an action payload. It validates the current task after filesystem checks and at execution in the window action queue. Draft creation first awaits explicit-target persistence of the outgoing renderer draft and abandons forwarding if its task/mount changed. Closed, navigated or crashed renderers invalidate connections. A late presentation action is rejected/unavailable; the extension retains its results. Thread navigation is deferred until the frame acknowledges its host-action result: the frame resolves the Promise and posts a request-ID acknowledgement in a microtask. Main checks connection/sender ownership, waits at most 10 seconds for consumption, and revalidates before committing the navigation. This orders immediate Promise handlers before view teardown; it does not wait for arbitrary asynchronous author work. There is no automatic foreground-window fallback or new late-result inbox.

Pi extension reload invalidates old view connections before asynchronous cleanup, then rebuilds registrations against the next runtime generation. The hidden discovery extension invokes desktop notifications without awaiting authored view activation/disposal on Pi's lifecycle path. Activation has a 10-second default timeout; a host that finishes after timeout or invalidation is disposed. Backend code remains trusted and cooperative. A broken asynchronous view must not hold an ordinary Pi session start/shutdown open.

**Reload view** reconnects the browser against the existing backend; backend edits use idle `/reload`. Closing a connection releases its Chord subscriptions and rejects waiting browser requests but does not cancel already accepted backend work. Explicit cancellation propagates the request's abort signal. Runtime/backend disposal owns broader teardown. Chord replacement within a live host does not preserve an obsolete Pi extension closure, and unknown-outcome mutations are never replayed automatically.

## Practical limits and examples

The transport limits an encoded message to 2,000,000 characters, outstanding hold, call and subscription IDs to 256 per category on each server connection. Duplicate IDs in a category are rejected. Chord owns subscription delivery. The frame controller buffers at most 128 messages before opening/mounting and allows 10 seconds to become ready. Narrow host actions have a separate 32-pending limit per connection. Overflow and activation/mount failure produce explicit errors; these limits are not a promise that arbitrary authored code will finish promptly.

[PR Review](../examples/desktop-extensions/pr-review/README.md) uses authenticated `gh`, existing local Git objects and the configured Pi model. It records versioned local findings in Pi session entries, checks revision/location identity, and prepares an unsent fix draft. Requested, Running, Incomplete and interrupted states are distinct because Pi's public submission API does not acknowledge provider admission. It neither posts a GitHub review nor fetches/merges a branch. Its current bounds include 20-second commands, 1 MiB output, 200 changed files and 20 findings.

[Test Runs](../examples/desktop-extensions/test-runs/README.md) executes fixed demonstration `node:test` suites through Pi's bash operations. It retains the last 32 KiB of output with a truncation notice, supports Stop/timeout, and restores the current Pi branch's 20 most recent run records. These are real child processes, not the repository's full checks. The browser sends suite IDs rather than shell commands. Both examples share the same author contract and support terminal commands without a desktop host.

The implemented author workflow is local edit, checks, browser rebuild and explicit reload. The helper remains private; npm publication and a dedicated **Ask Pi to improve this extension** action are not part of this implementation.

## Verification scope

The [September verification report](archive/workspace-redesign-verification.md) and [0.87 feasibility probes](archive/chord-feasibility.md) are historical evidence. Their passing results do not certify the current 1.2 protocol.

The [Pi package review](reports/pi-packages-and-extension-architecture.md) records the 1.2 migration's type checks, transport and view-owner tests, and five example bundle builds, together with its Windows GitHub CLI and real-provider verification limits. This documentation update does not add product test results. Use the [isolated verification guide](guides/isolated-desktop-verification.md) for new runs and retain all new evidence under `records/`.

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                              |
| ---- | -------------------- | --------------------------------------------------------------------- |
| v1   | 2026-10-18 20:18 CST | 同步 Chord 1.2 作者契约、传输限制和导航确认，拆出旧版探测与验收证据。 |
