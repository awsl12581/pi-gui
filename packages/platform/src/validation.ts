import path from "node:path";
import { stat } from "node:fs/promises";
import { PlatformError } from "./errors.js";

export function host(operation: string): void {
  if (!["win32", "darwin", "linux"].includes(process.platform))
    throw new PlatformError(
      "unsupported-platform",
      operation,
      `Unsupported host: ${process.platform}`,
    );
}
export function text(
  value: unknown,
  operation: string,
  label: string,
  allowEmpty = false,
): asserts value is string {
  if (typeof value !== "string" || (!allowEmpty && !value.length) || value.includes("\0"))
    throw new PlatformError(
      "invalid-argument",
      operation,
      `${label} must be a string without NUL${allowEmpty ? "" : " and must not be empty"}`,
    );
}
export function absolute(value: unknown, operation: string): asserts value is string {
  text(value, operation, "Path");
  if (
    !path.isAbsolute(value) ||
    (process.platform === "win32" && !/^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/][^\\/]+)/.test(value))
  )
    throw new PlatformError(
      "invalid-argument",
      operation,
      `Expected an absolute host path: ${value}`,
    );
}
export async function directory(value: string, operation: string): Promise<void> {
  absolute(value, operation);
  if (!(await stat(value)).isDirectory())
    throw new PlatformError("invalid-argument", operation, `Expected a directory: ${value}`);
}
export function bytes(value: unknown, operation: string): asserts value is string | Uint8Array {
  if (typeof value !== "string" && !(value instanceof Uint8Array))
    throw new PlatformError(
      "invalid-argument",
      operation,
      "Contents must be a string or Uint8Array",
    );
}
export function environment(
  overrides: Readonly<Record<string, string | undefined>> | undefined,
  operation: string,
): NodeJS.ProcessEnv {
  if (
    overrides !== undefined &&
    (overrides === null || typeof overrides !== "object" || Array.isArray(overrides))
  )
    throw new PlatformError("invalid-argument", operation, "env must be a record");
  const result: NodeJS.ProcessEnv = {};
  const keys = new Map<string, string>();
  const identity = (key: string) => (process.platform === "win32" ? key.toUpperCase() : key);
  for (const [key, value] of Object.entries(process.env)) {
    const id = identity(key);
    const prior = keys.get(id);
    if (prior) delete result[prior];
    keys.set(id, key);
    result[key] = value;
  }
  const supplied = new Set<string>();
  for (const [key, value] of Object.entries(overrides ?? {})) {
    text(key, operation, "Environment key");
    if (key.includes("=") || supplied.has(identity(key)))
      throw new PlatformError(
        "invalid-argument",
        operation,
        `Invalid or conflicting environment key: ${key}`,
      );
    supplied.add(identity(key));
    if (value !== undefined) text(value, operation, "Environment value", true);
    const prior = keys.get(identity(key));
    if (prior) delete result[prior];
    keys.set(identity(key), key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}
