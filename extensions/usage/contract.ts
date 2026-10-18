import { method, remote } from "@earendil-works/chord";
import { Type } from "typebox";

/** Token counts as pi records them on assistant messages; cost is the provider-reported USD total. */
export interface UsageCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

/** One thread's usage for one local calendar day, keyed by that day's local midnight (ms). */
export interface DayUsage extends UsageCounts {
  dayStart: number;
}

export type ContextKind =
  | "toolResults"
  | "toolCalls"
  | "user"
  | "assistant"
  | "thinking"
  | "images"
  | "summaries"
  | "other";

/** A group of same-kind items in a thread's current context, described without their text. */
export interface ContextGroup {
  kind: ContextKind;
  /** Short, content-free label such as "read" (tool name) or "Compaction summary"; empty for plain text. */
  label: string;
  count: number;
  tokens: number;
}

/** Estimated composition of a thread's current branch context (pi's chars/4 heuristic). */
export interface ContextEstimate {
  byKind: Record<ContextKind, number>;
  total: number;
  largest: ContextGroup[];
}

export interface ThreadUsage {
  id: string;
  title: string;
  current: boolean;
  /** pi's last user/assistant activity for the session (ms). */
  lastActiveAt: number;
  /** Display name of the model that produced the most output, or null when none replied. */
  model: string | null;
  /** Total assistant replies with usage; zero-cost replies mean a subscription provider. */
  replies: number;
  days: DayUsage[];
  context: ContextEstimate;
  /** Only for the thread that hosts this view: pi's own context usage for the active model. */
  contextNow: { tokens: number | null; contextWindow: number } | null;
}

export interface UsageState {
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  refreshedAt: number | null;
  folderName: string;
  threads: ThreadUsage[];
  /** Session files considered, files that could not be read, and files left out by the cap. */
  scanned: number;
  unreadable: number;
  capped: number;
}

const UsageCountsSchema = Type.Object({
  input: Type.Number(),
  output: Type.Number(),
  cacheRead: Type.Number(),
  cacheWrite: Type.Number(),
  cost: Type.Number(),
});

const DayUsageSchema = Type.Intersect([
  UsageCountsSchema,
  Type.Object({ dayStart: Type.Number() }),
]);

const ContextKindSchema = Type.Union([
  Type.Literal("toolResults"),
  Type.Literal("toolCalls"),
  Type.Literal("user"),
  Type.Literal("assistant"),
  Type.Literal("thinking"),
  Type.Literal("images"),
  Type.Literal("summaries"),
  Type.Literal("other"),
]);

const ContextGroupSchema = Type.Object({
  kind: ContextKindSchema,
  label: Type.String(),
  count: Type.Number(),
  tokens: Type.Number(),
});

const ContextEstimateSchema = Type.Object({
  byKind: Type.Record(ContextKindSchema, Type.Number()),
  total: Type.Number(),
  largest: Type.Array(ContextGroupSchema),
});

const ThreadUsageSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  current: Type.Boolean(),
  lastActiveAt: Type.Number(),
  model: Type.Union([Type.String(), Type.Null()]),
  replies: Type.Number(),
  days: Type.Array(DayUsageSchema),
  context: ContextEstimateSchema,
  contextNow: Type.Union([
    Type.Object({ tokens: Type.Union([Type.Number(), Type.Null()]), contextWindow: Type.Number() }),
    Type.Null(),
  ]),
});

const UsageStateSchema = Type.Object({
  status: Type.Union([
    Type.Literal("idle"),
    Type.Literal("loading"),
    Type.Literal("ready"),
    Type.Literal("error"),
  ]),
  error: Type.Union([Type.String(), Type.Null()]),
  refreshedAt: Type.Union([Type.Number(), Type.Null()]),
  folderName: Type.String(),
  threads: Type.Array(ThreadUsageSchema),
  scanned: Type.Number(),
  unreadable: Type.Number(),
  capped: Type.Number(),
});

export const Usage = remote("pi-gui.example.usage.v1", {
  version: 1,
  input: Type.Object({}),
  variants: {
    default: {
      state: { state: UsageStateSchema },
      methods: { refresh: method(Type.Object({}), Type.Null()) },
    },
  },
});
