import {
  createHost,
  ipcLink,
  isJsonValue,
  type Frame,
  type Host,
  type JsonValue,
} from "@earendil-works/chord";

export interface ChordWireMessage {
  readonly chord2: JsonValue;
}
interface ConnectionOptions {
  readonly send: (message: ChordWireMessage) => void;
  readonly onError?: (error: Error) => void;
}
export interface ChordServerConnection {
  receive(message: unknown): Promise<void>;
  /** Releases the consumer; accepted backend calls finish on their existing host. */
  close(reason?: string): void;
}
export interface ChordClientConnection {
  readonly host: Pick<Host, "get" | "root">;
  readonly signal: AbortSignal;
  receive(message: unknown): void;
  close(reason?: string): void;
}
const MAX_MESSAGE_LENGTH = 2_000_000;
const MAX_PENDING = 256;

/** Chord owns frame validation, RPC, cancellation and per-subscription state codecs. */
function channel(options: ConnectionOptions) {
  const listeners = new Set<(message: unknown) => void>();
  const disconnects = new Set<() => void>();
  const link = ipcLink({
    get connected() {
      return !link.closed;
    },
    send(message) {
      // Chord frames may omit optional fields. Detach exactly as its JSON links do.
      const encoded = JSON.stringify(message);
      if (encoded.length > MAX_MESSAGE_LENGTH)
        throw new TypeError("Desktop service message exceeds size limit");
      const detached = parseMessage(JSON.parse(encoded));
      queueMicrotask(() => {
        try {
          options.send(detached);
        } catch (error) {
          fail(error);
        }
      });
      return true;
    },
    on(event: string, handler: (() => void) | ((message: unknown) => void)) {
      if (event === "message") listeners.add(handler);
      else disconnects.add(handler as () => void);
    },
    off(event: string, handler: (() => void) | ((message: unknown) => void)) {
      if (event === "message") listeners.delete(handler);
      else disconnects.delete(handler as () => void);
    },
  });
  function fail(error: unknown) {
    link.close("Invalid or unavailable desktop service connection");
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
  }
  return {
    link,
    fail,
    deliver(message: unknown) {
      for (const listener of listeners) listener(message);
    },
  };
}

/** One scoped view host accepts browser clients, never child hosts or forwarded principals. */
export function createChordServerConnection(
  options: ConnectionOptions & { readonly host: Host },
): ChordServerConnection {
  const calls = new Set<number>();
  const holds = new Set<number>();
  const subscriptions = new Set<number>();
  let detached = false;
  const wire = channel({
    ...options,
    send(message) {
      const frame = message.chord2 as unknown as Frame;
      if (frame.t === "result") calls.delete(frame.id);
      if (frame.t === "gone") holds.delete(frame.id);
      if (detached) {
        if (calls.size === 0) wire.link.close();
        // Accepted calls outlive the browser, so keep their local link alive until they settle.
        else if (frame.t === "ping") wire.deliver({ chord2: { t: "pong", n: frame.n } });
        return;
      }
      options.send(message);
    },
  });
  options.host.accept(wire.link, { principal: { kind: "desktop-view" }, kind: "client" });
  function close(reason = "Desktop view connection closed") {
    if (detached) return;
    detached = true;
    try {
      options.send({ chord2: { t: "bye", reason } });
    } catch {
      /* The browser may already be gone. */
    }
    for (const id of subscriptions) wire.deliver({ chord2: { t: "unsub", id } });
    for (const id of holds) wire.deliver({ chord2: { t: "release", id } });
    subscriptions.clear();
    holds.clear();
    if (calls.size === 0) wire.link.close(reason);
  }
  return {
    close,
    async receive(input) {
      if (detached || wire.link.closed) return;
      try {
        const message = parseMessage(input);
        const frame = message.chord2;
        if (!isRecord(frame) || typeof frame.t !== "string")
          throw new TypeError("Invalid desktop service frame");
        if (frame.t === "bye") {
          close();
          return;
        }
        if (
          !["hello", "hold", "release", "call", "cancel", "sub", "unsub", "ping", "pong"].includes(
            frame.t,
          )
        )
          throw new TypeError("Frame is not permitted from a desktop browser");
        if (
          frame.t === "hold" &&
          (frame.at !== options.host.name ||
            !isRecord(frame.token) ||
            frame.token.scope !== "remote" ||
            "principal" in frame ||
            "client" in frame)
        )
          throw new TypeError("Desktop view cannot route or forward identities");
        if (frame.t === "call" && "root" in frame)
          throw new TypeError("Desktop browser cannot supply a root");
        if (["hold", "call", "sub"].includes(frame.t)) {
          const id = frame.id;
          if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 0)
            throw new TypeError("Invalid desktop service ID");
          const pending = frame.t === "hold" ? holds : frame.t === "call" ? calls : subscriptions;
          if (pending.has(id) || pending.size >= MAX_PENDING)
            throw new TypeError("Duplicate or excessive desktop service requests");
          pending.add(id);
        }
        if (frame.t === "release") holds.delete(Number(frame.id));
        if (frame.t === "unsub") subscriptions.delete(Number(frame.id));
        wire.deliver(message);
      } catch (error) {
        wire.fail(error);
      }
    },
  };
}

export function createChordClientConnection(options: ConnectionOptions): ChordClientConnection {
  const controller = new AbortController();
  const wire = channel(options);
  const host = createHost({ name: "desktop-browser", kind: "client", onError: wire.fail });
  const handles = new Set<{ release(): void }>();
  const scoped: Pick<Host, "get" | "root"> = {
    get(type, input, options) {
      controller.signal.throwIfAborted();
      const handle = host.get(type, input, options);
      handles.add(handle);
      return handle;
    },
    root(fn, options) {
      return host.root(fn, {
        ...options,
        signal: options?.signal
          ? AbortSignal.any([controller.signal, options.signal])
          : controller.signal,
      });
    },
  };
  wire.link.onClose((reason) => {
    controller.abort(new Error(reason));
    for (const handle of handles) handle.release();
    handles.clear();
    void host.close().catch(wire.fail);
  });
  host.connect(wire.link);
  return {
    host: scoped,
    signal: controller.signal,
    close(reason) {
      wire.link.close(reason);
    },
    receive(input) {
      if (wire.link.closed) return;
      try {
        wire.deliver(parseMessage(input));
      } catch (error) {
        wire.fail(error);
      }
    },
  };
}
function parseMessage(value: unknown): ChordWireMessage {
  if (!isJsonValue(value)) throw new TypeError("Desktop service messages must contain strict JSON");
  const encoded = JSON.stringify(value);
  if (encoded.length > MAX_MESSAGE_LENGTH)
    throw new TypeError("Desktop service message exceeds size limit");
  if (!isRecord(value) || Object.keys(value).length !== 1 || !("chord2" in value))
    throw new TypeError("Invalid desktop service envelope");
  return JSON.parse(encoded) as ChordWireMessage;
}
function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
