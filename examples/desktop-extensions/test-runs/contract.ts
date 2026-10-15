import { method, remote } from "@earendil-works/chord";
import { Type } from "typebox";

export const ENTRY_TYPE = "pi-gui.example.test-runs.v1";
export const OUTPUT_LIMIT = 32 * 1024;

export interface Suite {
  id: string;
  label: string;
  command: string;
  timeoutSeconds: number;
}

export type RunOutcome =
  | { kind: "running" }
  | { kind: "cancelling" }
  | { kind: "completed"; exitCode: number }
  | { kind: "cancelled" }
  | { kind: "timedOut" }
  | { kind: "executionError"; message: string }
  | { kind: "interrupted" };

export interface RunRecord {
  id: string;
  requestId: string;
  suiteId: string;
  label: string;
  command: string;
  startedAt: string;
  endedAt: string | null;
  outcome: RunOutcome;
  output: string;
  outputBytes: number;
  truncated: boolean;
}

export interface TestRunsState {
  ready: boolean;
  error: string | null;
  suites: Suite[];
  runs: RunRecord[];
}

export interface StartRequest {
  suiteId: string;
  requestId: string;
}

const SuiteSchema = Type.Object({
  id: Type.String(),
  label: Type.String(),
  command: Type.String(),
  timeoutSeconds: Type.Number(),
});

const RunOutcomeSchema = Type.Union([
  Type.Object({ kind: Type.Literal("running") }),
  Type.Object({ kind: Type.Literal("cancelling") }),
  Type.Object({ kind: Type.Literal("completed"), exitCode: Type.Number() }),
  Type.Object({ kind: Type.Literal("cancelled") }),
  Type.Object({ kind: Type.Literal("timedOut") }),
  Type.Object({ kind: Type.Literal("executionError"), message: Type.String() }),
  Type.Object({ kind: Type.Literal("interrupted") }),
]);

const RunRecordSchema = Type.Object({
  id: Type.String(),
  requestId: Type.String(),
  suiteId: Type.String(),
  label: Type.String(),
  command: Type.String(),
  startedAt: Type.String(),
  endedAt: Type.Union([Type.String(), Type.Null()]),
  outcome: RunOutcomeSchema,
  output: Type.String(),
  outputBytes: Type.Number(),
  truncated: Type.Boolean(),
});

const TestRunsStateSchema = Type.Object({
  ready: Type.Boolean(),
  error: Type.Union([Type.String(), Type.Null()]),
  suites: Type.Array(SuiteSchema),
  runs: Type.Array(RunRecordSchema),
});

const StartRequestSchema = Type.Object({ suiteId: Type.String(), requestId: Type.String() });

export const TestRuns = remote("pi-gui.example.test-runs.v1", {
  version: 1,
  input: Type.Object({}),
  variants: {
    default: {
      state: { state: TestRunsStateSchema },
      methods: {
        start: method(StartRequestSchema, Type.Object({ runId: Type.String() })),
        cancel: method(Type.Object({ runId: Type.String() }), Type.Null()),
      },
    },
  },
});

export function isActive(run: RunRecord): boolean {
  return run.outcome.kind === "running" || run.outcome.kind === "cancelling";
}

export function outcomeLabel(run: RunRecord): string {
  switch (run.outcome.kind) {
    case "running":
      return "Running";
    case "cancelling":
      return "Stopping";
    case "completed":
      return run.outcome.exitCode === 0
        ? "Command completed · exit 0"
        : `Command failed · exit ${run.outcome.exitCode}`;
    case "cancelled":
      return "Cancelled";
    case "timedOut":
      return "Timed out";
    case "executionError":
      return `Could not run · ${run.outcome.message}`;
    case "interrupted":
      return "Interrupted · result unknown";
  }
}
