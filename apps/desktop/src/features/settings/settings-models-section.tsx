import { SearchIcon } from "../../ui/icons";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../components/ui/input-group";
import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useState, type ReactNode } from "react";
import type {
  RuntimeModelRecord,
  RuntimeSettingsSnapshot,
  RuntimeSnapshot,
} from "@pi-gui/session-driver/runtime-types";
import { SettingsSelect, SettingsSwitch } from "./settings-controls";
import {
  filterModels,
  labelForThinking,
  SettingsGroup,
  SettingsRow,
  THINKING_LEVELS,
} from "./settings-utils";

interface SettingsModelsSectionProps {
  readonly runtime?: RuntimeSnapshot;
  readonly onSetDefaultModel: (provider: string, modelId: string) => void;
  readonly onSetThinkingLevel: (
    thinkingLevel: RuntimeSettingsSnapshot["defaultThinkingLevel"],
  ) => void;
  readonly onSetScopedModelPatterns: (patterns: readonly string[]) => void;
  readonly onOpenProviders: () => void;
}

const THINKING_OPTIONS = THINKING_LEVELS.map((level) => ({
  value: level,
  label: labelForThinking(level),
}));

function modelPattern(model: RuntimeModelRecord): string {
  return `${model.providerId}/${model.modelId}`;
}

/** Cursor's Models page: defaults on top, then one searchable list with a switch per model. */
export function SettingsModelsSection({
  runtime,
  onSetDefaultModel,
  onSetThinkingLevel,
  onSetScopedModelPatterns,
  onOpenProviders,
}: SettingsModelsSectionProps) {
  useLocale();
  const [query, setQuery] = useState("");
  const [showUnconnected, setShowUnconnected] = useState(false);

  const models = runtime?.models ?? [];
  const availableModels = models.filter((model) => model.available);
  const unconnectedModels = models.filter((model) => !model.available);

  // No saved patterns means pi enables every available model.
  const savedPatterns = runtime?.settings.enabledModelPatterns ?? [];
  const activePatterns =
    savedPatterns.length === 0 ? availableModels.map(modelPattern) : savedPatterns;
  const activeSet = new Set(activePatterns);
  const enabledModels = availableModels.filter((model) => activeSet.has(modelPattern(model)));

  const defaultProvider = runtime?.settings.defaultProvider;
  const defaultModelId = runtime?.settings.defaultModelId;
  const defaultValue =
    defaultProvider && defaultModelId ? `${defaultProvider}:${defaultModelId}` : undefined;
  const defaultIsEnabled = enabledModels.some(
    (model) => model.providerId === defaultProvider && model.modelId === defaultModelId,
  );

  const searching = query.trim().length > 0;
  const visibleAvailable = filterModels(availableModels, query);
  const visibleUnconnected = filterModels(unconnectedModels, query);

  const setEnabled = (pattern: string, enabled: boolean) => {
    const next = enabled
      ? [...activePatterns, pattern]
      : activePatterns.filter((entry) => entry !== pattern);
    if (next.length > 0) onSetScopedModelPatterns(next);
  };

  return (
    <>
      <SettingsGroup>
        <SettingsRow title={t("Default model")} description={t("Used for new threads.")}>
          <SettingsSelect
            label={t("Default model")}
            options={enabledModels.map((model) => ({
              value: `${model.providerId}:${model.modelId}`,
              label: `${model.providerName} · ${model.label}`,
            }))}
            value={defaultIsEnabled ? defaultValue : undefined}
            onChange={(value) => {
              const [provider = "", ...modelParts] = value.split(":");
              onSetDefaultModel(provider, modelParts.join(":"));
            }}
          />
        </SettingsRow>
        <SettingsRow
          title={t("Reasoning")}
          description={t("Default reasoning effort for new threads.")}
        >
          <SettingsSelect
            label={t("Reasoning")}
            options={THINKING_OPTIONS}
            value={runtime?.settings.defaultThinkingLevel ?? undefined}
            onChange={onSetThinkingLevel}
          />
        </SettingsRow>
        {defaultValue && !defaultIsEnabled ? (
          <div className="settings-row">
            <span className="settings-warning">
              {t(
                "Your default model ({{model}}) is turned off or its provider is not connected. Choose a new default.",
                { model: `${defaultProvider}/${defaultModelId}` },
              )}
            </span>
          </div>
        ) : null}
      </SettingsGroup>

      <section className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">
            {t("Enabled models")}{" "}
            <span className="resource-list__count">
              {t("{{shown}} of {{total}}", {
                shown: enabledModels.length,
                total: availableModels.length,
              })}
            </span>
          </h3>
          <InputGroup variant="search">
            <InputGroupInput
              type="search"
              spellCheck={false}
              aria-label={t("Search models")}
              placeholder={t("Search models")}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <p className="settings-section__description">
          {t("Only enabled models appear in model pickers.")}
        </p>
        <div className="settings-group" data-testid="settings-model-list">
          {visibleAvailable.length === 0 ? (
            <div className="settings-row">
              <span className="settings-row__description">
                {availableModels.length === 0
                  ? t("No connected models available yet. Connect a provider to add models.")
                  : t("No connected models match “{{value0}}”.", { value0: query.trim() })}
              </span>
            </div>
          ) : (
            visibleAvailable.map((model) => {
              const pattern = modelPattern(model);
              const enabled = activeSet.has(pattern);
              return (
                <ModelRow
                  isDefault={
                    model.providerId === defaultProvider && model.modelId === defaultModelId
                  }
                  key={pattern}
                  model={model}
                >
                  <SettingsSwitch
                    checked={enabled}
                    disabled={enabled && activePatterns.length <= 1}
                    label={t("Enable {{value0}}", { value0: pattern })}
                    onChange={(next) => setEnabled(pattern, next)}
                  />
                </ModelRow>
              );
            })
          )}
        </div>
      </section>

      {unconnectedModels.length > 0 && (!searching || visibleUnconnected.length > 0) ? (
        <section className="settings-section">
          <div className="settings-section__header">
            <h3 className="settings-section__title">
              {t("Not connected")}{" "}
              <span className="resource-list__count">{visibleUnconnected.length}</span>
            </h3>
            <Button variant="outline" type="button" onClick={onOpenProviders}>
              {t("Connect a provider")}
            </Button>
          </div>
          <p className="settings-section__description">
            {t("Models from providers you have not signed in to.")}
          </p>
          {searching || showUnconnected ? (
            <div className="settings-group" data-testid="settings-unconnected-model-list">
              {visibleUnconnected.map((model) => (
                <ModelRow isDefault={false} key={modelPattern(model)} model={model} />
              ))}
            </div>
          ) : (
            <button
              className="resource-list__more"
              type="button"
              onClick={() => setShowUnconnected(true)}
            >
              {t("Show {{count}} models", { count: unconnectedModels.length })}
            </button>
          )}
        </section>
      ) : null}
    </>
  );
}

function ModelRow({
  model,
  isDefault,
  children,
}: {
  readonly model: RuntimeModelRecord;
  readonly isDefault: boolean;
  readonly children?: ReactNode;
}) {
  useLocale();
  return (
    <div className="settings-row model-row">
      <div className="settings-row__label">
        <div className="settings-row__title">
          {model.label}
          {isDefault ? <span className="model-row__badge">{t("Default")}</span> : null}
        </div>
        <div className="settings-row__description">
          {model.providerName} · {modelPattern(model)}
          {model.reasoning ? <span className="model-row__tag">{t("Reasoning")}</span> : null}
          {model.supportsImages ? <span className="model-row__tag">{t("Images")}</span> : null}
        </div>
      </div>
      {children ? <div className="settings-row__control">{children}</div> : null}
    </div>
  );
}
