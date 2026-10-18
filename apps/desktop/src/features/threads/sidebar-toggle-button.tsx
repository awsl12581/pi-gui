import { Button } from "../../components/ui/button";
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
    <div className="shortcut-tooltip-wrap sidebar-toggle">
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
      <span className="shortcut-tooltip sidebar-toggle__tooltip" role="tooltip">
        <span>{t("Toggle sidebar")}</span>
        <kbd>{shortcutLabel}</kbd>
      </span>
    </div>
  );
}
