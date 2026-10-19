import { useRef, useState } from "react";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "./alert-dialog";

/** The caller captures the target when opening, rather than consulting selection on confirm. */
export function ConfirmationDialog({
  description,
  onConfirm,
  onClose,
}: {
  readonly description: string;
  readonly onConfirm: () => Promise<unknown>;
  readonly onClose: () => void;
}) {
  useLocale();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting.current) onClose();
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (submitting.current) event.preventDefault();
        }}
      >
        <AlertDialogTitle>{t("Confirm")}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        {error ? (
          <p role="alert" className="error-banner">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant="destructive"
            onClick={(event) => {
              event.preventDefault();
              if (submitting.current) return;
              submitting.current = true;
              setPending(true);
              setError(undefined);
              void onConfirm()
                .then((failure) => {
                  if (typeof failure === "string") setError(failure);
                  else onClose();
                })
                .catch((failure: unknown) => {
                  setError(failure instanceof Error ? failure.message : String(failure));
                })
                .finally(() => {
                  submitting.current = false;
                  setPending(false);
                });
            }}
          >
            {t("Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
