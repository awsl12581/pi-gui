# GitHub CLI runtime

> Last modified: 2026-10-15 12:45 CST
> Document version: v1
> Change: Document the bundled Windows GitHub CLI and platform resolver.

The desktop package carries GitHub CLI `2.102.0` for Windows x64 under
`apps/desktop/resources/gh/win32-x64/gh.exe`. The resource manifest records the
release archive and executable SHA-256 values. Windows packaging includes this
directory through the Windows-specific `extraResources` configuration.

`@pi-gui/platform` exposes `resolveGitHubCli`. It prefers the bundled executable
when the caller supplies the packaged resource root, then falls back to `gh` on
the system PATH. It returns the resolved executable and a `bundled` flag, and
uses the existing validated `runProcess` implementation for argument-safe calls.

The resolver is intentionally independent of PR Review. Existing callers can be
migrated later by injecting the returned `GitHubCli`; this change does not alter
their current process invocation.

macOS and Linux have only static path/configuration coverage in this stage. Their
CLI binaries are not included until platform-specific release artifacts are
approved.

## Version history

| Version | Date                 | Change                                                           |
| ------- | -------------------- | ---------------------------------------------------------------- |
| v1      | 2026-10-15 12:45 CST | Documented the Windows bundled GitHub CLI and platform resolver. |
