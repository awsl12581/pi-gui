import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { expect, test } from "@playwright/test";
import {
  isLanguagePreference,
  resolveAppLanguage,
  message,
  labelFields,
} from "../../contracts/language";
import { decodePersistedUiState } from "../../electron/persistence/app-store-persistence";
import { setLanguage, t, translateMessage } from "../../i18n";
import zhCN from "../../i18n/zh-CN.json";
import {
  formatScheduledTaskNextRun,
  formatScheduledTaskRecurrence,
} from "../../i18n/scheduled-tasks";

// These tests change a process-local instance; each test restores English for other specs.
test.afterEach(() => setLanguage("en"));

test("resolves the first OS preference and rejects unsupported saved values", () => {
  expect(resolveAppLanguage("system", ["zh-Hant-TW", "en-US"])).toBe("zh-CN");
  expect(resolveAppLanguage("system", ["zh_CN"])).toBe("zh-CN");
  expect(resolveAppLanguage("system", ["fr-FR", "zh-CN"])).toBe("en");
  expect(resolveAppLanguage("system", [])).toBe("en");
  expect(resolveAppLanguage("en", ["zh-CN"])).toBe("en");
  expect(resolveAppLanguage("zh-CN", ["en-US"])).toBe("zh-CN");
  for (const invalid of ["fr", "zh", "", null, 1, { language: "en" }]) {
    expect(isLanguagePreference(invalid)).toBe(false);
    expect(() => decodePersistedUiState({ version: 19, languagePreference: invalid })).toThrow();
  }
  expect(
    decodePersistedUiState({ version: 19, languagePreference: "system" }).languagePreference,
  ).toBe("system");
});

test("switches app messages without changing arguments or external text", () => {
  const path = '<script>alert("Settings")</script>/$&{{Title}}';
  const descriptor = message("Read {{detail}}", { detail: path });
  expect(labelFields("Settings")).toEqual({ label: "Settings" });
  expect(labelFields(descriptor).label).toBe(`Read ${path}`);
  setLanguage("zh-CN");
  expect(t("New thread")).toBe("新会话");
  expect(translateMessage(descriptor)).toBe(`已读取 ${path}`);
  expect(labelFields(descriptor).label).toBe(`Read ${path}`);
  setLanguage("en");
  expect(translateMessage(descriptor)).toBe(`Read ${path}`);
});

test("formats recurrence and relative schedules in the selected language", () => {
  setLanguage("zh-CN");
  expect(formatScheduledTaskRecurrence({ kind: "interval", everyMs: 600_000 })).toBe("每 10 分钟");
  expect(
    formatScheduledTaskRecurrence({
      kind: "weekly",
      days: [1, 3],
      hour: 9,
      minute: 15,
      timeZone: "Asia/Shanghai",
    }),
  ).toContain("周一");
  expect(formatScheduledTaskNextRun("2026-10-19T00:00:00Z", new Date("2026-10-18T00:00:00Z"))).toBe(
    "下次运行：1 天后",
  );
  setLanguage("en");
  expect(formatScheduledTaskRecurrence({ kind: "interval", everyMs: 600_000 })).toBe(
    "Every 10 minutes",
  );
});

test("the Chinese catalog covers literal app messages without inventing interpolation arguments", async () => {
  const keys = new Set<string>();
  async function scan(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (/\.tsx?$/.test(entry.name)) {
        const source = ts.createSourceFile(
          path,
          await readFile(path, "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        const visit = (node: ts.Node): void => {
          if (
            ts.isCallExpression(node) &&
            ["t", "message"].includes(node.expression.getText(source))
          ) {
            const key = node.arguments[0];
            if (key && ts.isStringLiteral(key)) keys.add(key.text);
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    }
  }
  const root = join(__dirname, "../..");
  for (const dir of ["src", "electron", "i18n"]) await scan(join(root, dir));
  const catalog: Record<string, string> = zhCN;
  expect([...keys].filter((key) => !catalog[key])).toEqual([]);
  for (const [key, translation] of Object.entries(catalog)) {
    const sourceArguments = [...key.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
    const translatedArguments = [...translation.matchAll(/\{\{(\w+)\}\}/g)].map(
      (match) => match[1],
    );
    expect(
      translatedArguments.every((argument) => sourceArguments.includes(argument)),
      key,
    ).toBe(true);
  }
});
