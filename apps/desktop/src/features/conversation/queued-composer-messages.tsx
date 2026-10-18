import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import type { ComposerAttachment, QueuedComposerMessage } from "../../../contracts/desktop-state";
import { FileIcon } from "../../ui/icons";
import { ImageAttachmentThumb } from "./image-attachment-thumb";
import { parseAnnotatedPrompt } from "./annotations/annotation-prompt";

function queuedPreview(text: string): string {
  const annotated = parseAnnotatedPrompt(text);
  if (!annotated) return text;
  const count = annotated.annotations.length;
  const label = t("{{value0}} annotation{{value1}}", {
    value0: count,
    value1: count === 1 ? "" : "s",
  });
  return annotated.body.trim() ? `${annotated.body.trim()} · ${label}` : label;
}

interface QueuedComposerMessagesProps {
  readonly messages: readonly QueuedComposerMessage[];
  readonly editingQueuedMessageId?: string;
  readonly onEditMessage: (messageId: string) => void;
  readonly onRemoveMessage: (messageId: string) => void;
  readonly onSteerMessage: (messageId: string) => void;
  readonly onCancelEdit: () => void;
}

export function QueuedComposerMessages({
  messages,
  editingQueuedMessageId,
  onEditMessage,
  onRemoveMessage,
  onSteerMessage,
  onCancelEdit,
}: QueuedComposerMessagesProps) {
  useLocale();
  if (messages.length === 0 && !editingQueuedMessageId) {
    return null;
  }

  return (
    <div className="queued-composer-messages" data-testid="queued-composer-messages">
      {editingQueuedMessageId ? (
        <div className="queued-composer-messages__editing" data-testid="queued-composer-editing">
          <span>{t("Editing queued message")}</span>
          <Button type="button" onClick={onCancelEdit}>
            {t("Cancel")}
          </Button>
        </div>
      ) : null}
      {messages.map((message) => (
        <div
          className={`queued-composer-message ${message.id === editingQueuedMessageId ? "queued-composer-message--editing" : ""}`}
          data-testid="queued-composer-message"
          key={message.id}
        >
          <div className="queued-composer-message__header">
            {message.text ? (
              <div className="queued-composer-message__text">{queuedPreview(message.text)}</div>
            ) : null}
            <div className="queued-composer-message__actions">
              {message.mode !== "steer" ? (
                <Button type="button" onClick={() => onSteerMessage(message.id)}>
                  {t("Steer")}
                </Button>
              ) : null}
              {/* Its annotations cannot be reattached to the transcript, so it is not editable. */}
              {parseAnnotatedPrompt(message.text) ? null : (
                <Button type="button" onClick={() => onEditMessage(message.id)}>
                  {t("Edit")}
                </Button>
              )}
              <Button
                aria-label={t("Delete queued message {{value0}}", {
                  value0: message.text || message.id,
                })}
                type="button"
                onClick={() => onRemoveMessage(message.id)}
              >
                {t("Delete")}
              </Button>
            </div>
          </div>
          {message.attachments.length > 0 ? (
            <div className="queued-composer-message__attachments">
              {message.attachments.map((attachment, index) => (
                <QueuedAttachmentPreview
                  attachment={attachment}
                  key={`${message.id}:${attachment.name}:${index}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function QueuedAttachmentPreview({ attachment }: { readonly attachment: ComposerAttachment }) {
  useLocale();
  return (
    <div className={`queued-composer-attachment queued-composer-attachment--${attachment.kind}`}>
      {attachment.kind === "image" ? (
        <ImageAttachmentThumb
          className="queued-composer-attachment__preview"
          name={attachment.name}
          src={`data:${attachment.mimeType};base64,${attachment.data}`}
        />
      ) : (
        <>
          <span className="queued-composer-attachment__icon" aria-hidden="true">
            <FileIcon />
          </span>
          <span className="queued-composer-attachment__name">{attachment.name}</span>
        </>
      )}
    </div>
  );
}
