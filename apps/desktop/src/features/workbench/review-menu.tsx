import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import { Fragment, useId, type ReactNode } from "react";

export interface ReviewMenuOption {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  /** Draws a divider above this option, grouping it with the options after it. */
  readonly startsGroup?: boolean;
}

interface ReviewMenuProps {
  readonly label: string;
  readonly buttonClassName: string;
  readonly buttonContent: ReactNode;
  readonly align: "start" | "end";
  readonly options: readonly ReviewMenuOption[];
  readonly onSelect: (id: string) => void;
  /** Read-only lines shown above the options, such as the resolved comparison. */
  readonly details?: readonly string[];
  /** The current choice, shown on the button and announced alongside its label. */
  readonly value?: string;
}

/** A small single-choice popover menu for the Review toolbar. */
export function ReviewMenu({
  label,
  buttonClassName,
  buttonContent,
  align,
  options,
  onSelect,
  details,
  value,
}: ReviewMenuProps) {
  const valueId = useId();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={buttonClassName}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          title={label}
          aria-describedby={value ? valueId : undefined}
        >
          {value ? <span id={valueId}>{value}</span> : null}
          {buttonContent}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="workspace-menu review-menu__popover"
        aria-label={label}
      >
        {details?.length ? (
          <div className="review-menu__details" data-testid="review-comparison-identity">
            {details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        ) : null}
        <DropdownMenuRadioGroup
          value={options.find((option) => option.checked)?.id}
          onValueChange={onSelect}
        >
          {options.map((option) => (
            <Fragment key={option.id}>
              {option.startsGroup ? (
                <DropdownMenuSeparator className="review-menu__divider" />
              ) : null}
              <DropdownMenuRadioItem
                value={option.id}
                className="workspace-menu__item review-menu__item"
                data-option-id={option.id}
              >
                <span>{option.label}</span>
              </DropdownMenuRadioItem>
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
