import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PiDesktopApi } from "../../contracts/ipc";
import type { AppView, DesktopAppState, WorkspaceRecord } from "../../contracts/desktop-state";
import type { SettingsSection } from "../features/settings/settings-view";
import { updateSnapshot } from "./desktop-app-state";

interface AppNavigationOptions {
  api: PiDesktopApi | undefined;
  setSnapshot: Dispatch<SetStateAction<DesktopAppState | null>>;
  rootWorkspaceOptions: readonly WorkspaceRecord[];
}

export function useAppNavigation({ api, setSnapshot, rootWorkspaceOptions }: AppNavigationOptions) {
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState("");
  const [skillsWorkspaceId, setSkillsWorkspaceId] = useState("");
  const [extensionsWorkspaceId, setExtensionsWorkspaceId] = useState("");
  const openSettings = (workspaceId?: string, section?: SettingsSection) => {
    if (!api) {
      return;
    }
    const nextWorkspaceId =
      workspaceId && rootWorkspaceOptions.some((workspace) => workspace.id === workspaceId)
        ? workspaceId
        : settingsWorkspaceId || rootWorkspaceOptions[0]?.id || "";
    if (nextWorkspaceId) {
      setSettingsWorkspaceId(nextWorkspaceId);
    }
    if (section) {
      setSettingsSection(section);
    }
    void updateSnapshot(setSnapshot, () => api.setActiveView("settings")).catch(
      (error: unknown) => {
        console.error("[renderer] setActiveView failed", error);
      },
    );
  };

  useEffect(() => {
    if (rootWorkspaceOptions.length === 0) {
      setSettingsWorkspaceId("");
      setSkillsWorkspaceId("");
      setExtensionsWorkspaceId("");
      return;
    }
    setSettingsWorkspaceId((current) =>
      rootWorkspaceOptions.some((workspace) => workspace.id === current)
        ? current
        : current || rootWorkspaceOptions[0]?.id || "",
    );
    setSkillsWorkspaceId((current) =>
      rootWorkspaceOptions.some((workspace) => workspace.id === current)
        ? current
        : current || rootWorkspaceOptions[0]?.id || "",
    );
    setExtensionsWorkspaceId((current) =>
      rootWorkspaceOptions.some((workspace) => workspace.id === current)
        ? current
        : current || rootWorkspaceOptions[0]?.id || "",
    );
  }, [rootWorkspaceOptions]);

  const setActiveView = (view: AppView) => {
    if (!api) return;
    void updateSnapshot(setSnapshot, () => api.setActiveView(view)).catch((error: unknown) => {
      console.error("[renderer] setActiveView failed", error);
    });
  };

  const openSkills = (workspaceId?: string) => {
    const nextWorkspaceId =
      workspaceId && rootWorkspaceOptions.some((workspace) => workspace.id === workspaceId)
        ? workspaceId
        : skillsWorkspaceId || rootWorkspaceOptions[0]?.id || "";
    if (nextWorkspaceId) {
      setSkillsWorkspaceId(nextWorkspaceId);
    }
    setActiveView("skills");
  };

  const openExtensions = (workspaceId?: string) => {
    const nextWorkspaceId =
      workspaceId && rootWorkspaceOptions.some((workspace) => workspace.id === workspaceId)
        ? workspaceId
        : extensionsWorkspaceId || rootWorkspaceOptions[0]?.id || "";
    if (nextWorkspaceId) {
      setExtensionsWorkspaceId(nextWorkspaceId);
    }
    setActiveView("extensions");
  };

  return {
    settingsSection,
    setSettingsSection,
    settingsWorkspaceId,
    setSettingsWorkspaceId,
    skillsWorkspaceId,
    setSkillsWorkspaceId,
    extensionsWorkspaceId,
    setExtensionsWorkspaceId,
    openSettings,
    openSkills,
    openExtensions,
    setActiveView,
  };
}
