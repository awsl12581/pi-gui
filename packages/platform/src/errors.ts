export type PlatformErrorCode =
  | "invalid-argument"
  | "unsupported-platform"
  | "unsupported-operation"
  | "unsupported-shell"
  | "not-found"
  | "already-exists"
  | "permission-denied"
  | "busy"
  | "io-failed"
  | "spawn-failed"
  | "timed-out"
  | "aborted"
  | "output-limit-exceeded"
  | "process-interrupted"
  | "termination-failed";

export function systemCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

export class PlatformError extends Error {
  readonly systemCode?: string;
  constructor(
    readonly code: PlatformErrorCode,
    readonly operation: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "PlatformError";
    this.systemCode = systemCode(cause);
  }
}

export class AtomicWriteError extends PlatformError {
  constructor(
    code: PlatformErrorCode,
    operation: string,
    message: string,
    readonly filePath: string,
    readonly replacement: "not-applied" | "applied" | "unknown",
    readonly temporaryPath?: string,
    cause?: unknown,
  ) {
    super(code, operation, message, cause);
    this.name = "AtomicWriteError";
  }
}

export class ProcessError extends PlatformError {
  constructor(
    code: PlatformErrorCode,
    operation: string,
    message: string,
    readonly stdout: Buffer = Buffer.alloc(0),
    readonly stderr: Buffer = Buffer.alloc(0),
    readonly pid?: number,
    cause?: unknown,
  ) {
    super(code, operation, message, cause);
    this.name = "ProcessError";
  }
}

export function failure(error: unknown, operation: string): PlatformError {
  if (error instanceof PlatformError && error.operation === operation) return error;
  const code =
    error instanceof PlatformError
      ? error.code
      : ((
          {
            ENOENT: "not-found",
            ENOTDIR: "not-found",
            EEXIST: "already-exists",
            EACCES: "permission-denied",
            EPERM: "permission-denied",
            EBUSY: "busy",
            ETXTBSY: "busy",
            ENOSYS: "unsupported-operation",
            ENOTSUP: "unsupported-operation",
            EOPNOTSUPP: "unsupported-operation",
          } as Record<string, PlatformErrorCode>
        )[systemCode(error) ?? ""] ?? "io-failed");
  return new PlatformError(
    code,
    operation,
    error instanceof Error ? error.message : String(error),
    error,
  );
}
