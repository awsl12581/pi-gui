import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "../../components/ui/item";
import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useState, type ReactNode } from "react";
import { SettingsSwitch } from "../settings/settings-controls";

export interface ResourceListItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly enabled: boolean;
  /** Undefined when pi cannot change this item, such as a built-in extension. */
  readonly onToggle?: (enabled: boolean) => void;
}

export interface ResourceListGroup {
  readonly label: string;
  readonly items: readonly ResourceListItem[];
}

const COLLAPSED_ROW_COUNT = 6;

/** Cursor-style groups of Codex-style rows: icon tile, name, one-line description, switch. */
export function ResourceList({
  groups,
  icon,
  expanded,
  testId,
  onOpen,
}: {
  readonly groups: readonly ResourceListGroup[];
  readonly icon: ReactNode;
  /** Show every row, as while searching. */
  readonly expanded: boolean;
  readonly testId: string;
  readonly onOpen: (id: string) => void;
}) {
  useLocale();
  return (
    <div className="resource-list" data-testid={testId}>
      {groups.map((group) => (
        <ResourceGroup
          expanded={expanded}
          group={group}
          icon={icon}
          key={group.label}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function ResourceGroup({
  group,
  icon,
  expanded,
  onOpen,
}: {
  readonly group: ResourceListGroup;
  readonly icon: ReactNode;
  readonly expanded: boolean;
  readonly onOpen: (id: string) => void;
}) {
  useLocale();
  const [showAll, setShowAll] = useState(false);
  const visible = expanded || showAll ? group.items : group.items.slice(0, COLLAPSED_ROW_COUNT);
  const hiddenCount = group.items.length - visible.length;

  return (
    <section className="settings-section">
      <h3 className="settings-section__title">
        {group.label} <span className="resource-list__count">{group.items.length}</span>
      </h3>
      <ItemGroup variant="outline">
        {visible.map((item) => (
          <Item key={item.id} size="sm" role="listitem">
            <Item asChild size="content" variant="interactive">
              <button type="button" data-resource-id={item.id} onClick={() => onOpen(item.id)}>
                <ItemMedia variant="icon" aria-hidden="true">
                  {icon}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{item.title}</ItemTitle>
                  <ItemDescription truncate>{item.description}</ItemDescription>
                </ItemContent>
              </button>
            </Item>
            <ItemActions>
              <SettingsSwitch
                checked={item.enabled}
                disabled={!item.onToggle}
                label={t("Enable {{value0}}", { value0: item.title })}
                onChange={(enabled) => item.onToggle?.(enabled)}
              />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
      {hiddenCount > 0 ? (
        <Button variant="link" size="xs" type="button" onClick={() => setShowAll(true)}>
          {t("Show {{value0}} more", { value0: hiddenCount })}
        </Button>
      ) : null}
    </section>
  );
}

export function ResourceEmptyState({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  useLocale();
  return (
    <div className="settings-group resource-empty">
      <div className="resource-empty__title">{title}</div>
      <p className="resource-empty__body">{body}</p>
    </div>
  );
}
