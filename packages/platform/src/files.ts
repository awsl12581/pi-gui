import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { AtomicWriteError, PlatformError, failure, systemCode } from "./errors.js";
import { absolute, bytes, directory, host } from "./validation.js";

export interface AtomicWriteResult {
  readonly directorySync: "completed" | "unsupported";
}
export type CapabilitySupport = "supported" | "unsupported" | "permission-denied";
export interface DirectoryCapabilities {
  readonly fileSymbolicLinks: CapabilitySupport;
  readonly directorySymbolicLinks: CapabilitySupport;
  readonly directorySync: CapabilitySupport;
}

async function syncDirectory(dir: string): Promise<AtomicWriteResult["directorySync"]> {
  let handle;
  try {
    handle = await open(dir, "r");
    await handle.sync();
    return "completed";
  } catch (error) {
    const code = systemCode(error);
    if (
      ["EINVAL", "ENOSYS", "ENOTSUP", "EOPNOTSUPP", "EPERM"].includes(code ?? "") ||
      (process.platform === "win32" && code === "EISDIR")
    )
      return "unsupported";
    throw error;
  } finally {
    await handle?.close();
  }
}

const writes = new Map<string, Promise<AtomicWriteResult>>();
export async function writeFileAtomically(
  filePath: string,
  contents: string | Uint8Array,
): Promise<AtomicWriteResult> {
  const operation = "writeFileAtomically";
  try {
    host(operation);
    absolute(filePath, operation);
    bytes(contents, operation);
  } catch (error) {
    const e = failure(error, operation);
    throw new AtomicWriteError(e.code, operation, e.message, filePath, "not-applied", undefined, e);
  }
  const key = path.normalize(filePath);
  const next = (writes.get(key) ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => replace(filePath, contents));
  writes.set(key, next);
  try {
    return await next;
  } finally {
    if (writes.get(key) === next) writes.delete(key);
  }
}

async function replace(
  filePath: string,
  contents: string | Uint8Array,
): Promise<AtomicWriteResult> {
  const operation = "writeFileAtomically";
  let temporaryPath: string | undefined;
  let owned = false;
  let applied = false;
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    const dir = await realpath(path.dirname(filePath));
    const target = path.join(dir, path.basename(filePath));
    const existing = await lstat(target).catch((error: unknown) => {
      if (systemCode(error) === "ENOENT") return undefined;
      throw error;
    });
    if (existing && !existing.isFile())
      throw new PlatformError(
        "unsupported-operation",
        operation,
        "Target must be an ordinary file",
      );
    temporaryPath = path.join(dir, `.platform-${process.pid}-${randomUUID()}.tmp`);
    const handle = await open(temporaryPath, "wx", existing?.mode);
    owned = true;
    try {
      await handle.writeFile(contents);
      if (existing && process.platform !== "win32") await handle.chmod(existing.mode);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const deadline = Date.now() + 1000;
    for (;;) {
      try {
        await rename(temporaryPath, target);
        break;
      } catch (error) {
        // EPERM alone is not evidence of a sharing violation.
        if (
          process.platform !== "win32" ||
          !["EBUSY", "ETXTBSY", "EPERM"].includes(systemCode(error) ?? "") ||
          !existing ||
          Date.now() >= deadline
        )
          throw error;
        await delay(Math.min(20, Math.max(0, deadline - Date.now())));
      }
    }
    applied = true;
    owned = false;
    return { directorySync: await syncDirectory(dir) };
  } catch (error) {
    let cleanupError: unknown;
    if (owned && temporaryPath) {
      try {
        await rm(temporaryPath);
        owned = false;
      } catch (cleanup) {
        cleanupError = cleanup;
      }
    }
    const e = failure(error, operation);
    throw new AtomicWriteError(
      e.code,
      operation,
      e.message,
      filePath,
      applied ? "applied" : "not-applied",
      owned ? temporaryPath : undefined,
      cleanupError
        ? new AggregateError([error, cleanupError], "Write and temporary cleanup failed")
        : error,
    );
  }
}

export async function resolveExistingPath(filePath: string): Promise<string> {
  const operation = "resolveExistingPath";
  try {
    host(operation);
    absolute(filePath, operation);
    return await realpath(filePath);
  } catch (error) {
    throw failure(error, operation);
  }
}

export async function isPathInsideDirectory(
  filePath: string,
  directoryPath: string,
): Promise<boolean> {
  const operation = "isPathInsideDirectory";
  try {
    host(operation);
    absolute(filePath, operation);
    await directory(directoryPath, operation);
    const [target, root] = await Promise.all([realpath(filePath), realpath(directoryPath)]);
    const rootInfo = await stat(root, { bigint: true });
    const same = async (candidate: string) => {
      const info = await stat(candidate, { bigint: true });
      return (
        candidate === root ||
        (rootInfo.ino !== 0n && info.dev === rootInfo.dev && info.ino === rootInfo.ino)
      );
    };
    if (await same(target)) return false;
    // Walk actual ancestors: path.relative on Windows folds case even on case-sensitive directories.
    for (let ancestor = path.dirname(target); ; ancestor = path.dirname(ancestor)) {
      if (await same(ancestor)) return true;
      if (path.dirname(ancestor) === ancestor) return false;
    }
  } catch (error) {
    throw failure(error, operation);
  }
}

export async function createSymbolicLink(targetPath: string, linkPath: string): Promise<void> {
  const operation = "createSymbolicLink";
  try {
    host(operation);
    absolute(targetPath, operation);
    absolute(linkPath, operation);
    const target = await stat(targetPath);
    if (!target.isDirectory() && !target.isFile())
      throw new PlatformError(
        "unsupported-operation",
        operation,
        "Link target must be a file or directory",
      );
    await directory(path.dirname(linkPath), operation);
    await symlink(targetPath, linkPath, target.isDirectory() ? "dir" : "file");
  } catch (error) {
    throw failure(error, operation);
  }
}

export async function probeDirectoryCapabilities(
  directoryPath: string,
): Promise<DirectoryCapabilities> {
  const operation = "probeDirectoryCapabilities";
  let probe: string | undefined;
  try {
    host(operation);
    await directory(directoryPath, operation);
    probe = await mkdtemp(path.join(directoryPath, ".platform-probe-"));
    const file = path.join(probe, "file");
    const dir = path.join(probe, "directory");
    await writeFile(file, "probe", { flag: "wx" });
    await mkdir(dir);
    const attempt = async (action: () => Promise<unknown>): Promise<CapabilitySupport> => {
      try {
        await action();
        return "supported";
      } catch (error) {
        const e = failure(error, operation);
        if (e.code === "permission-denied") return "permission-denied";
        if (e.code === "unsupported-operation") return "unsupported";
        throw error;
      }
    };
    const capabilities = {
      fileSymbolicLinks: await attempt(() =>
        createSymbolicLink(file, path.join(probe!, "file-link")),
      ),
      directorySymbolicLinks: await attempt(() =>
        createSymbolicLink(dir, path.join(probe!, "directory-link")),
      ),
      directorySync: await attempt(async () => {
        if ((await syncDirectory(probe!)) === "unsupported")
          throw new PlatformError("unsupported-operation", operation, "Directory sync unsupported");
      }),
    };
    await rm(probe, { recursive: true });
    probe = undefined;
    return capabilities;
  } catch (error) {
    throw failure(error, operation);
  } finally {
    if (probe) await rm(probe, { recursive: true });
  }
}
