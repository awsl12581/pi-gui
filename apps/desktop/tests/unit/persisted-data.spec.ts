import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  readPersistedUiState,
  writePersistedUiState,
} from "../../electron/persistence/app-store-persistence";
import { AttachmentStore } from "../../electron/persistence/attachment-store";

for (const invalid of [
  { version: 99, composerDraft: "future data" },
  { version: 19, composerDraftsBySession: { one: 42 } },
  { version: 19, workspaceOrder: ["valid", null] },
  { version: 19, orchestrationChildren: [null] },
  { version: 19, appGlobalModelSettings: { defaultThinkingLevel: "unknown" } },
  { version: 19, futureData: "retain" },
  { version: 19, notificationPreferences: { futureSetting: true } },
  { version: 19, lastInteractedAtBySession: { one: 42 } },
  { version: 19, threadGrouping: "priority" },
  { version: 19, extensionFlagsByWorkspace: { ws: { retries: 3 } } },
  { version: 19, extensionFlagsBySession: { "ws:sess": ["plan"] } },
  { version: 19, collapsedWorkspaceIds: ["alpha", 42] },
  { version: 19, composerAttachmentsBySession: {} },
  { version: 19, transcripts: {} },
  [],
]) {
  test(`preserves invalid UI state ${JSON.stringify(invalid)}`, async () => {
    const path = join(await mkdtemp(join(tmpdir(), "ui-state-validation-")), "ui-state.json");
    const original = JSON.stringify(invalid);
    await writeFile(path, original);
    await expect(readPersistedUiState(path)).rejects.toThrow(/Invalid ui-state/);
    await expect(writePersistedUiState(path, { composerDraft: "replacement" })).rejects.toThrow(
      /Invalid ui-state/,
    );
    expect(await readFile(path, "utf8")).toBe(original);
  });
}

test("extension flag defaults and per-thread flags round-trip through ui-state", async () => {
  const path = join(await mkdtemp(join(tmpdir(), "ui-state-flags-")), "ui-state.json");
  await writePersistedUiState(path, {
    extensionFlagsByWorkspace: { ws: { plan: true, "dry-run": false, env: "" } },
    extensionFlagsBySession: { "ws:sess": { plan: true }, "ws:empty": {} },
  });
  const decoded = await readPersistedUiState(path);
  expect(decoded.extensionFlagsByWorkspace).toEqual({
    ws: { plan: true, "dry-run": false, env: "" },
  });
  expect(decoded.extensionFlagsBySession).toEqual({ "ws:sess": { plan: true } });
});

test("reads ui-state without folded folders and writes the collapsed ids", async () => {
  const path = join(await mkdtemp(join(tmpdir(), "ui-state-collapsed-")), "ui-state.json");
  await writeFile(path, JSON.stringify({ version: 19, composerDraft: "kept" }));
  expect((await readPersistedUiState(path)).collapsedWorkspaceIds).toBeUndefined();
  await writePersistedUiState(path, { composerDraft: "kept", collapsedWorkspaceIds: ["alpha"] });
  const written = JSON.parse(await readFile(path, "utf8")) as {
    version: number;
    collapsedWorkspaceIds: readonly string[];
  };
  expect(written.version).toBe(19);
  expect(written.collapsedWorkspaceIds).toEqual(["alpha"]);
  expect((await readPersistedUiState(path)).collapsedWorkspaceIds).toEqual(["alpha"]);
});

test("backup recovery retains damaged bytes and the good backup", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ui-state-backup-"));
  const path = join(dir, "ui-state.json");
  const good = JSON.stringify({ version: 19, composerDraft: "retained draft" });
  await writeFile(`${path}.bak`, good);
  await writeFile(path, "{damaged");
  expect((await readPersistedUiState(path)).composerDraft).toBe("retained draft");
  await writePersistedUiState(path, { composerDraft: "retained draft" });
  expect(await readFile(`${path}.bak`, "utf8")).toBe(good);
  const preserved = (await readdir(dir)).filter((name) =>
    name.startsWith("ui-state.json.corrupt."),
  );
  expect(preserved).toHaveLength(1);
  expect(await readFile(join(dir, preserved[0]!), "utf8")).toBe("{damaged");
});

test("unrecoverable syntax errors cannot be overwritten", async () => {
  const path = join(await mkdtemp(join(tmpdir(), "ui-state-broken-")), "ui-state.json");
  await writeFile(path, "{damaged");
  await expect(readPersistedUiState(path)).rejects.toThrow(/original data was retained/);
  await expect(writePersistedUiState(path, {})).rejects.toThrow(/Cannot overwrite/);
  expect(await readFile(path, "utf8")).toBe("{damaged");
});

test("attachment owner rejects malformed entries before read, replacement or pruning", async () => {
  const dir = await mkdtemp(join(tmpdir(), "attachment-validation-"));
  const store = new AttachmentStore(dir);
  const valid = {
    id: "one",
    kind: "image" as const,
    name: "image.png",
    mimeType: "image/png",
    data: "eA==",
  };
  await store.write("session", [valid]);
  const path = join(dir, "attachments", "session.json");
  const original = JSON.stringify([valid, null]);
  await writeFile(path, original);
  await expect(store.read("session")).rejects.toThrow(/Invalid saved attachment/);
  await expect(store.write("session", [])).rejects.toThrow(/Invalid saved attachment/);
  await expect(store.remove("session")).rejects.toThrow(/Invalid saved attachment/);
  expect(await readFile(path, "utf8")).toBe(original);
  await writeFile(
    path,
    JSON.stringify([
      { id: valid.id, name: valid.name, mimeType: valid.mimeType, data: valid.data },
    ]),
  );
  expect(await store.read("session")).toEqual([valid]);
});

test("unknown attachment fields survive rejected replacement and pruning", async () => {
  const dir = await mkdtemp(join(tmpdir(), "attachment-unknown-"));
  const store = new AttachmentStore(dir);
  await store.write("session", []);
  const path = join(dir, "attachments", "session.json");
  const original = JSON.stringify([
    { id: "one", name: "image.png", mimeType: "image/png", data: "eA==", futureData: "retain" },
  ]);
  await writeFile(path, original);
  await expect(store.read("session")).rejects.toThrow(/unsupported field/);
  await expect(store.write("session", [])).rejects.toThrow(/unsupported field/);
  await expect(store.remove("session")).rejects.toThrow(/unsupported field/);
  expect(await readFile(path, "utf8")).toBe(original);
});
