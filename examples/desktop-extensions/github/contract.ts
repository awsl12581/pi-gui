import { method, remote } from "@earendil-works/chord";
import { Type } from "typebox";

export type CheckState = "passing" | "failing" | "pending" | "none";
export type ReviewDecision = "approved" | "changes_requested" | "review_required" | "none";

export interface Checks {
  state: CheckState;
  /** Names of failed checks, capped; `failedCount` is the real number. */
  failed: string[];
  failedCount: number;
  /** Checks that succeeded; skipped and neutral ones are counted apart, not as passing. */
  passed: number;
  skipped: number;
  total: number;
}

export interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  author: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  checks: Checks;
  review: ReviewDecision;
  url: string;
  additions: number | null;
  deletions: number | null;
}

export interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  labels: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
  /** Plain text excerpt of the issue body, capped. Rendered with textContent only. */
  body: string;
  url: string;
}

export interface GitHubState {
  status: "loading" | "ready" | "error";
  refreshing: boolean;
  /** `owner/name`, or null when unknown. */
  repo: string | null;
  /** When `gh` last returned this data. */
  fetchedAt: string | null;
  pullRequests: PullRequest[];
  issues: Issue[];
  error: string | null;
}

/** The error when `gh` can't be started; the view offers the install page for it. */
export const GH_MISSING =
  "This view reads GitHub through the GitHub CLI. Install gh, run gh auth login, then refresh.";
export const GH_INSTALL_URL = "https://cli.github.com/";

const CheckStateSchema = Type.Union([
  Type.Literal("passing"),
  Type.Literal("failing"),
  Type.Literal("pending"),
  Type.Literal("none"),
]);

const ChecksSchema = Type.Object({
  state: CheckStateSchema,
  failed: Type.Array(Type.String()),
  failedCount: Type.Number(),
  passed: Type.Number(),
  skipped: Type.Number(),
  total: Type.Number(),
});

const ReviewDecisionSchema = Type.Union([
  Type.Literal("approved"),
  Type.Literal("changes_requested"),
  Type.Literal("review_required"),
  Type.Literal("none"),
]);

const PullRequestSchema = Type.Object({
  number: Type.Number(),
  title: Type.String(),
  state: Type.Union([Type.Literal("open"), Type.Literal("closed"), Type.Literal("merged")]),
  draft: Type.Boolean(),
  author: Type.String(),
  branch: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  checks: ChecksSchema,
  review: ReviewDecisionSchema,
  url: Type.String(),
  additions: Type.Union([Type.Number(), Type.Null()]),
  deletions: Type.Union([Type.Number(), Type.Null()]),
});

const IssueSchema = Type.Object({
  number: Type.Number(),
  title: Type.String(),
  state: Type.Union([Type.Literal("open"), Type.Literal("closed")]),
  author: Type.String(),
  labels: Type.Array(Type.String()),
  comments: Type.Number(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  body: Type.String(),
  url: Type.String(),
});

const GitHubStateSchema = Type.Object({
  status: Type.Union([Type.Literal("loading"), Type.Literal("ready"), Type.Literal("error")]),
  refreshing: Type.Boolean(),
  repo: Type.Union([Type.String(), Type.Null()]),
  fetchedAt: Type.Union([Type.String(), Type.Null()]),
  pullRequests: Type.Array(PullRequestSchema),
  issues: Type.Array(IssueSchema),
  error: Type.Union([Type.String(), Type.Null()]),
});

export const GitHub = remote("pi-gui.example.github.v1", {
  version: 1,
  input: Type.Object({}),
  variants: {
    default: {
      state: { state: GitHubStateSchema },
      methods: { refresh: method(Type.Object({}), Type.Null()) },
    },
  },
});

export function initialState(): GitHubState {
  return {
    status: "loading",
    refreshing: false,
    repo: null,
    fetchedAt: null,
    pullRequests: [],
    issues: [],
    error: null,
  };
}

/** Failing CI or a changes-requested review on an open PR. */
export function needsAttention(pr: PullRequest): boolean {
  return (
    pr.state === "open" && (pr.checks.state === "failing" || pr.review === "changes_requested")
  );
}
