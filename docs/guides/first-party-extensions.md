# First-party extensions: development and loading

> 最后修改时间：2026-10-18 20:45 CST
> 文档版本：v3
> 修改说明：将维护中插件明确为第一方扩展，同步新目录和使用入口，标注打包内置为规划。

GitHub, PR Review, Test Runs, Usage and Trace are first-party plugins maintained by pi-gui in `extensions/`. They use ordinary file-based Pi extensions. Pi loads each `index.ts` once; its
commands, tools, saved session entries, and optional desktop view share that
extension instance. A view is custom browser code, connected to the extension's
service through Chord. It does not require a new app-specific IPC operation.

| Extension                                         | Backend operation                                                                                                                  | Desktop interaction                                                                    | Terminal fallback                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [PR Review](../../extensions/pr-review/README.md) | Ask Pi to review a real GitHub PR at a captured commit and record structured local findings                                        | Refresh PR, review, open a finding's file, prepare an unsent fix task                  | `/pr-review`                                                                       |
| [Test Runs](../../extensions/test-runs/README.md) | Execute fixed demonstration test suites, stream bounded output, stop or time out a process                                         | Choose a suite, run, inspect output, stop                                              | `/tests passing`, `/tests failing`, `/tests slow`, `/tests timeout`, `/tests stop` |
| [GitHub](../../extensions/github/README.md)       | Read the folder's PRs and issues through `gh`; give the model a `github_read` tool for one issue or PR                             | Browse PRs and issues, open one on GitHub, prepare an unsent fix task                  | `/github`                                                                          |
| [Usage](../../extensions/usage/README.md)         | Total token use and cost across the folder's saved threads; write a card after each reply with its time, cost and context used     | Compare threads, see what fills context, open a thread; read the card under each reply | `/usage`                                                                           |
| [Trace](../../extensions/trace/README.md)         | Listen to pi's agent events (turns, model calls, tools, compaction) and record each reply as spans with the context each call sent | Watch a live waterfall of the reply, pick an earlier reply, inspect a call or tool     | `/trace`                                                                           |

The test suites are actual `node:test` fixtures, including an intentional failure;
they are not pi-gui's repository checks. PR Review needs a configured Pi model,
`git`, authenticated `gh`, and the PR head/base commits already present locally.
Neither extension installs dependencies, posts a GitHub review, or merges a PR.

## Maintenance and planned distribution

All five plugins belong to this project and remain under its type checks, lint,
browser-bundle checks and integration tests. Current builds do not automatically
bundle or enable them. Including them as built-in plugins in packaged pi-gui is
planned; resource inclusion, dependency resolution, registration, default enablement
and packaged-app verification must be implemented before that can be claimed.
The plugins continue to use Pi's extension lifecycle and the existing scoped host.

## Build and configure locally

Use this checkout's installed dependencies. `@pi-gui/extension-ui` is a **private,
local workspace package**, not a published npm package or an upstream Pi API.
For this development workflow, keep the extensions in this checkout so their
backend imports resolve through its `node_modules`. The root links the helper
as a workspace dependency. The backend
uses the host's Chord installation; only the browser code bundles its own imports.

From the pi-gui repository root, after the normal repository dependency setup:

```sh
pnpm --filter @pi-gui/extension-ui build
node extensions/pr-review/build.mjs
node extensions/test-runs/build.mjs
node extensions/github/build.mjs
node extensions/usage/build.mjs
node extensions/trace/build.mjs
```

If this checkout previously used `examples/desktop-extensions` in a Pi settings entry, update that entry to the new `extensions` path. No user configuration is rewritten automatically.

Add the absolute paths to the existing `extensions` array in the target project's
`.pi/settings.json`, or `~/.pi/agent/settings.json` for user-wide availability.
Preserve the file's other settings and existing extension entries. For example,
replace `/absolute/path/to/pi-gui` with this checkout's actual location:

```json
{
  "extensions": [
    "/absolute/path/to/pi-gui/extensions/pr-review/index.ts",
    "/absolute/path/to/pi-gui/extensions/test-runs/index.ts"
  ]
}
```

This is Pi's normal local extension configuration. Project-local resources follow
Pi's project trust decision. Do not register `desktop.ts` or `dist/desktop.js` as
Pi extensions. Pi's auto-discovered `.pi/extensions/*/index.ts` and
`~/.pi/agent/extensions/*/index.ts` locations are also supported, but moving these
extensions there requires arranging their backend dependencies too.

In pi-gui, select that project and use **Extensions → Refresh** to reload runtime
discovery and inspect diagnostics, then **Back to app**. This path also works
before a model is configured. In a task with a configured model, `/reload` is
another way to reload the idle runtime after changing extension configuration.
Open the side panel, click **Add tab (+)**, and choose
**PR Review**, **Test Runs**, **GitHub**, **Usage** or **Trace** under **Extension views**. **Refresh views** refreshes
that list. The existing Extensions screen manages Pi extensions; it is not a
separate desktop-view installer.

For a temporary terminal invocation from this checkout, use the installed Pi
entry point and an explicit file path:

```sh
node node_modules/@earendil-works/pi-coding-agent/dist/cli.js \
  -e "$PWD/extensions/test-runs/index.ts"
```

Then enter `/tests passing`. Terminal Pi has no desktop host, so registration
reports `available === false`; the command and agent tool still work. A missing
or broken browser bundle similarly does not remove a successfully loaded Pi
extension's commands. The helper package itself must still be resolvable.

## Install local packages outside this checkout

The extension packages also declare `pi.extensions: ["./index.ts"]` and can be installed as
local packages. After the builds above, pack the helper and the PR Review and Test Runs extensions from
the repository root:

```sh
extension_tarballs="$PWD/records/$(date +%Y%m%d-%H%M%S)-extension-pack"
mkdir -p "$extension_tarballs"
pnpm --dir packages/extension-ui pack --pack-destination "$extension_tarballs"
pnpm --dir extensions/pr-review pack --pack-destination "$extension_tarballs"
pnpm --dir extensions/test-runs pack --pack-destination "$extension_tarballs"
```

In a separate package directory with its own `package.json`, install those local
archives and the matching released Pi packages. Keep `extension_tarballs` set to
the absolute archive directory, or replace it with that path:

```sh
pnpm add \
  "$extension_tarballs/pi-gui-extension-ui-0.0.0.tgz" \
  "$extension_tarballs/pi-gui-extension-pr-review-0.0.0.tgz" \
  "$extension_tarballs/pi-gui-extension-test-runs-0.0.0.tgz" \
  @earendil-works/chord@1.2.0 \
  @earendil-works/pi-ai@1.2.0 \
  @earendil-works/pi-coding-agent@1.2.0
```

Then add the installed **package directories** to the existing Pi `extensions`
setting for the project where you want to use them:

```json
{
  "extensions": [
    "/absolute/path/to/local-extensions/node_modules/@pi-gui/extension-pr-review",
    "/absolute/path/to/local-extensions/node_modules/@pi-gui/extension-test-runs"
  ]
}
```

Pi reads each package's `pi.extensions` declaration. Use the same runtime refresh
and **Add tab** workflow described above. The archives include their prebuilt
browser entry; this installation does not need a browser build. Edit source in
your authoring checkout, rebuild, repack, and reinstall an updated archive before
reloading the installed copy. Installing a tarball creates a separate copy; later
source edits do not update it automatically.

This path was verified with the actual packed files installed in a separate
temporary project, using Pi/Pi AI/Chord 1.2.0 and an offline cached dependency
set. The normal `pnpm add` command above can obtain those released dependencies
from the registry. The proof confirmed that every package resolved inside the
external project's `node_modules`, both real TypeScript entry points loaded with
zero Pi diagnostics, their commands/tools and desktop declarations registered,
and their browser assets existed under the loaded package directory. That
installation check did not execute backend actions or render Electron; the
separate desktop tests exercise those paths. No public npm publication of the
helper or extensions is implied.

## Edit and reload

| Changed files                                               | Apply the change                                                  | What remains                                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Browser `desktop.ts`, CSS, or browser dependencies          | Run that extension's `build.mjs`, then **Reload view** in its tab | Same Pi backend, accepted work, and saved results                                                    |
| Backend `index.ts`, tools, state logic, or view declaration | Finish or stop active work, then `/reload` in the task            | Versioned entries restore the current Pi branch's results; unfinished work is not claimed to be live |
| Shared service contract                                     | Rebuild the browser, then `/reload` and reopen/reload the view    | Both ends use the updated contract                                                                   |

Closing a view releases its connection and subscriptions. It does not disable
the extension or stop accepted backend work. Test Runs has an explicit **Stop**
action. A PR review uses Pi's normal task Stop control. **Reload view** only
reconnects the browser; it does not reload backend code or recover a rejected Pi
request.

The browser exports `mount(root, host)` and returns a disposer. Wait for the scoped
service handle's `ready` before reading state or subscribing. Observe
`host.signal` so a closed view does not reuse stale capabilities. The host supplies
theme colors and scoped `openFile` / `prepareTaskDraft` / `openUrl` / `openThread`
actions; a prepared draft
is editable and is never sent automatically. Define a shared TypeBox `remote`
contract in `contract.ts`; register it with `api.serve` and use `self.state` in
the backend, then acquire it with `host.host.get(...)` in the browser.

## Verify an edit

These commands use the installed repository toolchain and do not launch Electron:

```sh
node extensions/pr-review/test.mjs
node --experimental-strip-types --test extensions/test-runs/test/run-owner.test.mts
node node_modules/typescript/bin/tsc -p extensions/pr-review/tsconfig.json
node node_modules/typescript/bin/tsc -p extensions/test-runs/tsconfig.json
node extensions/pr-review/build.mjs --check
node extensions/test-runs/build.mjs --check
```

`--check` bundles in memory and compares the result with checked-in
`dist/desktop.js`; it never overwrites the artifact. Both builders also work when
invoked as `node build.mjs --check` inside their extension directory. The extensions
have scoped lint projects covering their TypeScript source and test files;
generated browser output is excluded from source linting.

The root shortcuts `pnpm test:extensions` and
`pnpm typecheck:extensions` run these test/freshness and type checks.
They are included in the repository baseline and typecheck commands respectively.

PR Review's offline integration test loads the actual `index.ts` through installed
Pi, creates the declared Chord backend, and uses a real temporary Git checkout.
GitHub metadata is a fixture executable and the model has an unauthenticated
fixture provider: it makes no GitHub or provider requests. It proves the real
admission failure path, not review quality.

Pi's public `sendUserMessage` returns `void`. A successful service response
therefore means **Requested**, not that model execution began. Only the matching
`before_agent_start` makes this review **Running**. Authentication or other
preflight failures appear in Pi's extension runtime diagnostics and can leave
the view **Requested**. Resolve the error and `/reload`; restoration shows
**Interrupted**, allowing a new explicit request. Do not automatically replay an
operation with an unknown outcome. A settled turn without the structured
recording tool is **Incomplete**, not a clean review.

Before claiming a desktop feature works, additionally exercise the actual file
and browser bundle in Electron: open both views; run and stop Test Runs; close and
reopen during a run; reload and switch tasks; run a real-provider PR review; open
a real finding; inspect the unsent fix draft; move the PR revision and confirm
stale results cannot prepare a fresh fix. The plugin READMEs describe further
failure cases. Offline tests alone do not establish that product proof.

## 版本修改记录

| Version | Date                 | Change                                                                   |
| ------- | -------------------- | ------------------------------------------------------------------------ |
| v2      | 2026-10-15 12:12 CST | Updated package versions and Chord 1.2 contract guidance.                |
| v1      | 2026-10-14 18:00 CST | Added the desktop extension examples guide.                              |
| v3      | 2026-10-18 20:45 CST | 将维护中插件明确为第一方扩展，同步新目录和使用入口，标注打包内置为规划。 |
