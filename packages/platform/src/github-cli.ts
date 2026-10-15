import path from "node:path";
import { findExecutable, runProcess, type ProcessOptions, type ProcessResult } from "./process.js";

export const GITHUB_CLI_VERSION = "2.102.0";

export interface GitHubCliOptions {
  readonly resourceRoot?: string;
  readonly platform?: NodeJS.Platform;
  readonly arch?: NodeJS.Architecture;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly cwd?: string;
}

export interface GitHubCli {
  readonly executable: string;
  readonly bundled: boolean;
  run(
    args: readonly string[],
    options?: Omit<ProcessOptions, "cwd"> & { cwd?: string },
  ): Promise<ProcessResult>;
}

function bundledName(platform: NodeJS.Platform, arch: string): string {
  return `${platform}-${arch}`;
}

function executableName(platform: NodeJS.Platform): string {
  return platform === "win32" ? "gh.exe" : "gh";
}

export function bundledGitHubCliPath(
  resourceRoot: string,
  platform = process.platform,
  arch: NodeJS.Architecture = process.arch,
): string {
  return path.join(resourceRoot, "gh", bundledName(platform, arch), executableName(platform));
}

export async function resolveGitHubCli(options: GitHubCliOptions = {}): Promise<GitHubCli | null> {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  if (options.resourceRoot) {
    const bundled = bundledGitHubCliPath(options.resourceRoot, platform, arch);
    if (await findExecutable(bundled, { cwd, env })) return createCli(bundled, true, cwd);
  }
  const system = await findExecutable("gh", { cwd, env });
  return system ? createCli(system, false, cwd) : null;
}

function createCli(executable: string, bundled: boolean, defaultCwd: string): GitHubCli {
  return {
    executable,
    bundled,
    run(args, options = {}) {
      return runProcess(executable, args, { ...options, cwd: options.cwd ?? defaultCwd });
    },
  };
}
