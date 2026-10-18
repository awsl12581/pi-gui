import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { trapDialogFocus } from "../../ui/dialog-focus";

interface ImageAttachmentThumbProps {
  readonly src: string;
  readonly name: string;
  readonly className: string;
}

/** Image attachment thumbnail that opens the full image in a focused viewer when clicked. */
export function ImageAttachmentThumb({ src, name, className }: ImageAttachmentThumbProps) {
  useLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Button
        aria-label={t("View {{value0}}", { value0: name })}
        className={`image-attachment-thumb ${className}`}
        ref={triggerRef}
        title={name}
        type="button"
        onClick={() => setOpen(true)}
      >
        <img alt={name} src={src} />
      </Button>
      {open ? (
        <ImageViewer
          name={name}
          src={src}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function ImageViewer({
  src,
  name,
  onClose,
}: {
  readonly src: string;
  readonly name: string;
  readonly onClose: () => void;
}) {
  useLocale();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>(".image-viewer__close")?.focus();
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      trapDialogFocus(event, dialogRef.current);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  return createPortal(
    <div
      aria-label={name}
      aria-modal="true"
      className="image-viewer"
      data-testid="image-viewer"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <img alt={name} className="image-viewer__image" src={src} />
      <Button
        aria-label={t("Close image")}
        className="image-viewer__close"
        type="button"
        onClick={onClose}
      >
        ×
      </Button>
    </div>,
    document.body,
  );
}
