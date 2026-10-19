import type {
  ModelSettingsSnapshot,
  RuntimeSettingsSnapshot,
  RuntimeSnapshot,
} from "@pi-gui/session-driver/runtime-types";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, sep } from "node:path";

export function applyModelSettingsSnapshot(
  runtime: RuntimeSnapshot,
  settings: ModelSettingsSnapshot,
): RuntimeSnapshot {
  return {
    ...runtime,
    settings: {
      ...runtime.settings,
      ...(settings.defaultProvider
        ? { defaultProvider: settings.defaultProvider }
        : { defaultProvider: undefined }),
      ...(settings.defaultModelId
        ? { defaultModelId: settings.defaultModelId }
        : { defaultModelId: undefined }),
      ...(settings.defaultThinkingLevel
        ? { defaultThinkingLevel: settings.defaultThinkingLevel }
        : { defaultThinkingLevel: undefined }),
      enabledModelPatterns: [...settings.enabledModelPatterns],
    },
  };
}

/** Shows paths under the home directory as ~/…, as in Pi's docs. */
export function withHomeAsTilde(path: string): string {
  const home = homedir();
  return path.startsWith(`${home}${sep}`) ? `~${path.slice(home.length)}` : path;
}

/** Resolve Pi's default agent settings without importing its ESM-only runtime into main. */
export function resolveGlobalSettingsPath(): string {
  const override = process.env.PI_CODING_AGENT_DIR;
  const agentDir = override
    ? override.startsWith("~")
      ? join(homedir(), override.slice(1))
      : override
    : join(homedir(), ".pi", "agent");
  return join(agentDir, "settings.json");
}

export async function readProjectModelSettingsFile(
  workspacePath: string,
): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(join(workspacePath, ".pi", "settings.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function mergeModelSettingsSnapshot(
  globalSettings: ModelSettingsSnapshot,
  projectSettings: Record<string, unknown>,
): ModelSettingsSnapshot {
  const defaultProvider =
    typeof projectSettings.defaultProvider === "string"
      ? projectSettings.defaultProvider
      : globalSettings.defaultProvider;
  const defaultModelId =
    typeof projectSettings.defaultModel === "string"
      ? projectSettings.defaultModel
      : globalSettings.defaultModelId;
  const defaultThinkingLevel =
    typeof projectSettings.defaultThinkingLevel === "string"
      ? (projectSettings.defaultThinkingLevel as RuntimeSettingsSnapshot["defaultThinkingLevel"])
      : globalSettings.defaultThinkingLevel;

  return {
    enabledModelPatterns: Array.isArray(projectSettings.enabledModels)
      ? projectSettings.enabledModels.filter((value): value is string => typeof value === "string")
      : [...globalSettings.enabledModelPatterns],
    ...(defaultProvider ? { defaultProvider } : {}),
    ...(defaultModelId ? { defaultModelId } : {}),
    ...(defaultThinkingLevel ? { defaultThinkingLevel } : {}),
  };
}

export function hasStoredModelSettings(
  settings: ModelSettingsSnapshot | undefined,
): settings is ModelSettingsSnapshot {
  return Boolean(
    settings &&
    (settings.enabledModelPatterns.length > 0 ||
      settings.defaultProvider ||
      settings.defaultModelId ||
      settings.defaultThinkingLevel),
  );
}

export function modelSettingsEqual(
  left: ModelSettingsSnapshot,
  right: ModelSettingsSnapshot,
): boolean {
  return (
    left.defaultProvider === right.defaultProvider &&
    left.defaultModelId === right.defaultModelId &&
    left.defaultThinkingLevel === right.defaultThinkingLevel &&
    left.enabledModelPatterns.length === right.enabledModelPatterns.length &&
    left.enabledModelPatterns.every(
      (pattern, index) => pattern === right.enabledModelPatterns[index],
    )
  );
}

export function mergeEnabledModelPatterns(
  existingPatterns: readonly string[],
  providerPatterns: readonly string[],
): readonly string[] {
  const merged = [...existingPatterns];
  const seen = new Set(existingPatterns);
  for (const pattern of providerPatterns) {
    if (seen.has(pattern)) {
      continue;
    }
    seen.add(pattern);
    merged.push(pattern);
  }
  return merged;
}
