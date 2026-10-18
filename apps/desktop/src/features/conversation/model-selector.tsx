import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { t, i18n } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useMemo, useState } from "react";
import type { RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import {
  buildModelOptions,
  MODEL_OPTIONS_EMPTY_TITLE,
  THINKING_OPTIONS,
  type ComposerModelOption,
} from "./composer-commands";

interface ModelSelectorProps {
  readonly runtime: RuntimeSnapshot | undefined;
  readonly provider: string | undefined;
  readonly modelId: string | undefined;
  readonly thinkingLevel: string | undefined;
  readonly disabled?: boolean;
  readonly dropdownPlacement?: "above" | "below";
  readonly showEmptyModelControl?: boolean;
  readonly unselectedModelLabel?: string;
  readonly emptyModelLabel?: string;
  readonly emptyModelTitle?: string;
  readonly onSetModel: (provider: string, modelId: string) => void;
  readonly onSetThinking: (level: string) => void;
}

type OpenDropdown = "none" | "model" | "thinking";

export function ModelSelector({
  runtime,
  provider,
  modelId,
  thinkingLevel,
  disabled,
  dropdownPlacement = "above",
  showEmptyModelControl = false,
  unselectedModelLabel = t("Choose model"),
  emptyModelLabel = t("Choose model"),
  emptyModelTitle = MODEL_OPTIONS_EMPTY_TITLE,
  onSetModel,
  onSetThinking,
}: ModelSelectorProps) {
  useLocale();
  const [open, setOpen] = useState<OpenDropdown>("none");
  const [modelFilter, setModelFilter] = useState("");

  const modelOptions = useMemo(() => buildModelOptions(runtime), [runtime, i18n.language]);
  const filteredModels = useMemo(() => {
    if (!modelFilter) return modelOptions;
    const q = modelFilter.toLowerCase();
    return modelOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q) ||
        opt.providerId.toLowerCase().includes(q),
    );
  }, [modelOptions, modelFilter, i18n.language]);

  const groupedModels = useMemo(
    () => groupByProvider(filteredModels),
    [filteredModels, i18n.language],
  );
  const hasAvailableModelOptions = modelOptions.length > 0;
  const hasModelControl = Boolean(provider && modelId) || hasAvailableModelOptions;
  const shouldRenderModelControl = hasModelControl || showEmptyModelControl;
  const modelBadgeLabel =
    provider && modelId
      ? `${provider}:${modelId}`
      : hasAvailableModelOptions
        ? unselectedModelLabel
        : emptyModelLabel;
  const noMatchingModels =
    hasAvailableModelOptions && modelFilter.trim().length > 0 && groupedModels.length === 0;

  if (!shouldRenderModelControl && !thinkingLevel) {
    return null;
  }

  return (
    <span className="model-selector">
      {shouldRenderModelControl ? (
        <Popover open={open === "model"} onOpenChange={(next) => setOpen(next ? "model" : "none")}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="model-selector__badge"
              type="button"
              disabled={disabled}
            >
              {modelBadgeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side={dropdownPlacement === "below" ? "bottom" : "top"}
            className={`model-selector__dropdown ${dropdownPlacement === "below" ? "model-selector__dropdown--below" : ""}`}
            onWheel={(event) => event.stopPropagation()}
          >
            <div className="model-selector__filter">
              <Input
                className="model-selector__filter-input"
                placeholder={t("Filter models...")}
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                autoFocus
              />
            </div>
            {groupedModels.map((group) => (
              <div key={group.provider}>
                <div className="model-selector__group-title">{group.provider}</div>
                {group.items.map((option) => {
                  const isActive = option.providerId === provider && option.modelId === modelId;
                  return (
                    <Button
                      variant="ghost"
                      className={`model-selector__item${isActive ? " model-selector__item--active" : ""}`}
                      key={`${option.providerId}:${option.modelId}`}
                      type="button"
                      onClick={() => {
                        if (!isActive) {
                          onSetModel(option.providerId, option.modelId);
                        }
                        setOpen("none");
                      }}
                    >
                      <span className="model-selector__item-label">{option.label}</span>
                      {isActive ? (
                        <span className="model-selector__item-meta">{t("active")}</span>
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            ))}
            {groupedModels.length === 0 ? (
              <>
                <div className="model-selector__group-title">
                  {noMatchingModels ? t("No matching models") : t(emptyModelTitle)}
                </div>
                {noMatchingModels ? (
                  <div className="model-selector__empty">{t("Try a different filter.")}</div>
                ) : null}
              </>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : null}
      {thinkingLevel ? (
        <Popover
          open={open === "thinking"}
          onOpenChange={(next) => setOpen(next ? "thinking" : "none")}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="model-selector__badge"
              type="button"
              disabled={disabled}
            >
              {t(thinkingLevel)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side={dropdownPlacement === "below" ? "bottom" : "top"}
            className={`model-selector__dropdown ${dropdownPlacement === "below" ? "model-selector__dropdown--below" : ""}`}
            onWheel={(event) => event.stopPropagation()}
          >
            <div className="model-selector__group-title">{t("Thinking Level")}</div>
            {THINKING_OPTIONS.map((option) => {
              const isActive = option.value === thinkingLevel;
              return (
                <Button
                  variant="ghost"
                  className={`model-selector__item${isActive ? " model-selector__item--active" : ""}`}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (!isActive) {
                      onSetThinking(option.value);
                    }
                    setOpen("none");
                  }}
                >
                  <span className="model-selector__item-label">{option.label}</span>
                  <span className="model-selector__item-meta">{option.description}</span>
                </Button>
              );
            })}
          </PopoverContent>
        </Popover>
      ) : null}
    </span>
  );
}

interface ModelGroup {
  readonly provider: string;
  readonly items: readonly ComposerModelOption[];
}

function groupByProvider(options: readonly ComposerModelOption[]): readonly ModelGroup[] {
  const groups = new Map<string, ComposerModelOption[]>();
  for (const option of options) {
    const existing = groups.get(option.providerId);
    if (existing) {
      existing.push(option);
    } else {
      groups.set(option.providerId, [option]);
    }
  }
  return Array.from(groups.entries()).map(([provider, items]) => ({ provider, items }));
}
