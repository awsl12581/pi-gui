export { PlatformError, AtomicWriteError, ProcessError } from "./errors.js";
export type { PlatformErrorCode } from "./errors.js";
export {
  writeFileAtomically,
  resolveExistingPath,
  isPathInsideDirectory,
  createSymbolicLink,
  probeDirectoryCapabilities,
} from "./files.js";
export type { AtomicWriteResult, CapabilitySupport, DirectoryCapabilities } from "./files.js";
export { findExecutable, runProcess, resolveShell, runShellCommand } from "./process.js";
export type {
  ExecutableSearchOptions,
  ProcessOptions,
  ProcessResult,
  ShellKind,
  ShellLaunch,
  ShellCommandOptions,
} from "./process.js";
