import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourceDir = path.join(desktopDir, "resources", "gh");
const manifest = JSON.parse(await readFile(path.join(resourceDir, "manifest.json"), "utf8"));
const target = manifest.platforms["win32-x64"];
const executable = path.join(resourceDir, "win32-x64", target.executable);
const digest = createHash("sha256")
  .update(await readFile(executable))
  .digest("hex");
if (digest !== target.executableSha256)
  throw new Error(
    `Bundled GitHub CLI hash mismatch: expected ${target.executableSha256}, got ${digest}`,
  );
console.log(`Bundled GitHub CLI ${manifest.version} verified: ${executable}`);
