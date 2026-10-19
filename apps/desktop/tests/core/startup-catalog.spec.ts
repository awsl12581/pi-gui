import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import {
  createNamedThread,
  getDesktopState,
  launchDesktop,
  makeUserDataDir,
  makeWorkspace,
} from "../helpers/electron-app";
import { createSessionFileBeside, sessionFilePathFromCatalog } from "../helpers/session-file";

test("opens cached threads while history sync waits, then discovers external threads without losing a draft", async ({}, testInfo) => {
  test.setTimeout(90_000);
  const userDataDir = await makeUserDataDir();
  const workspacePath = await makeWorkspace("startup-catalog");
  const first = await launchDesktop(userDataDir, {
    initialWorkspaces: [workspacePath],
    testMode: "foreground",
  });
  let workspaceId = "";
  let sessionId = "";
  try {
    const page = await first.firstWindow();
    await createNamedThread(page, "Cached startup thread");
    const state = await getDesktopState(page);
    workspaceId = state.selectedWorkspaceId;
    sessionId = state.selectedSessionId;
  } finally {
    await first.close();
  }

  const sessionFile = await sessionFilePathFromCatalog(userDataDir, { workspaceId, sessionId });
  const externalFile = await createSessionFileBeside(sessionFile, "external-startup.jsonl", [
    { role: "user", text: "External startup thread" },
  ]);
  const externalId = (
    JSON.parse((await readFile(externalFile, "utf8")).split("\n")[0]) as {
      id: string;
    }
  ).id;
  const started = join(userDataDir, "history-sync-started");
  const release = join(userDataDir, "release-history-sync");
  const wrapper = testInfo.outputPath("gated-startup.mjs");
  const originalEntry = process.env.PI_APP_TEST_ENTRY;
  const appEntry = originalEntry ?? resolve(__dirname, "../../out/main/main.js");
  // Block Pi's actual history discovery, without adding a production startup test hook.
  await writeFile(
    wrapper,
    `import { existsSync, writeFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
const { SessionManager } = await import("@earendil-works/pi-coding-agent");
const list = SessionManager.list;
SessionManager.list = async function(cwd, ...args) {
  if (cwd === ${JSON.stringify(workspacePath)}) {
    writeFileSync(${JSON.stringify(started)}, "started");
    while (!existsSync(${JSON.stringify(release)})) await setTimeout(20);
  }
  return list.call(this, cwd, ...args);
};
await import(${JSON.stringify(pathToFileURL(appEntry).href)});
`,
  );
  process.env.PI_APP_TEST_ENTRY = wrapper;
  const second = await launchDesktop(userDataDir, { testMode: "foreground" }).finally(() => {
    if (originalEntry) process.env.PI_APP_TEST_ENTRY = originalEntry;
    else delete process.env.PI_APP_TEST_ENTRY;
  });
  try {
    const page = await second.firstWindow();
    const composer = page.getByTestId("composer");
    await expect(composer).toBeVisible();
    await expect.poll(() => readFile(started, "utf8").catch(() => "")).toBe("started");
    const state = await getDesktopState(page);
    expect(state.selectedSessionId).toBe(sessionId);
    expect(
      state.workspaces.find((workspace) => workspace.id === workspaceId)?.sessions,
    ).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: externalId })]));
    await composer.fill("Draft written while history sync is pending");
    await page.screenshot({ path: testInfo.outputPath("usable-before-history-sync.png") });
    await writeFile(release, "release");
    await expect
      .poll(async () => {
        const next = await getDesktopState(page);
        return next.workspaces.find((workspace) => workspace.id === workspaceId)?.sessions;
      })
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: externalId })]));
    await expect(composer).toHaveValue("Draft written while history sync is pending");
    expect((await getDesktopState(page)).selectedSessionId).toBe(sessionId);
  } finally {
    await writeFile(release, "release");
    await second.close();
  }
});
