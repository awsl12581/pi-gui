import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Resolve package.json through Node's search paths, including packages whose exports hide it.
function resolvePackage(name, from) {
  const require = createRequire(path.join(from, "package.json"));
  for (const directory of require.resolve.paths(`${name}/package.json`) ?? []) {
    const manifest = path.join(directory, name, "package.json");
    if (fs.existsSync(manifest)) return fs.realpathSync(manifest);
  }
  return undefined;
}

function readNotices(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && /^(licen[sc]e|copying|notice|copyright)([.-]|$)/i.test(entry.name),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      file: entry.name,
      text: fs.readFileSync(path.join(directory, entry.name), "utf8"),
    }));
}

export function collectLicenseNotices(desktopRoot) {
  const repositoryRoot = path.resolve(desktopRoot, "../..");
  const visited = new Set();
  const entries = [];
  const rootNotices = readNotices(repositoryRoot);
  const supplements = JSON.parse(
    fs.readFileSync(path.join(desktopRoot, "resources/licenses/sources.json"), "utf8"),
  );

  function visit(manifestPath, includeDevelopment = false) {
    if (visited.has(manifestPath)) return;
    visited.add(manifestPath);
    const directory = path.dirname(manifestPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const ownNotices = readNotices(directory);
    const supplement = supplements.find((entry) => entry.packages.includes(manifest.name));
    if (supplement && ownNotices.length === 0) {
      if (supplement.version !== manifest.version) {
        throw new Error(`Refresh supplemental license for ${manifest.name}@${manifest.version}`);
      }
      ownNotices.push({
        file: supplement.source,
        text: fs.readFileSync(
          path.join(desktopRoot, "resources/licenses", supplement.file),
          "utf8",
        ),
      });
    }
    const workspace =
      directory === repositoryRoot ||
      directory.startsWith(path.join(repositoryRoot, "packages") + path.sep);
    const license = manifest.license;
    const author = manifest.author;
    entries.push({
      name: manifest.name,
      version: manifest.version ?? "",
      license: typeof license === "string" ? license : (license?.type ?? "Not declared"),
      author: typeof author === "string" ? author : (author?.name ?? ""),
      notices: ownNotices.length
        ? ownNotices
        : workspace || directory === desktopRoot
          ? rootNotices
          : [],
    });

    const required = {
      ...manifest.dependencies,
      ...(includeDevelopment ? manifest.devDependencies : {}),
    };
    const optional = { ...manifest.peerDependencies, ...manifest.optionalDependencies };
    for (const name of new Set([...Object.keys(required), ...Object.keys(optional)])) {
      const dependency = name.startsWith("@pi-gui/")
        ? path.join(repositoryRoot, "packages", name.slice("@pi-gui/".length), "package.json")
        : resolvePackage(name, directory);
      if (dependency && fs.existsSync(dependency)) visit(dependency);
      else if (name in required && !(name in (manifest.optionalDependencies ?? {}))) {
        throw new Error(
          `Cannot collect license for missing dependency ${name} from ${manifest.name}`,
        );
      }
    }
  }

  visit(path.join(repositoryRoot, "package.json"), true);
  visit(path.join(desktopRoot, "package.json"), true);
  const gh = JSON.parse(
    fs.readFileSync(path.join(desktopRoot, "resources/gh/manifest.json"), "utf8"),
  );
  entries.push({
    name: gh.name,
    version: gh.version,
    license: "MIT",
    author: "",
    notices: readNotices(path.join(desktopRoot, "resources/gh")),
  });
  const unique = new Map();
  for (const entry of entries) {
    const key = `${entry.name}@${entry.version}`;
    const previous = unique.get(key);
    if (!previous) unique.set(key, entry);
    else {
      for (const notice of entry.notices) {
        if (
          !previous.notices.some(
            (existing) => existing.file === notice.file && existing.text === notice.text,
          )
        )
          previous.notices.push(notice);
      }
    }
  }
  return [...unique.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
  );
}

export function licenseNoticeDefines(desktopRoot) {
  const electronManifest = resolvePackage("electron", desktopRoot);
  if (!electronManifest) throw new Error("Electron must be installed to collect Chromium notices");
  const chromium = fs.readFileSync(
    path.join(path.dirname(electronManifest), "dist/LICENSES.chromium.html"),
    "utf8",
  );
  return {
    __PI_GUI_LICENSE_NOTICES__: JSON.stringify(collectLicenseNotices(desktopRoot)),
    __PI_GUI_CHROMIUM_NOTICES__: JSON.stringify(chromium),
  };
}
