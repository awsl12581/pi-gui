import { stat } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  createNamedThread,
  desktopShortcut,
  getDesktopState,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
  waitForWorkspaceByPath,
} from "../helpers/electron-app";

test("starts without a project and retains the default workspace and draft after restart", async () => {
  const userDataDir = await makeUserDataDir();
  const workspacePath = join(userDataDir, "default-workspace");
  const first = await launchDesktop(userDataDir, { testMode: "foreground" });
  try {
    const window = await first.firstWindow();
    const workspace = await waitForWorkspaceByPath(window, workspacePath);
    expect(workspace.name).toBe("Default workspace");
    expect((await stat(workspacePath)).isDirectory()).toBe(true);
    expect((await getDesktopState(window)).selectedWorkspaceId).toBe(workspace.id);
    await window.keyboard.press(desktopShortcut(","));
    for (const section of ["Providers", "Models", "MCP servers"]) {
      await window.getByRole("button", { name: section, exact: true }).click();
      await expect(window.locator(".view-header__title")).toHaveText(section);
      await expect(window.getByText("Select a workspace", { exact: true })).toHaveCount(0);
    }
    await expect(window.getByLabel("Server name")).toBeVisible();
    await window.getByRole("button", { name: "Back to app", exact: true }).click();
    // Seed a local session through the existing fixture helper; no provider request is sent.
    await createNamedThread(window, "Default workspace conversation");
    await window.getByTestId("composer").fill("Keep this default workspace draft");
    await expect
      .poll(async () => (await getDesktopState(window)).composerDraft)
      .toBe("Keep this default workspace draft");
    await window.screenshot({ path: test.info().outputPath("default-workspace.png") });
  } finally {
    await first.close();
  }
  const second = await launchDesktop(userDataDir, { testMode: "foreground" });
  try {
    const window = await second.firstWindow();
    const workspace = await waitForWorkspaceByPath(window, workspacePath);
    expect((await getDesktopState(window)).workspaces).toHaveLength(1);
    expect((await getDesktopState(window)).selectedWorkspaceId).toBe(workspace.id);
    await expect(window.getByTestId("composer")).toHaveValue("Keep this default workspace draft");
    await window.keyboard.press(desktopShortcut(","));
    await window.getByRole("button", { name: "General", exact: true }).click();
    await window.getByRole("combobox", { name: "App language" }).click();
    await window.getByRole("option", { name: "简体中文", exact: true }).click();
    await expect
      .poll(async () => (await getDesktopState(window)).workspaces[0]?.name)
      .toBe("默认工作区");
  } finally {
    await second.close();
  }
});

test("restores a project selection and falls back to the default workspace when it is removed", async () => {
  const userDataDir = await makeUserDataDir();
  const projectPath = await makeWorkspace("default-workspace-project");
  const first = await launchDesktop(userDataDir, {
    initialWorkspaces: [projectPath],
    testMode: "foreground",
  });
  try {
    const window = await first.firstWindow();
    const project = await waitForWorkspaceByPath(window, projectPath);
    expect((await getDesktopState(window)).selectedWorkspaceId).toBe(project.id);
  } finally {
    await first.close();
  }
  const second = await launchDesktop(userDataDir, { testMode: "foreground" });
  try {
    const window = await second.firstWindow();
    const project = await waitForWorkspaceByPath(window, projectPath);
    const defaultWorkspace = await waitForWorkspaceByPath(
      window,
      join(userDataDir, "default-workspace"),
    );
    expect((await getDesktopState(window)).selectedWorkspaceId).toBe(project.id);
    // Exercise the removal boundary without driving the native folder/menu surface.
    await window.evaluate((id) => globalThis.window.piApp!.removeWorkspace(id), project.id);
    await expect
      .poll(async () => (await getDesktopState(window)).selectedWorkspaceId)
      .toBe(defaultWorkspace.id);
    await window.evaluate(
      (id) => globalThis.window.piApp!.removeWorkspace(id),
      defaultWorkspace.id,
    );
    const state = await getDesktopState(window);
    expect(state.workspaces.map((workspace) => workspace.id)).toEqual([defaultWorkspace.id]);
    expect(state.lastError).toBe("The default workspace cannot be renamed or removed.");
  } finally {
    await second.close();
  }
});
