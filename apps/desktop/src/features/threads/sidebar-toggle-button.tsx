import { Button } from "../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { SidebarToggleIcon } from "../../ui/icons";

interface SidebarToggleButtonProps {
  readonly collapsed: boolean;
  readonly shortcutLabel: string;
  readonly onToggle: () => void;
}

export function SidebarToggleButton({
  collapsed,
  shortcutLabel,
  onToggle,
}: SidebarToggleButtonProps) {
  useLocale();
  return (
    <div className="sidebar-toggle">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Toggle sidebar")}
            aria-pressed={!collapsed}
            className="sidebar-toggle__button"
            data-testid="sidebar-toggle"
            type="button"
            onClick={onToggle}
          >
            <SidebarToggleIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="sidebar-toggle__tooltip">
          <span>{t("Toggle sidebar")}</span>
          <kbd>{shortcutLabel}</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
