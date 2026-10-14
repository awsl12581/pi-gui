import { expect, test } from "@playwright/test";
import {
  EMPTY_FILE_TABS,
  activateFile,
  ancestorDirectoryPaths,
  breadcrumbSegments,
  closeFile,
  fileNameFromPath,
  isMarkdownPath,
  openFile,
  openFileAtLine,
} from "../../src/features/workbench/file-workbench-state";

test("openFile adds a tab and activates it", () => {
  const opened = openFile(EMPTY_FILE_TABS, "src/app.ts");
  expect(opened).toEqual({
    tabs: ["src/app.ts"],
    active: "src/app.ts",
    line: null,
    lineNonce: 0,
    retained: [],
  });
  expect(openFile(opened, "src/app.ts")).toEqual(opened);
  expect(openFile(opened, "README.md")).toEqual({
    tabs: ["src/app.ts", "README.md"],
    active: "README.md",
    line: null,
    lineNonce: 0,
    retained: [],
  });
});

test("openFileAtLine sets the span and a later openFile clears it", () => {
  const marked = openFileAtLine(EMPTY_FILE_TABS, "src/app.ts", 10, 20);
  expect(marked).toEqual({
    tabs: ["src/app.ts"],
    active: "src/app.ts",
    line: { start: 10, end: 20 },
    lineNonce: 1,
    retained: ["src/app.ts"],
  });
  const moved = openFileAtLine(marked, "src/app.ts", 4);
  expect(moved.line).toEqual({ start: 4, end: 4 });
  expect(moved.lineNonce).toBe(marked.lineNonce + 1);
  expect(moved.tabs).toEqual(marked.tabs);
  expect(openFile(moved, "src/app.ts").line).toBeNull();
  expect(openFile(marked, "README.md")).toMatchObject({
    active: "README.md",
    line: null,
    retained: ["src/app.ts"],
  });
  expect(activateFile(marked, "src/app.ts").line).toBeNull();
});

test("closeFile keeps active inside tabs", () => {
  const two = openFile(openFile(EMPTY_FILE_TABS, "a.ts"), "b.ts");
  expect(closeFile(two, "b.ts")).toEqual({
    tabs: ["a.ts"],
    active: "a.ts",
    line: null,
    lineNonce: 0,
    retained: [],
  });
  expect(closeFile(two, "a.ts")).toEqual({
    tabs: ["b.ts"],
    active: "b.ts",
    line: null,
    lineNonce: 0,
    retained: [],
  });
  expect(closeFile(closeFile(two, "a.ts"), "b.ts")).toEqual(EMPTY_FILE_TABS);
  expect(activateFile(two, "missing.ts")).toEqual(two);
  expect(activateFile(two, "a.ts").active).toBe("a.ts");
});

test("path helpers", () => {
  expect(isMarkdownPath("notes.md")).toBe(true);
  expect(isMarkdownPath("src/app.ts")).toBe(false);
  expect(fileNameFromPath("src/lib/util.ts")).toBe("util.ts");
  expect(breadcrumbSegments("src/lib/util.ts")).toEqual(["src", "lib", "util.ts"]);
  expect(ancestorDirectoryPaths("src/lib/util.ts")).toEqual(["src", "src/lib"]);
  expect(ancestorDirectoryPaths("README.md")).toEqual([]);
});
