import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isPathInsideDirectory, runProcess, writeFileAtomically } from "../dist/index.js";

await test("atomic writes replace complete contents and serialize same-path calls", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-platform-"));
  try {
    const file = join(root, "nested", "value.txt");
    await Promise.all([writeFileAtomically(file, "one"), writeFileAtomically(file, "two")]);
    assert.equal(await readFile(file, "utf8"), "two");
    assert.ok((await stat(file)).isFile());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

await test("process execution preserves argv and output bytes", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "pi-platform-process-"));
  try {
    const result = await runProcess(
      process.execPath,
      ["-e", "process.stdout.write(process.argv[1])", "a b"],
      { cwd },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.toString(), "a b");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

await test("containment is strict for the directory itself", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-platform-path-"));
  try {
    assert.equal(await isPathInsideDirectory(root, root), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
