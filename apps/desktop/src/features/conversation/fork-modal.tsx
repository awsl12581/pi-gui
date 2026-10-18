import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useState } from "react";
import type { NewThreadEnvironment } from "../../../contracts/desktop-state";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

interface ForkModalProps {
  readonly submitting: boolean;
  readonly error?: string;
  /** Preview of the assistant response the fork will branch after. */
  readonly messagePreview?: string;
  /** Whether forking into a new worktree is available for the source workspace. */
  readonly canUseWorktree: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (environment: NewThreadEnvironment) => void;
}

export function ForkModal({
  submitting,
  error,
  messagePreview,
  canUseWorktree,
  onClose,
  onSubmit,
}: ForkModalProps) {
  useLocale();
  const [environment, setEnvironment] = useState<NewThreadEnvironment>("local");
  return (
    <Dialog open onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent
        className="tree-modal tree-modal--compact"
        data-testid="fork-modal"
        onInteractOutside={(event) => {
          if (submitting) event.preventDefault();
        }}
      >
        <DialogHeader className="tree-modal__header">
          <div>
            <div className="tree-modal__eyebrow">{t("Fork conversation")}</div>
            <DialogTitle className="tree-modal__title">{t("Start a new thread")}</DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Close fork modal")}
            className="tree-modal__close"
            disabled={submitting}
            type="button"
            onClick={onClose}
          >
            ×
          </Button>
        </DialogHeader>

        {error ? (
          <div className="tree-modal__error error-banner" data-testid="fork-modal-error">
            {error}
          </div>
        ) : null}

        <div className="tree-modal__summary-step">
          <div className="tree-modal__summary-copy">
            {t(
              "Forks the conversation up to and including this response into a new sidebar thread with an empty composer, so you can continue it in a different direction. The original thread stays untouched.",
            )}
          </div>

          {messagePreview ? (
            <div className="fork-modal__preview" data-testid="fork-modal-preview">
              {messagePreview}
            </div>
          ) : null}

          <div
            className="new-thread__environment-group"
            role="radiogroup"
            aria-label={t("Fork environment")}
          >
            <Button
              variant={environment === "local" ? "default" : "outline"}
              size="sm"
              aria-pressed={environment === "local"}
              className={`new-thread__environment ${environment === "local" ? "new-thread__environment--active" : ""}`}
              data-testid="fork-environment-local"
              type="button"
              onClick={() => setEnvironment("local")}
            >
              <span>{t("Same worktree")}</span>
            </Button>
            <Button
              variant={environment === "worktree" ? "default" : "outline"}
              size="sm"
              aria-pressed={environment === "worktree"}
              className={`new-thread__environment ${environment === "worktree" ? "new-thread__environment--active" : ""}`}
              data-testid="fork-environment-worktree"
              disabled={!canUseWorktree}
              title={canUseWorktree ? undefined : t("This workspace can't create worktrees.")}
              type="button"
              onClick={() => setEnvironment("worktree")}
            >
              <span>{t("New worktree")}</span>
            </Button>
          </div>

          <div className="tree-modal__footer">
            <div className="tree-modal__hint">
              {environment === "worktree"
                ? t("A fresh worktree is created and the forked thread opens there.")
                : t("The forked thread opens in the same folder as the original.")}
            </div>
            <div className="tree-modal__actions">
              <Button variant="outline" disabled={submitting} type="button" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button
                variant="default"
                data-fork-confirm="true"
                data-testid="fork-modal-confirm"
                disabled={submitting}
                type="button"
                onClick={() => onSubmit(environment)}
              >
                {submitting ? t("Forking…") : t("Fork thread")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
