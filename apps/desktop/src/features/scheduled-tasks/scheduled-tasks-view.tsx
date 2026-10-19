import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { t, i18n } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useMemo, useState } from "react";
import type {
  DesktopAppState,
  ScheduledTaskFilter,
  ScheduledTaskRecord,
} from "../../../contracts/desktop-state";
import { filterScheduledTasks, formatScheduledTaskRowMeta } from "../../../i18n/scheduled-tasks";
import type { PiDesktopApi } from "../../../contracts/ipc";
import type { Dispatch, SetStateAction } from "react";
import type { ScheduledEditorState } from "./scheduled-task-editor";

interface ScheduledTasksViewProps {
  readonly tasks: readonly ScheduledTaskRecord[];
  readonly lastError?: string;
  readonly api: PiDesktopApi;
  readonly setSnapshot: Dispatch<SetStateAction<DesktopAppState | null>>;
  readonly updateSnapshot: (
    setSnapshot: Dispatch<SetStateAction<DesktopAppState | null>>,
    action: () => Promise<DesktopAppState>,
  ) => Promise<DesktopAppState>;
  readonly onCreateWithPi: () => void;
  readonly onOpenEditor: (editor: ScheduledEditorState) => void;
}

const FILTERS: readonly { readonly id: ScheduledTaskFilter; readonly label: string }[] = [
  {
    id: "all",
    get label() {
      return t("All");
    },
  },
  {
    id: "active",
    get label() {
      return t("Active");
    },
  },
  {
    id: "paused",
    get label() {
      return t("Paused");
    },
  },
  {
    id: "completed",
    get label() {
      return t("Completed");
    },
  },
];

export function ScheduledTasksView({
  tasks,
  lastError,
  api,
  setSnapshot,
  updateSnapshot,
  onCreateWithPi,
  onOpenEditor,
}: ScheduledTasksViewProps) {
  useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScheduledTaskFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [menuTaskId, setMenuTaskId] = useState<string | undefined>();
  const visible = useMemo(
    () => filterScheduledTasks(tasks, filter, query),
    [tasks, filter, query, i18n.language],
  );

  return (
    <section className="canvas scheduled-tasks-view" data-testid="scheduled-tasks-view">
      <header className="view-header">
        <div>
          <h1 className="view-header__title">{t("Scheduled tasks")}</h1>
          <p className="view-header__body">
            {t("Ask pi to schedule tasks, set reminders, or monitor for updates.")}
          </p>
        </div>
        <div className="view-header__actions">
          <DropdownMenu open={createOpen} onOpenChange={setCreateOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"

                data-testid="scheduled-task-create"
                type="button"
                aria-haspopup="menu"
                aria-expanded={createOpen}
              >
                {t("Create")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="workspace-menu scheduled-create__menu">
              <DropdownMenuItem
                className="workspace-menu__item"
                data-testid="scheduled-task-create-with-pi"
                onClick={() => {
                  setCreateOpen(false);
                  onCreateWithPi();
                }}
              >
                {t("Create with pi")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="workspace-menu__item"
                data-testid="scheduled-task-setup-manually"
                onClick={() => {
                  setCreateOpen(false);
                  onOpenEditor({ mode: "create" });
                }}
              >
                {t("Set up manually")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="scheduled-toolbar">
        <Input
          aria-label={t("Search scheduled tasks")}
          className="skills-search"
          data-testid="scheduled-task-search"
          placeholder={t("Search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Tabs value={filter} onValueChange={(value) => setFilter(value as ScheduledTaskFilter)}>
          <TabsList variant="line" className="scheduled-tabs">
            {FILTERS.map((entry) => (
              <TabsTrigger
                value={entry.id}
                className={`scheduled-tabs__item${filter === entry.id ? " scheduled-tabs__item--active" : ""}`}
                data-testid={`scheduled-task-filter-${entry.id}`}
                key={entry.id}
                type="button"
              >
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {lastError ? <p className="error-banner">{lastError}</p> : null}

      {visible.length === 0 ? (
        <div className="empty-panel" data-testid="scheduled-tasks-empty">
          <h2>{filter === "active" ? t("No active scheduled tasks") : t("No scheduled tasks")}</h2>
          <p>
            {filter === "active"
              ? t(
                  "Scheduled tasks run on this device while pi-gui is open. They do not run in the cloud or after you quit.",
                )
              : t("Create a task manually or ask pi to set one up.")}
          </p>
        </div>
      ) : (
        <div className="scheduled-task-list">
          {visible.map((task) => (
            <article
              className="scheduled-task-row"
              data-testid="scheduled-task-row"
              data-task-id={task.id}
              key={task.id}
            >
              <Button
                variant="ghost"
                className="scheduled-task-row__body"
                type="button"
                onClick={() => onOpenEditor({ mode: "edit", taskId: task.id })}
              >
                <strong className="scheduled-task-row__title">{task.title}</strong>
                <span className="scheduled-task-row__meta">{formatScheduledTaskRowMeta(task)}</span>
              </Button>
              <DropdownMenu
                open={menuTaskId === task.id}
                onOpenChange={(open) => setMenuTaskId(open ? task.id : undefined)}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"

                    type="button"
                    aria-label={t("Actions for {{value0}}", { value0: task.title })}
                    aria-haspopup="menu"
                    aria-expanded={menuTaskId === task.id}
                  >
                    …
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="workspace-menu scheduled-task-row__menu"
                >
                  {task.status === "paused" ? (
                    <DropdownMenuItem
                      className="workspace-menu__item"
                      onClick={() => {
                        setMenuTaskId(undefined);
                        void updateSnapshot(setSnapshot, () =>
                          api.updateScheduledTask(task.id, { status: "active" }),
                        ).catch((error: unknown) => {
                          console.error("[renderer] updateScheduledTask failed", error);
                        });
                      }}
                    >
                      {t("Resume")}
                    </DropdownMenuItem>
                  ) : task.status !== "completed" ? (
                    <DropdownMenuItem
                      className="workspace-menu__item"
                      onClick={() => {
                        setMenuTaskId(undefined);
                        void updateSnapshot(setSnapshot, () =>
                          api.updateScheduledTask(task.id, { status: "paused" }),
                        ).catch((error: unknown) => {
                          console.error("[renderer] updateScheduledTask failed", error);
                        });
                      }}
                    >
                      {t("Pause")}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="workspace-menu__item"
                    onClick={() => {
                      setMenuTaskId(undefined);
                      onOpenEditor({ mode: "edit", taskId: task.id });
                    }}
                  >
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="workspace-menu__item workspace-menu__item--danger"
                    onClick={() => {
                      setMenuTaskId(undefined);
                      void updateSnapshot(setSnapshot, () =>
                        api.deleteScheduledTask(task.id),
                      ).catch((error: unknown) => {
                        console.error("[renderer] deleteScheduledTask failed", error);
                      });
                    }}
                  >
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
