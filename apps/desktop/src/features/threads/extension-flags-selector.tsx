import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useState } from "react";
import type { ExtensionFlagValues } from "@pi-gui/session-driver";
import type { RuntimeExtensionFlag, RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import { SettingsSwitch } from "../settings/settings-controls";

interface FlagGroup {
  readonly title: string;
  readonly flags: readonly RuntimeExtensionFlag[];
}

function flagGroups(runtime: RuntimeSnapshot | undefined): readonly FlagGroup[] {
  return (runtime?.extensions ?? [])
    .filter((extension) => extension.enabled && extension.flagDetails.length > 0)
    .map((extension) => ({ title: extension.displayName, flags: extension.flagDetails }));
}

/** Flags that reach pi: switches that are on and value flags with text. */
function setFlagEntries(values: ExtensionFlagValues | undefined): [string, true | string][] {
  return Object.entries(values ?? {}).flatMap(([name, value]): [string, true | string][] =>
    value === true || (typeof value === "string" && value.trim()) ? [[name, value]] : [],
  );
}

function flagsBadgeLabel(count: number): string {
  return count > 0 ? t("Flags · {{value0}}", { value0: count }) : t("Flags");
}

/**
 * Flags the workspace's extensions registered, set for the thread about to start,
 * like typing `pi --name value`. Pi reads them once, when the thread's session loads.
 */
export function ExtensionFlagsSelector({
  runtime,
  values,
  onSetFlag,
}: {
  readonly runtime: RuntimeSnapshot | undefined;
  readonly values: ExtensionFlagValues;
  readonly onSetFlag: (name: string, value: boolean | string) => void;
}) {
  useLocale();
  const [open, setOpen] = useState(false);
  const groups = flagGroups(runtime);

  if (groups.length === 0) return null;
  const registered = new Set(groups.flatMap((group) => group.flags.map((flag) => flag.name)));
  const setCount = setFlagEntries(values).filter(([name]) => registered.has(name)).length;

  return (
    <span className="model-selector">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            aria-expanded={open}
            className="model-selector__badge"
            type="button"
            data-testid="extension-flags-badge"
          >
            {flagsBadgeLabel(setCount)}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="model-selector__dropdown model-selector__dropdown--below extension-flags__dropdown"
          data-testid="extension-flags-dropdown"
          onWheel={(event) => event.stopPropagation()}
        >
          {groups.map((group) => (
            <div key={group.title}>
              <div className="model-selector__group-title">{group.title}</div>
              {group.flags.map((flag) => {
                const value = values[flag.name];
                return (
                  <div className="extension-flags__item" key={flag.name}>
                    <span className="extension-flags__name">
                      <span className="extension-flags__flag">--{flag.name}</span>
                      {flag.description ? (
                        <span className="model-selector__item-meta">{flag.description}</span>
                      ) : null}
                    </span>
                    {flag.type === "boolean" ? (
                      // pi can only switch a boolean flag on, so one that defaults to on stays on.
                      <SettingsSwitch
                        label={`--${flag.name}`}
                        checked={value === true || flag.default === true}
                        disabled={flag.default === true}
                        onChange={(checked) => onSetFlag(flag.name, checked)}
                      />
                    ) : (
                      <Input
                        type="text"
                        className="extension-flags__input"
                        aria-label={`--${flag.name}`}
                        placeholder={typeof flag.default === "string" ? flag.default : "value"}
                        spellCheck={false}
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => onSetFlag(flag.name, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </span>
  );
}

/** The flags a running thread's pi session started with. Read-only: pi reads flags only at load. */
export function ExtensionFlagsBadge({
  values,
}: {
  readonly values: ExtensionFlagValues | undefined;
}) {
  useLocale();
  const entries = setFlagEntries(values);
  if (entries.length === 0) return null;
  const summary = entries
    .map(([name, value]) => (value === true ? `--${name}` : `--${name} ${value}`))
    .join("\n");
  return (
    <span
      className="model-selector__badge extension-flags__badge--readonly"
      data-testid="extension-flags-session-badge"
      title={t("Started with:\n{{value0}}", { value0: summary })}
    >
      {flagsBadgeLabel(entries.length)}
    </span>
  );
}
