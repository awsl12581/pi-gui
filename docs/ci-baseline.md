# CI baseline and adoption plan

> 最后修改时间：2026-10-18 20:18 CST
> 文档版本：v3
> 修改说明：同步五套示例及 Platform、Catalogs 和架构检查范围，收敛已有边界校验的维护要求。

The current design is renderer → narrow preload API → main-process app store →
Pi SDK driver → Pi runtime. Desktop UI state and Pi session state have separate
persistence owners. The first CI pass strengthens verification of this design;
it does not change those boundaries.

## Shared baseline

Run `pnpm check` locally and in the existing CI typecheck job. It runs:

1. `pnpm format:check`: pinned Prettier checks source, tests, scripts, styles,
   configuration, and Markdown. `pnpm format` fixes formatting locally. Generated
   output, lockfiles, dependencies, and local artifacts are excluded. The
   100-column print width is a wrapping target, not a hard length limit.
2. `pnpm lint`: builds shared package declarations first so a clean checkout
   has the same type information as a developer checkout, then runs ESLint correctness checks on app, package, test and helper
   source. It rejects debugger statements, async Promise executors, duplicate
   cases/keys, unreachable code and other configured errors. It does not format
   files or ban explicit `any`. Type-aware rules also reject unhandled/misused
   promises and unsafe assignment, argument, call, member access, and return
   operations on `any`. A bare `void` does not silence the promise rule.
   Compiler escape comments `@ts-nocheck` and `@ts-ignore` fail lint;
   `@ts-expect-error` requires a description. Guard tests compare pnpm's discovered
   workspaces with the real typed-lint configuration, so adding a workspace
   without typed-lint coverage fails the baseline. Generated-output exclusions
   are scoped to output locations, not similarly named folders inside source.
3. `pnpm check:architecture`: runs renderer-boundary, contract-authority,
   host-boundary and timeline-owner checks. The renderer check follows reachable
   local runtime helpers and rejects Node, Electron, Pi runtime, and main/preload
   implementation imports. Explicit type-only imports and pure shared helpers
   remain valid. The other checks enforce contract ownership, package dependency
   direction and the timeline scroll owner.
4. `pnpm typecheck`: builds shared declarations, then checks every workspace,
   including the website and extension helper. It also checks all five
   desktop extension examples: PR Review, Test Runs, GitHub, Usage and Trace. First, `check:workspaces` asks pnpm for
   its workspace list and rejects missing or empty typecheck scripts, so a new
   workspace cannot silently skip checking. This checks script presence, not
   whether a deliberately misleading script performs a real typecheck. Existing strict TypeScript settings
   remain in place.
5. `pnpm test:baseline`: guard tests, Platform, Catalogs, driver and extension-helper tests, all five
   desktop extension examples and browser-bundle freshness, release-helper tests,
   and desktop unit tests (including failed-action state preservation).

Guard tests exercise the actual lint configuration with invalid and valid input.
They also run Playwright discovery with CI enabled and prove a focused `.only`
test fails while an ordinary test is discovered. Discovery launches no browser.
Root `pnpm e2e` delegates to the desktop core command, which builds first and
uses the canonical desktop Playwright configuration. The root Playwright config
shares that configuration instead of maintaining weaker independent defaults.

The Electron Core suite runs on four separate runners with `--shard=N/4`. Pull
requests run it on Ubuntu under Xvfb and openbox with two Playwright workers per
runner, so PRs don't queue for the account's few macOS runners. Pushes to `main`
run it on macOS with one worker per runner, so macOS-only specs and regressions
surface there, after merge. File groups are assigned automatically; every
shard must pass the stable `desktop-core` aggregate. Per-shard JSON reports,
file timing summaries, and failure artifacts are retained. Discovery guards
prove the four shards cover the full suite exactly once.

Core includes credential-free local-extension and injected-event regression
coverage. Real-provider tests live in `tests/live`; real OS focus/clipboard
coverage lives in `tests/native`. Neither a stubbed event nor an all-skipped
provider suite establishes real-provider proof. Node-only tests, including
local Git worktree contracts, run in the baseline unit lane.

`pnpm verify:release-config` also enforces the GitHub Actions Node 24 allowlist
for every workflow. Guard tests cover that policy. Application Node supports majors 24–26 (`>=24.0.0 <27`), with CI pinned to 24;
action runtimes are a separate pin.

The website build, Linux installation/package and
Windows package jobs remain separate. `pnpm check` alone does not prove these
surfaces. Real-provider and native desktop verification retain their own lanes.
The final `CI required` job accepts only success from all five existing jobs.
See [merge enforcement](merge-enforcement.md) for its contract and remote
activation status. Repository branch rules must require this result before it
blocks merges; local tests alone do not establish remote enforcement.

## Maintaining boundary validation

Main already decodes Review and extension-view IPC requests through dedicated
request modules. UI-state, attachment, catalog and scheduled-task owners validate
their own saved formats; malformed or unsupported data must not be overwritten.
See the [architecture](architecture.md) for ownership and recovery rules.

For changed IPC or persistence paths, inspect the actual external boundary and
maintain its decoder and authoritative contract. Existing decoders do not prove
that every IPC route is fully hardened; identify a concrete unchecked input before
adding a task. Keep schema-skew, invalid-shape and failed-action preservation
coverage where they protect current data. Ordinary features follow the static
check requirements in AGENTS.md; new tests are reserved for overall flows,
high-risk operations and unusual failure cases.

For every new rule, show a representative violation fail, restore a valid case,
and run the affected product lane. Retain evidence under `records/` and distinguish
passed, failed and blocked coverage; a settings smoke does not establish a working
conversation. Local isolated runs must follow the [verification guide](guides/isolated-desktop-verification.md)
to keep builds, temporary directories and output in the run directory; CI workflow
artifact paths are described separately above.

## Renderer architecture guard

`scripts/check-renderer-boundary.mjs` parses TypeScript syntax and uses the
renderer tsconfig to resolve imports. It follows local runtime imports and
re-exports through workspace aliases and `.js` specifiers pointing at TypeScript
source. Cycles are visited once. It checks resolved npm package identities too.

For example, renderer → shared barrel → helper → `node:fs` fails at the helper.
The repair is to request the operation through the preload API. A type-only
import from that same module is allowed because it loads no runtime code.

Literal dynamic imports and `require` calls are checked; computed module loading
fails because its destination cannot be established. Vite `import.meta.glob`
also fails; use literal imports so every dependency can be checked. Unresolved runtime imports
and runtime imports backed only by local declaration files also fail. Tests
prove representative forbidden imports fail and valid browser code passes.
Worker and SharedWorker module URLs are checked too. Use whole-statement
`import type` or `export type` for erased dependencies: inline type specifiers
can preserve module side effects under `verbatimModuleSyntax`, so the guard
treats those statements as runtime dependencies.

Scope: this checks first-party static module dependencies. It does not audit
third-party package internals, arbitrary runtime code evaluation, IPC payload
validation, or hostile changes to the guard itself. Review and repository rules
still need to protect the checks.

## 版本修改记录

| 版本 | 修改时间             | 修改内容                                                                       |
| ---- | -------------------- | ------------------------------------------------------------------------------ |
| v1   | 2026-10-14 21:10 CST | 将应用 Node 基线改为 24，明确支持 Node 24–26。                                 |
| v2   | 2026-10-15 10:44 CST | 移除视频工程的 lint 与类型检查范围说明。                                       |
| v3   | 2026-10-18 20:18 CST | 同步五套示例及 Platform、Catalogs 和架构检查范围，收敛已有边界校验的维护要求。 |
