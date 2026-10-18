import type { DesktopAppState } from "../../contracts/desktop-state";
import { t } from "../../i18n";
import { Button } from "../components/ui/button";
import { useLocale } from "../ui/use-locale";
import { Component, Fragment, type ReactNode } from "react";
import type { DesktopAppView, StateHydrationFailure } from "./desktop-app-state";

export type DesktopStartupSurfaceState =
  | { readonly kind: "loading" }
  | {
      readonly kind: "failed";
      readonly failure: StateHydrationFailure;
      readonly retrying: boolean;
    }
  | { readonly kind: "crashed" };

export interface DesktopStartupCopy {
  readonly title: string;
  readonly body: string;
  readonly status: "loading" | "failed" | "crashed";
}

const LOADING_COPY: DesktopStartupCopy = {
  get title() {
    return t("Loading sessions");
  },
  get body() {
    return t("The desktop shell is restoring folder and thread state from the main process.");
  },
  status: "loading",
};

const STATE_FAILED_COPY: DesktopStartupCopy = {
  get title() {
    return t("Couldn't restore sessions");
  },
  get body() {
    return t(
      "The desktop shell couldn't read folder and thread state. Retry, or relaunch the app.",
    );
  },
  status: "failed",
};

const BRIDGE_FAILED_COPY: DesktopStartupCopy = {
  get title() {
    return t("Couldn't restore sessions");
  },
  get body() {
    return t("The desktop shell isn't connected. Quit pi-gui and reopen it.");
  },
  status: "failed",
};

const CRASHED_COPY: DesktopStartupCopy = {
  get title() {
    return t("Something went wrong");
  },
  get body() {
    return t("The desktop window hit an unexpected error. Retry to remount, or relaunch the app.");
  },
  status: "crashed",
};

export function startupSurfaceCopy(state: DesktopStartupSurfaceState): DesktopStartupCopy {
  if (state.kind === "loading") {
    return LOADING_COPY;
  }
  if (state.kind === "crashed") {
    return CRASHED_COPY;
  }
  if (state.failure.code === "bridge-unavailable") {
    return BRIDGE_FAILED_COPY;
  }
  return STATE_FAILED_COPY;
}

interface DesktopStartupSurfaceProps {
  readonly state: DesktopStartupSurfaceState;
  readonly onRetry: () => void;
  readonly onRelaunch?: () => void;
}

export function DesktopStartupSurface({ state, onRetry, onRelaunch }: DesktopStartupSurfaceProps) {
  useLocale();
  const copy = startupSurfaceCopy(state);
  const retrying = state.kind === "failed" ? state.retrying : false;
  const showActions = copy.status !== "loading";
  const showRelaunch =
    Boolean(onRelaunch) &&
    (state.kind === "crashed" ||
      (state.kind === "failed" && state.failure.code !== "bridge-unavailable"));

  return (
    <div className="shell shell--loading">
      <main
        className="loading-card"
        data-testid="shell-status-card"
        data-status={copy.status}
        data-retrying={retrying ? "true" : "false"}
        data-failure={state.kind === "failed" ? state.failure.code : undefined}
      >
        <div className="loading-card__eyebrow">pi-gui</div>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        {showActions ? (
          <div className="loading-card__actions">
            <Button
              className="loading-card__primary-action"
              data-testid="hydrate-retry"
              type="button"
              disabled={retrying}
              onClick={onRetry}
            >
              {retrying ? t("Retrying…") : t("Retry")}
            </Button>
            {showRelaunch ? (
              <Button
                variant="ghost"
                data-testid="hydrate-relaunch"
                type="button"
                onClick={onRelaunch}
              >
                {t("Relaunch pi-gui")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

interface RendererErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onRelaunch?: () => void;
}

interface RendererErrorBoundaryState {
  readonly hasError: boolean;
  readonly remountKey: number;
}

export class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  state: RendererErrorBoundaryState = { hasError: false, remountKey: 0 };

  static getDerivedStateFromError(): Pick<RendererErrorBoundaryState, "hasError"> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("[renderer] render tree failed", error);
  }

  private readonly handleRetry = (): void => {
    this.setState((current) => ({
      hasError: false,
      remountKey: current.remountKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <DesktopStartupSurface
          state={{ kind: "crashed" }}
          onRetry={this.handleRetry}
          onRelaunch={this.props.onRelaunch}
        />
      );
    }
    return <Fragment key={this.state.remountKey}>{this.props.children}</Fragment>;
  }
}

export function toStartupSurfaceState(view: DesktopAppView): DesktopStartupSurfaceState {
  if (view.kind === "failed") {
    return view;
  }
  return { kind: "loading" };
}

export function WorkspaceRefreshNotice({
  diagnostics,
}: {
  readonly diagnostics: DesktopAppState["startupDiagnostics"];
}) {
  useLocale();
  return (
    <>
      {diagnostics.length > 0 ? (
        <div className="startup-diagnostics" role="status" data-testid="startup-diagnostics">
          <strong>{t("Some saved workspaces could not be refreshed.")}</strong>
          <span>
            {diagnostics
              .map((diagnostic) => {
                const workspaceName = diagnostic.workspacePath
                  ?.split(/[\\/]/)
                  .filter(Boolean)
                  .at(-1);
                return workspaceName
                  ? t("{{value0}} is unavailable.", { value0: workspaceName })
                  : diagnostic.message;
              })
              .join(" ")}
          </span>
        </div>
      ) : null}
    </>
  );
}
