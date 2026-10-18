import { Button } from "../../components/ui/button";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useRef, useState } from "react";

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
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-label={name}
        className="image-viewer"
        data-testid="image-viewer"
        showCloseButton={false}
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
      </DialogContent>
    </Dialog>
  );
}
