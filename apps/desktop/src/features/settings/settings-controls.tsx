import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

/** A checkbox drawn as a switch, so it keeps native checkbox keyboard and form behaviour. */
export function SettingsSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  useLocale();
  return (
    <input
      aria-label={label}
      checked={checked}
      className="settings-switch"
      disabled={disabled}
      role="switch"
      type="checkbox"
      onChange={(event) => onChange(event.currentTarget.checked)}
    />
  );
}

export interface SettingsSegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** Two or three mutually exclusive options, shown inline like Codex's "Bottom | Right". */
export function SettingsSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: readonly SettingsSegmentedOption<T>[];
  readonly value: T | undefined;
  readonly onChange: (value: T) => void;
}) {
  useLocale();
  return (
    <div aria-label={label} className="settings-segmented" role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className="settings-segmented__option"
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: readonly SettingsSegmentedOption<T>[];
  readonly value: T | undefined;
  readonly onChange: (value: T) => void;
}) {
  useLocale();
  // Without a matching option Chromium shows the first one as chosen, and choosing it
  // fires no change, so an unset value gets an explicit placeholder instead.
  const hasValue = options.some((option) => option.value === value);
  return (
    <Select
      value={hasValue ? value : undefined}
      onValueChange={(selectedValue) => onChange(selectedValue as T)}
    >
      <SelectTrigger aria-label={label} className="settings-select-control">
        <SelectValue placeholder={t("Choose…")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
