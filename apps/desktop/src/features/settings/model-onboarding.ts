import { t } from "../../../i18n";
import type { RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import { buildModelOptions } from "../conversation/composer-commands";

export type ModelOnboardingSettingsSection = "models" | "providers";

export interface ModelOnboardingNotice {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly actionSection: ModelOnboardingSettingsSection;
}

export interface ModelOnboardingState {
  readonly hasSelectableModels: boolean;
  readonly requiresModelSelection: boolean;
  readonly unselectedModelLabel: string;
  readonly emptyModelTitle: string;
  readonly emptyModelDescription: string;
  readonly notice?: ModelOnboardingNotice;
}

interface ModelSelectionInput {
  readonly provider: string | undefined;
  readonly modelId: string | undefined;
}

export function deriveModelOnboardingState(
  runtime: RuntimeSnapshot | undefined,
  currentSelection: ModelSelectionInput,
): ModelOnboardingState {
  const selectableModels = buildModelOptions(runtime);
  const selectableSet = new Set(
    selectableModels.map((model) => `${model.providerId}:${model.modelId}`),
  );
  const hasSelectableModels = selectableModels.length > 0;
  const connectedProviderCount =
    runtime?.providers.filter((provider) => provider.hasAuth).length ?? 0;
  const settingsDefault = {
    provider: runtime?.settings.defaultProvider,
    modelId: runtime?.settings.defaultModelId,
  };
  const hasDefaultModel = Boolean(settingsDefault.provider && settingsDefault.modelId);
  const defaultModelUsable = isUsableSelection(settingsDefault, selectableSet);
  const hasCurrentSelection = Boolean(currentSelection.provider && currentSelection.modelId);
  const currentSelectionUsable = isUsableSelection(currentSelection, selectableSet);

  if (!hasSelectableModels) {
    return {
      hasSelectableModels: false,
      requiresModelSelection: true,
      unselectedModelLabel: t("No models available"),
      emptyModelTitle: t("No models available"),
      emptyModelDescription:
        connectedProviderCount > 0
          ? t("Open Settings > Models to enable models.")
          : t("Open Settings > Providers to connect a provider and make models available."),
      notice:
        connectedProviderCount > 0
          ? {
              title: t("No models available"),
              description: t(
                "All available models are currently disabled. Open Settings > Models to enable models.",
              ),
              actionLabel: t("Open Settings > Models"),
              actionSection: "models",
            }
          : {
              title: t("No models available"),
              description: t(
                "Connect a provider in Settings > Providers before choosing a model or setting a default.",
              ),
              actionLabel: t("Open Settings > Providers"),
              actionSection: "providers",
            },
    };
  }

  if (hasCurrentSelection && !currentSelectionUsable) {
    return {
      hasSelectableModels: true,
      requiresModelSelection: true,
      unselectedModelLabel: t("Pick a model"),
      emptyModelTitle: t("No models available"),
      emptyModelDescription: t("Pick a model."),
      notice: {
        title: t("Selected model unavailable"),
        description: hasDefaultModel
          ? t(
              "The model selected for this thread is no longer available. Choose another model, then open Settings > Models to update the default.",
            )
          : t(
              "The model selected for this thread is no longer available. Choose another model, then open Settings > Models to choose the app default.",
            ),
        actionLabel: t("Open Settings > Models"),
        actionSection: "models",
      },
    };
  }

  if (!hasDefaultModel) {
    return {
      hasSelectableModels: true,
      requiresModelSelection: !currentSelectionUsable,
      unselectedModelLabel: t("Pick a model"),
      emptyModelTitle: t("No default model set"),
      emptyModelDescription: t("Pick a model."),
      notice: currentSelectionUsable
        ? undefined
        : {
            title: t("No default model set"),
            description: t("Set a default model in Settings > Models."),
            actionLabel: t("Open Settings > Models"),
            actionSection: "models",
          },
    };
  }

  if (!defaultModelUsable) {
    const defaultLabel = `${settingsDefault.provider}:${settingsDefault.modelId}`;
    return {
      hasSelectableModels: true,
      requiresModelSelection: !currentSelectionUsable,
      unselectedModelLabel: t("Pick a model"),
      emptyModelTitle: t("Default model unavailable"),
      emptyModelDescription: t("Pick a model."),
      notice: {
        title: t("Default model unavailable"),
        description: currentSelectionUsable
          ? t(
              "Your saved default ({{value0}}) is no longer available. Open Settings > Models to update it.",
              { value0: defaultLabel },
            )
          : t(
              "Your saved default ({{value0}}) is no longer available. Choose a model for this thread, then open Settings > Models to update it.",
              { value0: defaultLabel },
            ),
        actionLabel: t("Open Settings > Models"),
        actionSection: "models",
      },
    };
  }

  return {
    hasSelectableModels: true,
    requiresModelSelection: false,
    unselectedModelLabel: t("Pick a model"),
    emptyModelTitle: t("No models available"),
    emptyModelDescription: t("Pick a model."),
  };
}

function isUsableSelection(
  selection: ModelSelectionInput,
  selectableSet: ReadonlySet<string>,
): boolean {
  return Boolean(
    selection.provider &&
    selection.modelId &&
    selectableSet.has(`${selection.provider}:${selection.modelId}`),
  );
}
