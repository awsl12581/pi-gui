import { method, remote } from "@earendil-works/chord";
import { Type } from "typebox";

/** How a span ended; `null` while it is still open. */
export type Outcome = "ok" | "error" | "aborted";

interface SpanBase {
  id: string;
  /** The span this one runs inside; `null` for spans directly under the run. */
  parentId: string | null;
  startedAt: number;
  endedAt: number | null;
  outcome: Outcome | null;
}

/** One pass of pi's loop: a model call and the tools it asked for. */
export interface TurnSpan extends SpanBase {
  kind: "turn";
  number: number;
}

/** Tokens as pi records them on the assistant message. */
export interface CallUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** From pi's `context` event (the request is being built) to the assistant `message_end`. */
export interface ModelSpan extends SpanBase {
  kind: "model";
  model: string;
  /** When the provider's first response arrived; the gap before it is waiting on the request. */
  firstResponseAt: number | null;
  contextWindow: number | null;
  /** `null` until the call ends, and for stopped or failed calls that report no tokens. */
  usage: CallUsage | null;
  stopReason: string | null;
  error: string | null;
}

export interface ToolSpan extends SpanBase {
  kind: "tool";
  toolCallId: string;
  tool: string;
  /** The most telling argument, such as a path or command, for the row. */
  summary: string;
  args: string;
  result: string | null;
}

export interface CompactionSpan extends SpanBase {
  kind: "compaction";
  reason: "manual" | "threshold" | "overflow";
  error: string | null;
}

export type Span = TurnSpan | ModelSpan | ToolSpan | CompactionSpan;

/** One reply, from the first `agent_start` to `agent_settled`, or a compaction outside any reply. */
export interface Run {
  id: string;
  kind: "reply" | "compaction";
  number: number;
  startedAt: number;
  endedAt: number | null;
  outcome: Outcome | null;
  /** In start order; a parent always comes before its children. */
  spans: Span[];
  /** Spans left out after the per-run cap. */
  dropped: number;
}

export interface TraceState {
  /** Oldest first; only this thread, only since it opened in this window. */
  runs: Run[];
}

const OutcomeSchema = Type.Union([
  Type.Literal("ok"),
  Type.Literal("error"),
  Type.Literal("aborted"),
]);

const SpanBaseSchema = Type.Object({
  id: Type.String(),
  parentId: Type.Union([Type.String(), Type.Null()]),
  startedAt: Type.Number(),
  endedAt: Type.Union([Type.Number(), Type.Null()]),
  outcome: Type.Union([OutcomeSchema, Type.Null()]),
});

const TurnSpanSchema = Type.Intersect([
  SpanBaseSchema,
  Type.Object({ kind: Type.Literal("turn"), number: Type.Number() }),
]);

const CallUsageSchema = Type.Object({
  input: Type.Number(),
  output: Type.Number(),
  cacheRead: Type.Number(),
  cacheWrite: Type.Number(),
});

const ModelSpanSchema = Type.Intersect([
  SpanBaseSchema,
  Type.Object({
    kind: Type.Literal("model"),
    model: Type.String(),
    firstResponseAt: Type.Union([Type.Number(), Type.Null()]),
    contextWindow: Type.Union([Type.Number(), Type.Null()]),
    usage: Type.Union([CallUsageSchema, Type.Null()]),
    stopReason: Type.Union([Type.String(), Type.Null()]),
    error: Type.Union([Type.String(), Type.Null()]),
  }),
]);

const ToolSpanSchema = Type.Intersect([
  SpanBaseSchema,
  Type.Object({
    kind: Type.Literal("tool"),
    toolCallId: Type.String(),
    tool: Type.String(),
    summary: Type.String(),
    args: Type.String(),
    result: Type.Union([Type.String(), Type.Null()]),
  }),
]);

const CompactionSpanSchema = Type.Intersect([
  SpanBaseSchema,
  Type.Object({
    kind: Type.Literal("compaction"),
    reason: Type.Union([
      Type.Literal("manual"),
      Type.Literal("threshold"),
      Type.Literal("overflow"),
    ]),
    error: Type.Union([Type.String(), Type.Null()]),
  }),
]);

const SpanSchema = Type.Union([
  TurnSpanSchema,
  ModelSpanSchema,
  ToolSpanSchema,
  CompactionSpanSchema,
]);

const RunSchema = Type.Object({
  id: Type.String(),
  kind: Type.Union([Type.Literal("reply"), Type.Literal("compaction")]),
  number: Type.Number(),
  startedAt: Type.Number(),
  endedAt: Type.Union([Type.Number(), Type.Null()]),
  outcome: Type.Union([OutcomeSchema, Type.Null()]),
  spans: Type.Array(SpanSchema),
  dropped: Type.Number(),
});

const TraceStateSchema = Type.Object({ runs: Type.Array(RunSchema) });

export const Trace = remote("pi-gui.example.trace.v1", {
  version: 1,
  input: Type.Object({}),
  variants: { default: { state: { state: TraceStateSchema }, methods: {} } },
});
