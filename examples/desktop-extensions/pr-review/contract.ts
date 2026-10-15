import { method, remote } from "@earendil-works/chord";
import { Type } from "typebox";

export interface ReviewTarget {
  checkout: string;
  repository: string;
  number: number;
  url: string;
  title: string;
  branch: string;
  base: string;
  head: string;
  mergeBase: string;
  localHead: string;
  dirty: boolean;
  files: string[];
}

export interface Finding {
  id: string;
  priority: "P1" | "P2" | "P3";
  title: string;
  body: string;
  path: string;
  line: number;
}

export type ReviewStatus =
  "requested" | "running" | "completed" | "incomplete" | "failed" | "aborted" | "interrupted";

export interface ReviewRecord {
  version: 1;
  id: string;
  target: ReviewTarget;
  status: ReviewStatus;
  requestedAt: number;
  finishedAt: number | null;
  summary: string;
  findings: Finding[];
  recorded: boolean;
  detail: string;
}

export interface ReviewState {
  target: ReviewTarget | null;
  review: ReviewRecord | null;
  refreshing: boolean;
  error: string | null;
}

export interface FixDraft {
  title: string;
  prompt: string;
  files: { path: string; line: number }[];
}

const ReviewTargetSchema = Type.Object({
  checkout: Type.String(),
  repository: Type.String(),
  number: Type.Number(),
  url: Type.String(),
  title: Type.String(),
  branch: Type.String(),
  base: Type.String(),
  head: Type.String(),
  mergeBase: Type.String(),
  localHead: Type.String(),
  dirty: Type.Boolean(),
  files: Type.Array(Type.String()),
});

const ReviewStatusSchema = Type.Union([
  Type.Literal("requested"),
  Type.Literal("running"),
  Type.Literal("completed"),
  Type.Literal("incomplete"),
  Type.Literal("failed"),
  Type.Literal("aborted"),
  Type.Literal("interrupted"),
]);

const FindingSchema = Type.Object({
  id: Type.String(),
  priority: Type.Union([Type.Literal("P1"), Type.Literal("P2"), Type.Literal("P3")]),
  title: Type.String(),
  body: Type.String(),
  path: Type.String(),
  line: Type.Number(),
});

const ReviewRecordSchema = Type.Object({
  version: Type.Literal(1),
  id: Type.String(),
  target: ReviewTargetSchema,
  status: ReviewStatusSchema,
  requestedAt: Type.Number(),
  finishedAt: Type.Union([Type.Number(), Type.Null()]),
  summary: Type.String(),
  findings: Type.Array(FindingSchema),
  recorded: Type.Boolean(),
  detail: Type.String(),
});

const ReviewStateSchema = Type.Object({
  target: Type.Union([ReviewTargetSchema, Type.Null()]),
  review: Type.Union([ReviewRecordSchema, Type.Null()]),
  refreshing: Type.Boolean(),
  error: Type.Union([Type.String(), Type.Null()]),
});

const FixDraftSchema = Type.Object({
  title: Type.String(),
  prompt: Type.String(),
  files: Type.Array(Type.Object({ path: Type.String(), line: Type.Number() })),
});

export const PRReview = remote("pi-gui.examples.pr-review.v1", {
  version: 1,
  input: Type.Object({}),
  variants: {
    default: {
      state: { state: ReviewStateSchema },
      methods: {
        refresh: method(Type.Object({}), Type.Null()),
        request: method(
          Type.Object({ requestId: Type.String() }),
          Type.Object({ reviewId: Type.String() }),
        ),
        prepareFix: method(
          Type.Object({ reviewId: Type.String(), findingId: Type.String() }),
          FixDraftSchema,
        ),
      },
    },
  },
});

export function staleReason(review: ReviewRecord, current: ReviewTarget | null): string | null {
  if (!current) return "The current PR could not be verified. Refresh before using these findings.";
  if (review.target.repository !== current.repository || review.target.number !== current.number)
    return "This checkout now belongs to a different PR.";
  if (review.target.head !== current.head || review.target.base !== current.base)
    return "The PR changed after this review. Review the new revision before preparing a fix.";
  if (current.localHead !== review.target.head)
    return "The checkout is no longer at the reviewed revision.";
  return null;
}
