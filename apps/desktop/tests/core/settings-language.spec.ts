import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveAppLanguage } from "../../contracts/language";
import {
  createNamedThread,
  desktopShortcut,
  getDesktopState,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
  waitForWorkspaceByPath,
} from "../helpers/electron-app";

async function openGeneral(page: Page): Promise<void> {
  await page.keyboard.press(desktopShortcut(","));
  await expect(page.getByTestId("settings-surface")).toBeVisible();
  await page.getByRole("button", { name: /^(General|通用)$/ }).click();
}

function languageSelect(page: Page) {
  return page.getByRole("combobox", { name: /^(App language|应用语言)$/ });
}

test("language follows the OS by default and switches across windows without losing a draft", async ({}, testInfo) => {
  const userDataDir = await makeUserDataDir("pi-gui-language-");
  const workspacePath = await makeWorkspace("language-fixture");
  const launchOptions = {
    initialWorkspaces: [workspacePath],
    languagePreference: null,
    // This is a visible fixture-backed UI proof, with credentials scrubbed by the shared launcher.
    envOverrides: { PI_APP_TEST_MODE: undefined },
  } as const;
  let harness = await launchDesktop(userDataDir, launchOptions);
  const consoleErrors: string[] = [];
  try {
    const page = await harness.firstWindow();
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await harness.focusWindow();
    await waitForWorkspaceByPath(page, workspacePath);
    const systemLanguages = await harness.electronApp.evaluate(({ app }) =>
      app.getPreferredSystemLanguages(),
    );
    expect((await getDesktopState(page)).languagePreference).toBe("system");
    expect((await getDesktopState(page)).language).toBe(
      resolveAppLanguage("system", systemLanguages),
    );
    await openGeneral(page);
    await expect(languageSelect(page)).toHaveValue("system");
    await languageSelect(page).selectOption("en");
    await expect(page.getByRole("heading", { name: "General", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back to app", exact: true }).click();
    // A fixture session establishes an editable composer without contacting a provider.
    await createNamedThread(page, "Settings");
    const draft = "Settings\nNew thread\n保留这份草稿 /tmp/Settings.ts";
    await page.getByTestId("composer").fill(draft);
    await openGeneral(page);
    await languageSelect(page).selectOption("zh-CN");
    await expect(page.getByRole("heading", { name: "通用", exact: true })).toBeVisible();
    await expect(page.getByText("偏好设置", { exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await page.screenshot({ path: testInfo.outputPath("preferences-chinese.png") });
    await page.getByRole("button", { name: "返回应用", exact: true }).click();
    await expect(page.getByTestId("composer")).toHaveValue(draft);
    await expect(page.getByRole("button", { name: "新会话", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "中", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("conversation-chinese.png") });
    if (process.platform === "darwin") {
      const menuLabels = await harness.electronApp.evaluate(({ Menu }) =>
        Menu.getApplicationMenu()?.items.flatMap((item) => [
          item.label,
          ...(item.submenu?.items.map((child) => child.label) ?? []),
        ]),
      );
      expect(menuLabels).toContain("新会话");
      expect(menuLabels).toContain("检查更新…");
    }
    const nextWindow = harness.electronApp.waitForEvent("window");
    await harness.electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: "n",
        modifiers: [process.platform === "darwin" ? "meta" : "control", "shift"],
      });
    });
    const secondPage = await nextWindow;
    await expect(secondPage.locator("html")).toHaveAttribute("lang", "zh-CN");
    await openGeneral(secondPage);
    await languageSelect(secondPage).selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("composer")).toHaveValue(draft);
    await languageSelect(secondPage).selectOption("zh-CN");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await harness.close();
    harness = await launchDesktop(userDataDir, launchOptions);
    const restarted = await harness.firstWindow();
    await waitForWorkspaceByPath(restarted, workspacePath);
    await expect(restarted.locator("html")).toHaveAttribute("lang", "zh-CN");
    expect((await getDesktopState(restarted)).languagePreference).toBe("zh-CN");
    await openGeneral(restarted);
    await expect(languageSelect(restarted)).toHaveValue("zh-CN");
    await languageSelect(restarted).selectOption("system");
    await expect
      .poll(async () => (await getDesktopState(restarted)).language)
      .toBe(resolveAppLanguage("system", systemLanguages));
    const persisted: unknown = JSON.parse(
      await readFile(join(userDataDir, "ui-state.json"), "utf8"),
    );
    expect(persisted).toMatchObject({ languagePreference: "system" });
    await writeFile(
      testInfo.outputPath("language-evidence.json"),
      JSON.stringify({ systemLanguages, userDataDir, consoleErrors }, null, 2),
    );
    expect(consoleErrors).toEqual([]);
  } finally {
    await harness.close();
  }
});
