import { spawn } from "node:child_process";
import { access, constants, stat } from "node:fs/promises";
import path from "node:path";
import { ProcessError, PlatformError, failure } from "./errors.js";
import { absolute, directory, environment, host, text } from "./validation.js";

export interface ExecutableSearchOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}
export interface ProcessOptions {
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stdin?: string | Uint8Array;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly signal?: AbortSignal;
}
export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
}

function isWindows() {
  return process.platform === "win32";
}
function hasSeparator(value: string) {
  return value.includes("/") || value.includes("\\");
}
async function executableFile(candidate: string, explicit: boolean): Promise<boolean> {
  try {
    const info = await stat(candidate);
    if (!info.isFile()) return false;
    await access(candidate, isWindows() ? constants.F_OK : constants.X_OK);
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (explicit && code === "EACCES")
      throw new PlatformError(
        "permission-denied",
        "findExecutable",
        `Not executable: ${candidate}`,
        error,
      );
    if (code && ["ENOENT", "ENOTDIR"].includes(String(code))) return false;
    throw error;
  }
}

export async function findExecutable(
  executable: string,
  options: ExecutableSearchOptions = {},
): Promise<string | null> {
  const operation = "findExecutable";
  try {
    host(operation);
    text(executable, operation, "Executable");
    const cwd = options.cwd ?? process.cwd();
    absolute(cwd, operation);
    await directory(cwd, operation);
    const env = environment(options.env, operation);
    const explicit = path.isAbsolute(executable);
    if (!explicit && hasSeparator(executable))
      throw new PlatformError(
        "invalid-argument",
        operation,
        "Relative executable paths are not accepted",
      );
    if (explicit) {
      if (await executableFile(executable, true)) return path.resolve(executable);
      return null;
    }
    const pathValue = Object.entries(env).find(([key]) => key.toUpperCase() === "PATH")?.[1] ?? "";
    const entries = pathValue.split(path.delimiter);
    const candidates =
      isWindows() && !path.extname(executable)
        ? [executable + ".exe", executable + ".com"]
        : [executable];
    for (const entry of entries)
      for (const candidate of candidates) {
        const base = entry ? entry : cwd;
        const full = path.resolve(base, candidate);
        if (await executableFile(full, false)) return full;
      }
    return null;
  } catch (error) {
    throw failure(error, operation);
  }
}

export async function runProcess(
  executable: string,
  argv: readonly string[],
  options: ProcessOptions,
): Promise<ProcessResult> {
  const operation = "runProcess";
  try {
    host(operation);
    text(executable, operation, "Executable");
    absolute(options.cwd, operation);
    await directory(options.cwd, operation);
    if (
      !Array.isArray(argv) ||
      argv.some((value) => typeof value !== "string" || value.includes("\0"))
    )
      throw new PlatformError(
        "invalid-argument",
        operation,
        "argv entries must be strings without NUL",
      );
    const timeout = options.timeoutMs ?? 30_000;
    const max = options.maxOutputBytes ?? 8 * 1024 * 1024;
    if (!Number.isInteger(timeout) || timeout <= 0 || !Number.isInteger(max) || max <= 0)
      throw new PlatformError("invalid-argument", operation, "Limits must be positive integers");
    if (
      options.stdin !== undefined &&
      typeof options.stdin !== "string" &&
      !(options.stdin instanceof Uint8Array)
    )
      throw new PlatformError("invalid-argument", operation, "stdin must be string or Uint8Array");
    const env = environment(options.env, operation);
    const resolved = await findExecutable(executable, { cwd: options.cwd, env: options.env });
    if (!resolved)
      throw new PlatformError("not-found", operation, `Executable not found: ${executable}`);
    if (isWindows() && /\.(?:cmd|bat)$/i.test(resolved))
      throw new PlatformError(
        "unsupported-operation",
        operation,
        "Batch files require runShellCommand",
      );
    if (options.signal?.aborted)
      throw new ProcessError("aborted", operation, "Process was aborted");
    return await new Promise<ProcessResult>((resolve, reject) => {
      const child = spawn(resolved, Array.from(argv), {
        cwd: options.cwd,
        env,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      let size = 0;
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      const finishError = (
        code:
          | "timed-out"
          | "aborted"
          | "output-limit-exceeded"
          | "process-interrupted"
          | "spawn-failed",
        message: string,
        cause?: unknown,
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill();
        reject(
          new ProcessError(
            code,
            operation,
            message,
            Buffer.concat(out),
            Buffer.concat(err),
            child.pid,
            cause,
          ),
        );
      };
      const consume = (target: Buffer[], chunk: Buffer) => {
        size += chunk.length;
        target.push(chunk);
        if (size > max)
          finishError("output-limit-exceeded", "Process output exceeded the configured limit");
      };
      child.stdout.on("data", (chunk: Buffer) => consume(out, chunk));
      child.stderr.on("data", (chunk: Buffer) => consume(err, chunk));
      child.once("error", (error) => finishError("spawn-failed", error.message, error));
      child.once("close", (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (signal) {
          reject(
            new ProcessError(
              "process-interrupted",
              operation,
              `Process ended with signal ${signal}`,
              Buffer.concat(out),
              Buffer.concat(err),
              child.pid,
            ),
          );
        } else {
          resolve({ exitCode: code ?? 0, stdout: Buffer.concat(out), stderr: Buffer.concat(err) });
        }
      });
      timer = setTimeout(() => finishError("timed-out", "Process timed out"), timeout);
      options.signal?.addEventListener(
        "abort",
        () => finishError("aborted", "Process was aborted"),
        { once: true },
      );
      if (options.stdin !== undefined)
        child.stdin.end(
          typeof options.stdin === "string" ? options.stdin : Buffer.from(options.stdin),
        );
      else child.stdin.end();
    });
  } catch (error) {
    if (error instanceof ProcessError) throw error;
    throw failure(error, operation);
  }
}

export type ShellKind = "cmd" | "powershell" | "sh" | "bash" | "zsh";
export interface ShellLaunch {
  readonly kind: ShellKind;
  readonly executable: string;
  readonly interactiveArguments: readonly string[];
}
function shellKind(value: string): ShellKind | undefined {
  const name = path
    .basename(value)
    .toLowerCase()
    .replace(/\.exe$/, "");
  if (name === "cmd") return "cmd";
  if (["powershell", "pwsh"].includes(name)) return "powershell";
  if (["sh", "bash", "zsh"].includes(name)) return name as ShellKind;
  return undefined;
}
export async function resolveShell(shellPath?: string): Promise<ShellLaunch> {
  const operation = "resolveShell";
  host(operation);
  const configured =
    shellPath === undefined
      ? process.platform === "win32"
        ? process.env.ComSpec || "cmd.exe"
        : process.env.SHELL || (process.platform === "darwin" ? "/bin/zsh" : "/bin/bash")
      : shellPath;
  text(configured, operation, "Shell");
  const kind = shellKind(configured);
  if (!kind)
    throw new PlatformError("unsupported-shell", operation, `Unsupported shell: ${configured}`);
  const executable = await findExecutable(configured, { cwd: process.cwd() });
  if (!executable)
    throw new PlatformError("not-found", operation, `Shell not found: ${configured}`);
  return {
    kind,
    executable,
    interactiveArguments: kind === "cmd" ? ["/D"] : kind === "powershell" ? ["-NoLogo"] : ["-i"],
  };
}
export interface ShellCommandOptions extends ProcessOptions {
  readonly shellPath?: string;
}
export async function runShellCommand(
  command: string,
  options: ShellCommandOptions,
): Promise<ProcessResult> {
  text(command, "runShellCommand", "Command");
  const shell = await resolveShell(options.shellPath);
  const args =
    shell.kind === "cmd"
      ? ["/D", "/S", "/C", command]
      : shell.kind === "powershell"
        ? ["-NoLogo", "-NonInteractive", "-Command", command]
        : ["-c", command];
  return runProcess(shell.executable, args, options);
}
