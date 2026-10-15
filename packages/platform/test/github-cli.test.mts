import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { bundledGitHubCliPath, GITHUB_CLI_VERSION, resolveGitHubCli } from "../dist/index.js";

await test("bundled GitHub CLI paths are platform-specific", () => {
  assert.equal(GITHUB_CLI_VERSION, "2.102.0");
  assert.match(bundledGitHubCliPath("/resources", "win32", "x64"), /gh[\\/]win32-x64[\\/]gh\.exe$/);
  assert.match(bundledGitHubCliPath("/resources", "linux", "x64"), /gh[\\/]linux-x64[\\/]gh$/);
});

await test("Windows resolves and runs the bundled GitHub CLI", async (t) => {
  if (process.platform !== "win32" || process.arch !== "x64") {
    t.skip("Windows x64 bundled CLI test");
    return;
  }
  const resourceRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../apps/desktop/resources",
  );
  const executable = bundledGitHubCliPath(resourceRoot, "win32", "x64");
  await access(executable, constants.F_OK);
  const cli = await resolveGitHubCli({ resourceRoot, cwd: process.cwd() });
  assert.equal(cli?.bundled, true);
  assert.match((await cli!.run(["--version"])).stdout.toString(), /^gh version 2\.102\.0/);
});
