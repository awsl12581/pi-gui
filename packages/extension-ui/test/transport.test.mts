import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { cell, createHost, method, remote, type Host } from "@earendil-works/chord";
import { Type } from "typebox";
import {
  createChordClientConnection,
  createChordServerConnection,
  type ChordClientConnection,
} from "../dist/transport.js";

const State = Type.Object({ count: Type.Number(), labels: Type.Array(Type.String()) });
const Counter = remote("test.counter", {
  version: 1,
  input: Type.Object({}),
  variants: {
    default: {
      state: { state: State },
      methods: {
        increment: method(Type.Object({ label: Type.String() }), Type.Number()),
        wait: method(Type.Object({}), Type.Null()),
      },
    },
  },
});
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function backend() {
  const host = createHost({ name: "desktop-extension", principalKey: () => "view", dev: true });
  let cancelled = false;
  const started = gate();
  host.serve(
    Counter,
    (_input, _principal, self) => {
      const { state } = self.state({ state: cell(State, { count: 0, labels: [] }) });
      return {
        kind: "default",
        state,
        increment({ label }, ctx) {
          state.change(ctx, (draft) => {
            draft.count++;
            draft.labels.push(label);
          });
          return state.value.count;
        },
        async wait(_input, ctx) {
          started.release();
          await new Promise<void>((resolve) => {
            if (ctx.signal.aborted) resolve();
            else ctx.signal.addEventListener("abort", () => resolve(), { once: true });
          });
          cancelled = ctx.signal.aborted;
          return null;
        },
      };
    },
    { eager: true },
  );
  await host.ready();
  return { host, started, cancelled: () => cancelled };
}
function connect(
  host: Host,
  factory = createChordClientConnection,
  transform: (message: unknown) => unknown = (value) => value,
) {
  const errors: Error[] = [];
  let client!: ChordClientConnection;
  const server = createChordServerConnection({
    host,
    send: (message) => client.receive(transform(message)),
    onError: (error) => errors.push(error),
  });
  client = factory({
    send: (message) => {
      void server.receive(message).catch((error: unknown) => {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      });
    },
    onError: (error) => errors.push(error),
  });
  const counter =
    host.name === "work-host"
      ? undefined!
      : client.host.get(Counter, {}, { at: "desktop-extension" });
  if (counter)
    void counter.ready.catch((error: unknown) => {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    });
  return { client, server, counter, errors };
}
await test("native Chord hydrates, streams immutable state and shares one backend across mounts", async (t) => {
  const fixture = await backend();
  const a = connect(fixture.host);
  const b = connect(fixture.host);
  t.after(async () => {
    a.client.close();
    b.client.close();
    await fixture.host.close();
  });
  await Promise.all([a.counter.ready, b.counter.ready]);
  t.after(b.counter.state.subscribe(() => {}));
  const seen: unknown[] = [];
  const unsubscribe = a.counter.state.subscribe((value) => seen.push(value));
  t.after(unsubscribe);
  await assert.doesNotReject(async () => {
    assert.equal(await a.counter.increment({ label: "first" }), 1);
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(a.counter.state.value, { count: 1, labels: ["first"] });
  const previous = a.counter.state.value;
  a.client.close();
  assert.equal(a.client.signal.aborted, true);
  assert.equal(await b.counter.increment({ label: "second" }), 2);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(previous, { count: 1, labels: ["first"] });
  assert.deepEqual(b.counter.state.value, { count: 2, labels: ["first", "second"] });
  assert.ok(seen.length >= 2);
  assert.deepEqual(b.errors, []);
});
await test("explicit cancellation reaches the backend and released handles cannot mutate", async (t) => {
  const fixture = await backend();
  const wire = connect(fixture.host);
  t.after(async () => {
    wire.client.close();
    await fixture.host.close();
  });
  await wire.counter.ready;
  const abort = new AbortController();
  const waiting = wire.client.host.root((ctx) => wire.counter.wait({}, ctx), {
    signal: abort.signal,
  });
  await fixture.started.promise;
  abort.abort();
  await assert.rejects(waiting);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.cancelled(), true);
  wire.counter.release();
  await assert.rejects(wire.counter.increment({ label: "stale" }));
});
await test("closing a tab rejects the waiter but accepted work keeps its uncancelled context", async (t) => {
  const started = gate(),
    finish = gate(),
    finished = gate();
  let cancelled = true;
  const Work = remote("test.work", {
    version: 1,
    input: Type.Object({}),
    variants: { default: { methods: { run: method(Type.Object({}), Type.Null()) } } },
  });
  const host = createHost({ name: "work-host", principalKey: () => "view" });
  host.serve(
    Work,
    () => ({
      kind: "default",
      async run(_input, ctx) {
        started.release();
        await finish.promise;
        cancelled = ctx.signal.aborted;
        finished.release();
        return null;
      },
    }),
    { eager: true },
  );
  await host.ready();
  const wire = connect(host);
  t.after(async () => {
    finish.release();
    wire.client.close();
    await host.close();
  });
  const work = wire.client.host.get(Work, {}, { at: "work-host" });
  await work.ready;
  const waiting = work.run({});
  await started.promise;
  wire.client.close("tab closed");
  await assert.rejects(waiting);
  finish.release();
  await finished.promise;
  assert.equal(cancelled, false);
});
await test("disconnect rejects unfinished hydration", async () => {
  const client = createChordClientConnection({ send() {} });
  const counter = client.host.get(Counter, {}, { at: "desktop-extension" });
  const ready = counter.ready;
  client.close("mount removed");
  await assert.rejects(ready);
  assert.equal(client.signal.aborted, true);
});
await test("untrusted frames fail closed: JSON, size, identities, routes and host control", async (t) => {
  const fixture = await backend();
  t.after(() => fixture.host.close());
  for (const input of [
    { chord2: { t: "call", id: 1, hold: 1, member: "increment", args: { label: undefined } } },
    { chord2: { t: "hello", name: "x".repeat(2_000_000), kind: "client", epoch: 1 } },
    { chord2: { t: "hold", id: 1, at: "other-host", token: Counter.description, input: {} } },
    {
      chord2: {
        t: "hold",
        id: 1,
        at: "desktop-extension",
        token: Counter.description,
        input: {},
        principal: { admin: true },
      },
    },
    {
      chord2: {
        t: "call",
        id: 1,
        hold: 1,
        member: "increment",
        args: { label: "x" },
        root: { rootId: "forged", epoch: 1 },
      },
    },
    { chord2: { t: "prepare", reload: 1, epoch: 2, plugins: [], options: {} } },
    { chord2: { t: "call" } },
    { chord2: { t: "unknown" } },
  ]) {
    const wire = connect(fixture.host);
    await wire.server.receive(input);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(wire.client.signal.aborted, true, JSON.stringify(input).slice(0, 120));
    wire.client.close();
  }
});
await test("malformed server frames close browser connections", async (t) => {
  const fixture = await backend();
  t.after(() => fixture.host.close());
  const bad = connect(fixture.host, createChordClientConnection, (message) => {
    const value = message as { chord2: { t: string } };
    return value.chord2.t === "shape" ? { chord2: { t: "shape" } } : message;
  });
  await assert.rejects(bad.counter.ready);
  assert.equal(bad.client.signal.aborted, true);
  bad.client.close();
});
await test("browser bundle and backend exchange native Chord contracts across separate module copies", async (t) => {
  const fixture = await backend();
  t.after(() => fixture.host.close());
  const result = await build({
    stdin: {
      contents: `export {createChordClientConnection} from './src/transport.ts';`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    logLevel: "warning",
  });
  const browser = (await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.contents).toString("base64")}`
  )) as { createChordClientConnection: typeof createChordClientConnection };
  const wire = connect(fixture.host, browser.createChordClientConnection);
  t.after(() => wire.client.close());
  await wire.counter.ready;
  assert.equal(await wire.counter.increment({ label: "browser" }), 1);
});
