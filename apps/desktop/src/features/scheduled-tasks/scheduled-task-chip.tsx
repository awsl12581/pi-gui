import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import type { ScheduledTaskRecord } from "../../../contracts/desktop-state";
import { formatScheduledTaskRowMeta } from "../../../i18n/scheduled-tasks";

interface ScheduledTaskChipProps {
  readonly task: ScheduledTaskRecord;
  readonly onOpen: () => void;
}

export function ScheduledTaskChip({ task, onOpen }: ScheduledTaskChipProps) {
  useLocale();
  return (
    <div className="scheduled-task-chip" data-testid="scheduled-task-chip">
      <span>{formatScheduledTaskRowMeta(task)}</span>
      <Button variant="outline" type="button" onClick={onOpen}>
        {t("Open")}
      </Button>
    </div>
  );
}
