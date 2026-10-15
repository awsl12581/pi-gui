import { mkdtemp, mkdir, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { DesktopViewDeclaration } from "@pi-gui/extension-ui";
import { expect, test } from "@playwright/test";
import { createJiti } from "jiti";

// The desktop Playwright harness uses CommonJS; Chord's public entry is ESM-only.
const jiti = createJiti(__filename);
let defineFacet: typeof import("@earendil-works/chord").defineFacet;
let remote: typeof import("@earendil-works/chord").remote;
let method: typeof import("@earendil-works/chord").method;
let resource: typeof import("@earendil-works/chord").resource;
let Type: typeof import("typebox").Type;
let createChordClientConnection: typeof import("@pi-gui/extension-ui/transport").createChordClientConnection;
let DesktopExtensionViewOwner: typeof import("../../electron/extensions/extension-view-owner").DesktopExtensionViewOwner;
test.beforeAll(async () => {
  ({ defineFacet, remote, method, resource } =
    await jiti.import<typeof import("@earendil-works/chord")>("@earendil-works/chord"));
  ({ Type } = await jiti.import<typeof import("typebox")>("typebox"));
  ({ createChordClientConnection } = await jiti.import<
    typeof import("@pi-gui/extension-ui/transport")
  >("@pi-gui/extension-ui/transport"));
  ({ DesktopExtensionViewOwner } = await jiti.import<
    typeof import("../../electron/extensions/extension-view-owner")
  >("../../electron/extensions/extension-view-owner.ts"));
});

const target = { workspaceId: "workspace-a", sessionId: "session-a" };

async function fixture() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "pi-view-owner-"));
  const directory = await realpath(temporary);
  const source = path.join(directory, "index.ts");
  const frontend = path.join(directory, "dist", "desktop.js");
  await mkdir(path.dirname(frontend));
  await writeFile(source, "export default () => {};");
  await writeFile(frontend, "export function mount() { return () => {}; }");
  let activations = 0;
  let disposals = 0;
  const Counter = remote("fixture.counter", {
    version: 1,
    input: Type.Object({}),
    variants: {
      default: {
        methods: { increment: method(Type.Object({}), Type.Object({ value: Type.Number() })) },
      },
    },
  });
  const declaration: DesktopViewDeclaration = {
    id: "counter",
    title: "Counter",
    source: pathToFileURL(source).href,
    frontend: pathToFileURL(frontend),
    backend: () =>
      defineFacet((api) => {
        api.serve(
          Counter,
          (_input, _principal, self) => {
            let value = 0;
            self.resources({
              lifetime: resource({
                rev: 1,
                open() {
                  activations++;
                  return null;
                },
                close() {
                  disposals++;
                },
              }),
            });
            return {
              kind: "default",
              async increment() {
                return { value: ++value };
              },
            };
          },
          { eager: true },
        );
      }),
  };
  return {
    directory,
    source,
    declaration,
    Counter,
    activations: () => activations,
    disposals: () => disposals,
  };
}

test("desktop view connections keep one backend and enforce their original window and generation", async () => {
  const data = await fixture();
  const actions: unknown[] = [];
  const owner = new DesktopExtensionViewOwner({
    frameDocument: ({ frontendUrl }) => `<script type="module" src="${frontendUrl}"></script>`,
    onHostAction: async (context) => {
      actions.push(context);
    },
  });
  try {
    const runtime = {
      target,
      generation: "one",
      extensions: [{ resolvedPath: data.source }],
      declarations: [data.declaration],
    };
    await owner.replaceRuntime(runtime);
    await owner.replaceRuntime(runtime);
    expect(data.activations()).toBe(1);
    const view = owner.listViews(target)[0]!;
    let firstClient: ReturnType<typeof createChordClientConnection> | undefined;
    let secondClient: ReturnType<typeof createChordClientConnection> | undefined;
    const first = await owner.openConnection(
      { target, extensionId: view.extensionId, viewId: view.id, senderId: 1 },
      (message) => firstClient?.receive(message),
    );
    const second = await owner.openConnection(
      { target, extensionId: view.extensionId, viewId: view.id, senderId: 2 },
      (message) => secondClient?.receive(message),
    );
    firstClient = createChordClientConnection({
      send: (message) => {
        void owner.receive(first.connectionId, 1, message).catch(() => {});
      },
    });
    secondClient = createChordClientConnection({
      send: (message) => {
        void owner.receive(second.connectionId, 2, message).catch(() => {});
      },
    });
    const firstCounter = firstClient.host.get(data.Counter, {}, { at: "desktop-extension" });
    const secondCounter = secondClient.host.get(data.Counter, {}, { at: "desktop-extension" });
    await Promise.all([firstCounter.ready, secondCounter.ready]);
    const request = { chord2: { t: "ping", n: 1 } };
    await expect(owner.receive(first.connectionId, 2, request)).rejects.toThrow("another window");
    expect(await firstCounter.increment({})).toEqual({ value: 1 });
    owner.closeConnection(first.connectionId, 1);
    firstClient.close();
    expect(data.disposals()).toBe(0);
    expect(await secondCounter.increment({})).toEqual({ value: 2 });
    await owner.invokeHostAction(second.connectionId, 2, {
      type: "openFile",
      path: "src/example.ts",
    });
    expect(actions).toEqual([
      expect.objectContaining({
        target,
        senderId: 2,
        generation: "one",
        connectionId: second.connectionId,
      }),
    ]);
    firstClient.close();
    secondClient.close();
    await owner.invalidateRuntime(target, "one");
    expect(data.disposals()).toBeGreaterThanOrEqual(1);
    expect(owner.listViews(target)).toEqual([]);
    await expect(owner.receive(second.connectionId, 2, request)).rejects.toThrow("unavailable");
    expect((await owner.assetResponse(second.frameUrl)).status).toBe(404);
  } finally {
    await owner.dispose();
  }
});

test("desktop asset routes require a live capability and apply the opaque-frame policy", async () => {
  const data = await fixture();
  const owner = new DesktopExtensionViewOwner({
    frameDocument: () => "<main id='root'></main>",
    hostAssets: { "frame-bridge.js": { body: "export {};", contentType: "text/javascript" } },
    onHostAction: async () => {},
  });
  try {
    await owner.replaceRuntime({
      target,
      generation: "one",
      extensions: [{ resolvedPath: data.source }],
      declarations: [data.declaration],
    });
    const view = owner.listViews(target)[0]!;
    const connection = await owner.openConnection(
      { target, extensionId: view.extensionId, viewId: view.id, senderId: 1 },
      () => {},
    );
    const frame = await owner.assetResponse(connection.frameUrl);
    expect(frame.status).toBe(200);
    expect(frame.headers.get("Content-Security-Policy")).toContain("sandbox allow-scripts");
    expect(frame.headers.get("Content-Security-Policy")).toContain("connect-src 'none'");
    expect(frame.headers.get("Content-Security-Policy")).not.toContain("allow-same-origin");
    const module = await owner.assetResponse(`${connection.frameUrl}assets/desktop.js`);
    expect(module.status).toBe(200);
    expect(module.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect((await owner.assetResponse(`${connection.frameUrl}_host/frame-bridge.js`)).status).toBe(
      200,
    );
    expect(
      (await owner.assetResponse(`${connection.frameUrl}assets/%2e%2e%2findex.ts`)).status,
    ).toBe(404);
    expect((await owner.assetResponse(`${connection.frameUrl}assets/missing.js`)).status).toBe(404);
    owner.closeSender(1);
    expect((await owner.assetResponse(`${connection.frameUrl}assets/desktop.js`)).status).toBe(404);
  } finally {
    await owner.dispose();
  }
});

test("same view IDs from different extensions are isolated and old invalidation cannot close a new runtime", async () => {
  const first = await fixture();
  const second = await fixture();
  const owner = new DesktopExtensionViewOwner({
    frameDocument: () => "",
    onHostAction: async () => {},
  });
  try {
    const input = {
      target,
      generation: "one",
      extensions: [{ resolvedPath: first.source }, { resolvedPath: second.source }],
      declarations: [first.declaration, second.declaration],
    };
    await owner.replaceRuntime(input);
    expect(owner.listViews(target)).toHaveLength(2);
    expect(new Set(owner.listViews(target).map((view) => view.extensionId)).size).toBe(2);
    await owner.replaceRuntime({ ...input, generation: "two" });
    await owner.invalidateRuntime(target, "one");
    expect(owner.listViews(target).every((view) => view.generation === "two")).toBe(true);
    expect(first.activations()).toBe(2);
    expect(first.disposals()).toBe(1);
  } finally {
    await owner.dispose();
  }
});

test("one failed disposer cannot retain another removed view or its connections", async () => {
  const first = await fixture();
  const second = await fixture();
  const diagnostics: string[] = [];
  const failing: DesktopViewDeclaration = {
    ...first.declaration,
    id: "failing",
    backend: () =>
      defineFacet((api) => {
        api.serve(
          first.Counter,
          (_input, _principal, self) => {
            self.resources({
              lifetime: resource({
                rev: 1,
                open() {
                  return null;
                },
                close() {
                  throw new Error("fixture disposal failed");
                },
              }),
            });
            return {
              kind: "default",
              increment() {
                return { value: 0 };
              },
            };
          },
          { eager: true },
        );
      }),
  };
  const owner = new DesktopExtensionViewOwner({
    frameDocument: () => "",
    onHostAction: async () => {},
    onDiagnostic: (_target, _source, message) => diagnostics.push(message),
  });
  try {
    const runtime = {
      target,
      generation: "one",
      extensions: [{ resolvedPath: first.source }, { resolvedPath: second.source }],
      declarations: [failing, second.declaration],
    };
    await owner.replaceRuntime(runtime);
    const survivor = owner.listViews(target).find(({ id }) => id === "counter")!;
    const connection = await owner.openConnection(
      { target, extensionId: survivor.extensionId, viewId: survivor.id, senderId: 1 },
      () => {},
    );
    await owner.replaceRuntime({ ...runtime, declarations: [] });
    expect(owner.listViews(target)).toEqual([]);
    expect(() => owner.getConnectionContext(connection.connectionId, 1)).toThrow("unavailable");
    expect(second.disposals()).toBe(1);
    await expect.poll(() => diagnostics).toContain("fixture disposal failed");
  } finally {
    await owner.dispose();
  }
});

test("a stalled activation reports a view error and disposes its late host", async () => {
  const data = await fixture();
  let release!: () => void;
  const activation = new Promise<void>((resolve) => {
    release = resolve;
  });
  let disposed = false;
  const declaration: DesktopViewDeclaration = {
    ...data.declaration,
    backend: () =>
      defineFacet((api) => {
        api.serve(
          data.Counter,
          (_input, _principal, self) => {
            self.resources({
              lifetime: resource({
                rev: 1,
                async open() {
                  await activation;
                  return null;
                },
                close() {
                  disposed = true;
                },
              }),
            });
            return {
              kind: "default",
              increment() {
                return { value: 0 };
              },
            };
          },
          { eager: true },
        );
      }),
  };
  const owner = new DesktopExtensionViewOwner({
    frameDocument: () => "",
    onHostAction: async () => {},
    activationTimeoutMs: 20,
  });
  try {
    await owner.replaceRuntime({
      target,
      generation: "one",
      extensions: [{ resolvedPath: data.source }],
      declarations: [declaration],
    });
    expect(owner.listViews(target)).toEqual([
      expect.objectContaining({
        state: "error",
        error: expect.stringContaining("activation timed out"),
      }),
    ]);
    await owner.invalidateRuntime(target, "one");
    release();
    await expect.poll(() => disposed).toBe(true);
  } finally {
    release();
    await owner.dispose();
  }
});

test("a loaded extension with a missing browser build appears as an actionable view error", async () => {
  const data = await fixture();
  const owner = new DesktopExtensionViewOwner({
    frameDocument: () => "",
    onHostAction: async () => {},
  });
  try {
    const missing = {
      ...data.declaration,
      frontend: pathToFileURL(path.join(data.directory, "dist", "missing.js")),
    };
    const runtime = {
      target,
      generation: "one",
      extensions: [{ resolvedPath: data.source }],
      declarations: [missing],
    };
    await owner.replaceRuntime(runtime);
    expect(owner.listViews(target)).toEqual([
      expect.objectContaining({
        id: "counter",
        state: "error",
        error: expect.stringContaining("missing.js"),
      }),
    ]);
    expect(data.activations()).toBe(0);
    await owner.replaceRuntime({ ...runtime, declarations: [data.declaration] });
    expect(owner.listViews(target)).toEqual([expect.objectContaining({ state: "ready" })]);
    expect(data.activations()).toBe(1);
  } finally {
    await owner.dispose();
  }
});

test("a replacement declaration can reuse the ID of a removed pending activation", async () => {
  test.setTimeout(5_000);
  const data = await fixture();
  let release!: () => void;
  let started!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const activationStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let oldDisposed = false;
  const oldDeclaration: DesktopViewDeclaration = {
    ...data.declaration,
    backend: () =>
      defineFacet((api) => {
        api.serve(
          data.Counter,
          (_input, _principal, self) => {
            self.resources({
              lifetime: resource({
                rev: 1,
                async open() {
                  started();
                  await pending;
                  return null;
                },
                close() {
                  oldDisposed = true;
                },
              }),
            });
            return {
              kind: "default",
              increment() {
                return { value: 0 };
              },
            };
          },
          { eager: true },
        );
      }),
  };
  const diagnostics: string[] = [];
  const owner = new DesktopExtensionViewOwner({
    frameDocument: () => "",
    onHostAction: async () => {},
    onDiagnostic: (_target, _source, message) => diagnostics.push(message),
    activationTimeoutMs: 1_000,
  });
  const runtime = {
    target,
    generation: "same-runtime",
    extensions: [{ resolvedPath: data.source }],
    declarations: [oldDeclaration],
  };
  const initial = owner.replaceRuntime(runtime);
  try {
    await activationStarted;
    // Public dispose/register replaces the declaration without replacing Pi's runtime.
    await owner.replaceRuntime({ ...runtime, declarations: [] });
    await owner.replaceRuntime({ ...runtime, declarations: [data.declaration] });
    expect(owner.listViews(target)).toEqual([
      expect.objectContaining({ id: "counter", state: "ready", generation: "same-runtime" }),
    ]);
    expect(data.activations()).toBe(1);
    expect(oldDisposed).toBe(false);
    release();
    await initial;
    expect(oldDisposed).toBe(true);
    expect(owner.listViews(target)).toEqual([
      expect.objectContaining({ id: "counter", state: "ready", generation: "same-runtime" }),
    ]);
    expect(diagnostics).not.toContain("Duplicate desktop view ID in one extension");
  } finally {
    release();
    await initial;
    await owner.dispose();
  }
});
