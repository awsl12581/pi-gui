import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import type { RefObject } from "react";

interface ThreadSearchBarProps {
  readonly query: string;
  readonly matchCount: number;
  readonly activeIndex: number;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onSearch: (query: string) => void;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onClose: () => void;
}

export function ThreadSearchBar({
  query,
  matchCount,
  activeIndex,
  inputRef,
  onSearch,
  onNext,
  onPrev,
  onClose,
}: ThreadSearchBarProps) {
  useLocale();
  return (
    <div className="thread-search-bar" data-testid="thread-search-bar">
      <Input
        ref={inputRef}
        className="thread-search-bar__input"
        type="text"
        placeholder={t("Search thread...")}
        value={query}
        onChange={(e) => onSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
              onPrev();
            } else {
              onNext();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="thread-search-bar__count">
        {query ? (matchCount > 0 ? `${activeIndex + 1} / ${matchCount}` : t("0 results")) : ""}
      </span>
      <div className="thread-search-bar__actions">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Previous match")}

          type="button"
          disabled={matchCount === 0}
          onClick={onPrev}
        >
          &#x25B2;
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Next match")}

          type="button"
          disabled={matchCount === 0}
          onClick={onNext}
        >
          &#x25BC;
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Close search")}

          type="button"
          onClick={onClose}
        >
          &#x2715;
        </Button>
      </div>
    </div>
  );
}
