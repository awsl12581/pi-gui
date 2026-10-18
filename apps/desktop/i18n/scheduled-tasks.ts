import type {
  ScheduledTaskFilter,
  ScheduledTaskRecord,
  ScheduledTaskSchedule,
} from "../contracts/scheduled-tasks";
import { i18n, t } from "./index";

export function formatScheduledTaskRecurrence(schedule: ScheduledTaskSchedule): string {
  if (schedule.kind === "once") {
    const at = new Date(schedule.at);
    return Number.isNaN(at.getTime())
      ? t("Once")
      : t("Once at {{time}}", {
          time: new Intl.DateTimeFormat(i18n.language, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(at),
        });
  }
  if (schedule.kind === "interval") {
    const minutes = Math.round(schedule.everyMs / 60_000);
    if (minutes % 1440 === 0) {
      const count = minutes / 1440;
      return count === 1 ? t("Every day") : t("Every {{count}} days", { count });
    }
    if (minutes % 60 === 0) {
      const count = minutes / 60;
      return count === 1 ? t("Every hour") : t("Every {{count}} hours", { count });
    }
    return minutes === 1 ? t("Every minute") : t("Every {{count}} minutes", { count: minutes });
  }
  // UTC here is only a stable reference clock; the schedule's wall-clock fields remain unchanged.
  const reference = new Date(Date.UTC(2026, 0, 4, schedule.hour, schedule.minute));
  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(reference);
  if (schedule.kind === "daily") return t("Daily at {{time}}", { time });
  const names = [...schedule.days]
    .sort((a, b) => a - b)
    .map((day) =>
      new Intl.DateTimeFormat(i18n.language, { weekday: "short", timeZone: "UTC" }).format(
        new Date(Date.UTC(2026, 0, 4 + day)),
      ),
    );
  const days = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" }).format(
    names,
  );
  return t("{{days}} at {{time}}", { days, time });
}

export function formatScheduledTaskNextRun(nextRunAt: string, now = new Date()): string {
  const timestamp = Date.parse(nextRunAt);
  if (Number.isNaN(timestamp)) return "";
  const diffMs = timestamp - now.getTime();
  if (diffMs <= 0) return t("Due now");
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("Next run in under a minute");
  if (minutes < 60)
    return t("Next run in {{count}} minute{{suffix}}", {
      count: minutes,
      suffix: minutes === 1 ? "" : "s",
    });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t("Next run in {{count}} hour{{suffix}}", {
      count: hours,
      suffix: hours === 1 ? "" : "s",
    });
  const days = Math.floor(hours / 24);
  return t("Next run in {{count}} day{{suffix}}", { count: days, suffix: days === 1 ? "" : "s" });
}

export function formatScheduledTaskRowMeta(task: ScheduledTaskRecord, now = new Date()): string {
  const recurrence = formatScheduledTaskRecurrence(task.schedule);
  if (task.status === "completed") return recurrence;
  if (task.status === "paused") return `${recurrence} · ${t("Paused")}`;
  return task.nextRunAt
    ? `${recurrence} · ${formatScheduledTaskNextRun(task.nextRunAt, now)}`
    : recurrence;
}

export function filterScheduledTasks(
  tasks: readonly ScheduledTaskRecord[],
  filter: ScheduledTaskFilter,
  query = "",
): readonly ScheduledTaskRecord[] {
  const normalized = query.trim().toLocaleLowerCase(i18n.language);
  return tasks.filter(
    (task) =>
      (filter === "all" || task.status === filter) &&
      (!normalized ||
        [task.title, task.instruction, formatScheduledTaskRecurrence(task.schedule)].some((value) =>
          value.toLocaleLowerCase(i18n.language).includes(normalized),
        )),
  );
}
