import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { toolRefId, type TaskWorkbenchTemplate } from "../../contracts/workbench";
import {
  decodePersistedUiState,
  readPersistedUiState,
  writePersistedUiState,
} from "../../electron/persistence/app-store-persistence";

test("concurrent current-format saves retain task templates and recover from backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "workbench-current-"));
  const path = join(directory, "ui-state.json");
  const template = {
    visibility: "hidden" as const,
    tools: [{ kind: "changes" as const }],
    selection: { kind: "tool" as const, toolId: "changes" },
    files: {
      workspaceId: "repo",
      tabs: { tabs: [], active: null, line: null, lineNonce: 0, retained: [] },
    },
    changes: { workspaceId: "repo", selectedPath: null, scope: { kind: "staged" as const } },
  };
  const payload = { taskWorkbenchTemplatesBySession: { "repo:task": template } };
  await writePersistedUiState(path, payload);
  await Promise.all([
    writePersistedUiState(path, { ...payload, composerDraft: "first" }),
    writePersistedUiState(path, { ...payload, composerDraft: "second" }),
  ]);
  expect((await readPersistedUiState(path)).taskWorkbenchTemplatesBySession).toEqual(
    payload.taskWorkbenchTemplatesBySession,
  );
  expect((await readPersistedUiState(path)).composerDraft).toBe("second");
  await writeFile(path, "{damaged");
  expect((await readPersistedUiState(path)).composerDraft).toBe("first");
  await writePersistedUiState(path, payload);
  const preserved = (await readdir(directory)).find((name) =>
    name.startsWith("ui-state.json.corrupt."),
  );
  expect(preserved).toBeDefined();
  expect(await readFile(join(directory, preserved!), "utf8")).toBe("{damaged");
});

for (const version of [undefined, 2, 18, 20]) {
  test(`unsupported UI-state version ${version} is rejected without replacement`, async () => {
    const path = join(await mkdtemp(join(tmpdir(), "workbench-version-")), "ui-state.json");
    const original = JSON.stringify({ version, composerDraft: "retain" });
    await writeFile(path, original);
    await expect(readPersistedUiState(path)).rejects.toThrow("version");
    await expect(writePersistedUiState(path, { composerDraft: "replacement" })).rejects.toThrow(
      "version",
    );
    expect(await readFile(path, "utf8")).toBe(original);
  });
}

function workbenchTemplate(): TaskWorkbenchTemplate {
  return {
    visibility: "hidden",
    tools: [{ kind: "changes" }, { kind: "files" }, { kind: "terminal" }],
    selection: { kind: "tool", toolId: toolRefId({ kind: "files" }) },
    files: {
      workspaceId: "workspace-one",
      tabs: {
        tabs: ["README.md", "src/index.ts"],
        active: "src/index.ts",
        line: { start: 4, end: 8 },
        lineNonce: 3,
        retained: ["README.md"],
      },
    },
    changes: {
      scope: { kind: "uncommitted" },
      workspaceId: "workspace-one",
      selectedPath: "src/index.ts",
    },
  };
}

const invalidLayouts: readonly { name: string; value: unknown }[] = [
  { name: "malformed template", value: null },
  { name: "unknown visibility", value: { ...workbenchTemplate(), visibility: "expanded" } },
  {
    name: "duplicate built-in tools",
    value: { ...workbenchTemplate(), tools: [{ kind: "files" }, { kind: "files" }] },
  },
  {
    name: "duplicate extension tools",
    value: {
      ...workbenchTemplate(),
      tools: [
        { kind: "extension", extensionId: "pr-review", viewId: "findings" },
        { kind: "extension", extensionId: "pr-review", viewId: "findings" },
      ],
      selection: { kind: "chooser" },
    },
  },
  {
    name: "selection outside the tool list",
    value: { ...workbenchTemplate(), selection: { kind: "tool", toolId: "missing-tool" } },
  },
  {
    name: "future layout field",
    value: { ...workbenchTemplate(), futureLayoutSetting: "retain me" },
  },
  {
    name: "future tool field",
    value: { ...workbenchTemplate(), tools: [{ kind: "files", futureToolSetting: "retain me" }] },
  },
  {
    name: "null review scope",
    value: { ...workbenchTemplate(), changes: { ...workbenchTemplate().changes, scope: null } },
  },
  {
    name: "unknown review scope",
    value: {
      ...workbenchTemplate(),
      changes: { ...workbenchTemplate().changes, scope: { kind: "future" } },
    },
  },
  {
    name: "mixed review scope fields",
    value: {
      ...workbenchTemplate(),
      changes: {
        ...workbenchTemplate().changes,
        scope: { kind: "branch", checkpointId: "wrong-scope" },
      },
    },
  },
  {
    name: "future review scope field",
    value: {
      ...workbenchTemplate(),
      changes: { ...workbenchTemplate().changes, scope: { kind: "uncommitted", future: true } },
    },
  },
];

for (const { name, value } of invalidLayouts) {
  test(`drops a ${name} and keeps the rest of saved UI state`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "workbench-invalid-layout-"));
    const path = join(dir, "ui-state.json");
    await writeFile(
      path,
      JSON.stringify({
        version: 19,
        composerDraft: "must survive",
        taskWorkbenchTemplatesBySession: {
          "workspace-one:task-one": value,
          "workspace-one:task-two": workbenchTemplate(),
        },
      }),
    );

    const restored = await readPersistedUiState(path);
    expect(restored.composerDraft).toBe("must survive");
    expect(restored.taskWorkbenchTemplatesBySession).toEqual({
      "workspace-one:task-two": workbenchTemplate(),
    });
    await writePersistedUiState(path, { ...restored, composerDraft: "replacement" });
    const saved = await readPersistedUiState(path);
    expect(saved.composerDraft).toBe("replacement");
    expect(Object.keys(saved.taskWorkbenchTemplatesBySession ?? {})).toEqual([
      "workspace-one:task-two",
    ]);
  });
}

test("a malformed layout map is dropped without blocking saved UI state", () => {
  const restored = decodePersistedUiState({
    version: 19,
    composerDraft: "must survive",
    taskWorkbenchTemplatesBySession: ["not", "a", "map"],
  });
  expect(restored.composerDraft).toBe("must survive");
  expect(restored.taskWorkbenchTemplatesBySession).toEqual({});
});
