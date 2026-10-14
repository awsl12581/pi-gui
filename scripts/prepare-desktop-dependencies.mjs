import { access, chmod, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
await access(electronPath, constants.X_OK);
console.log(`Electron executable ready: ${electronPath}`);

if (process.platform === "darwin") {
  // node-pty 1.1.0 publishes its macOS prebuilt helper with mode 0644.
  const nodePtyDirectory = path.dirname(require.resolve("node-pty/package.json"));
  const helper = path.join(nodePtyDirectory, "prebuilds", `darwin-${process.arch}`, "spawn-helper");
  const { mode } = await stat(helper);
  await chmod(helper, mode | 0o111);
  await access(helper, constants.X_OK);
  console.log(`node-pty helper ready: ${helper}`);
}
