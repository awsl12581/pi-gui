import { t, i18n } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useCallback, useEffect, useState } from "react";
import type {
  McpServerRecord,
  McpServerScope,
  McpServersSnapshot,
  NewMcpServerInput,
} from "../../../contracts/ipc";
import { SettingsSegmented, SettingsSwitch } from "./settings-controls";
import { SettingsGroup, SettingsRow } from "./settings-utils";

/** Each returns the error to show, or undefined when the change was saved. */
export interface McpSettingsActions {
  readonly onAddServer: (server: NewMcpServerInput) => Promise<string | undefined>;
  readonly onRemoveServer: (name: string) => Promise<string | undefined>;
  readonly onSetServerEnabled: (
    scope: McpServerScope,
    name: string,
    enabled: boolean,
  ) => Promise<string | undefined>;
  readonly onSetCodemodeAlwaysOn: (alwaysOn: boolean) => Promise<string | undefined>;
}

interface SettingsMcpSectionProps {
  readonly workspaceId: string;
  readonly actions: McpSettingsActions;
}

export function SettingsMcpSection({ workspaceId, actions }: SettingsMcpSectionProps) {
  useLocale();
  // Tagged with its workspace: after a switch, the old list (whose buttons would act on the new
  // workspace) is gone at once, until the new one loads.
  const [loaded, setLoaded] = useState<
    { readonly workspaceId: string; readonly snapshot: McpServersSnapshot } | undefined
  >();
  const snapshot = loaded?.workspaceId === workspaceId ? loaded.snapshot : undefined;
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => setError(undefined), [workspaceId]);

  // pi in the terminal may have edited mcp.json while the app was in the background.
  useEffect(() => window.piApp?.onWindowFocused(() => setReloadKey((key) => key + 1)), []);

  useEffect(() => {
    const api = window.piApp;
    if (!api) return;
    let cancelled = false;
    api
      .listMcpServers(workspaceId)
      .then((next) => {
        if (!cancelled) setLoaded({ workspaceId, snapshot: next });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(errorText(loadError));
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, reloadKey]);

  /** Runs one change, shows its error, and re-reads the files either way. */
  const apply = useCallback(
    async (change: () => Promise<string | undefined>) => {
      setPending(true);
      try {
        const failure = await change();
        setError(failure);
        return failure;
      } catch (changeError) {
        const failure = errorText(changeError);
        setError(failure);
        return failure;
      } finally {
        setPending(false);
        setReloadKey((key) => key + 1);
      }
    },
    [i18n.language],
  );

  const run = useCallback(
    (change: () => Promise<string | undefined>) => {
      apply(change).catch((changeError: unknown) => setError(errorText(changeError)));
    },
    [apply, i18n.language],
  );

  const servers = snapshot?.servers ?? [];
  const problems = [...(error ? [error] : []), ...(snapshot?.errors ?? [])];
  const globalConfigPath = snapshot?.globalConfigPath ?? t("pi's global mcp.json");

  return (
    <>
      <SettingsGroup
        title={t("Servers")}
        description={t(
          "Shared with pi in the terminal: {{value0}}, plus this project's .pi/mcp.json.",
          { value0: globalConfigPath },
        )}
      >
        {problems.map((problem) => (
          <div className="settings-row" key={problem}>
            <span className="settings-row__description settings-warning">{problem}</span>
          </div>
        ))}
        {snapshot && servers.length === 0 ? (
          <div className="settings-row" data-testid="mcp-servers-empty">
            <span className="settings-row__description">
              {t("No MCP servers yet. Servers come from")}
              {globalConfigPath}
              {t(
                ", which pi in the terminal uses too. Connection status and sign-in show in threads: type /mcp.",
              )}
            </span>
          </div>
        ) : null}
        {servers.map((server) => (
          <McpServerRow
            disabled={pending}
            key={`${server.scope}:${server.name}`}
            server={server}
            onRemove={() => {
              if (window.confirm(removeServerQuestion(server))) {
                run(() => actions.onRemoveServer(server.name));
              }
            }}
            onToggle={(enabled) =>
              run(() => actions.onSetServerEnabled(server.scope, server.name, enabled))
            }
          />
        ))}
      </SettingsGroup>

      <AddMcpServerForm
        configPath={globalConfigPath}
        disabled={pending}
        onAdd={(server) => apply(() => actions.onAddServer(server))}
      />

      <SettingsGroup title={t("Code mode")}>
        <SettingsRow
          title={t("Always on")}
          description={t(
            "Lets the model run scripts that call tools. Turning it on also applies to open threads; turning it off applies to new threads. Off, pi turns it on when an MCP server needs it.",
          )}
        >
          <SettingsSwitch
            checked={snapshot?.codemodeAlwaysOn ?? false}
            disabled={pending || !snapshot}
            label={t("Code mode always on")}
            onChange={(alwaysOn) => run(() => actions.onSetCodemodeAlwaysOn(alwaysOn))}
          />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}

function McpServerRow({
  server,
  disabled,
  onToggle,
  onRemove,
}: {
  readonly server: McpServerRecord;
  readonly disabled: boolean;
  readonly onToggle: (enabled: boolean) => void;
  readonly onRemove: () => void;
}) {
  useLocale();
  const target =
    server.transport === "http"
      ? (server.url ?? "")
      : [server.command ?? "", ...(server.args ?? []).map(quoteArgument)].join(" ");
  return (
    <div className="settings-row" data-testid="mcp-server-row" data-server-name={server.name}>
      <div className="settings-row__label">
        <div className="settings-row__title">{server.name}</div>
        {server.description ? (
          <div className="settings-row__description">{server.description}</div>
        ) : null}
        <div className="settings-row__description">
          {server.scope === "project" ? t("This project · {{value0}}", { value0: target }) : target}
        </div>
      </div>
      <div className="settings-row__actions">
        {server.scope === "global" ? (
          <button
            className="button button--secondary"
            disabled={disabled}
            type="button"
            onClick={onRemove}
          >
            {t("Remove")}
          </button>
        ) : null}
        <SettingsSwitch
          checked={server.enabled}
          disabled={disabled}
          label={t("Enable {{value0}}", { value0: server.name })}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}

/** Removing deletes the whole entry, including the settings the list never shows. */
export function removeServerQuestion(server: McpServerRecord): string {
  const question = t('Remove MCP server "{{value0}}"? pi in the terminal stops using it too.', {
    value0: server.name,
  });
  return server.hasHiddenSettings
    ? t(
        "{{value0}} Its hidden settings (environment variables, headers, sign-in config) are deleted too.",
        { value0: question },
      )
    : question;
}

type ServerKind = "command" | "url";

function AddMcpServerForm({
  configPath,
  disabled,
  onAdd,
}: {
  readonly configPath: string;
  readonly disabled: boolean;
  readonly onAdd: (server: NewMcpServerInput) => Promise<string | undefined>;
}) {
  useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ServerKind>("command");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");

  const ready = name.trim() !== "" && (kind === "command" ? command.trim() : url.trim()) !== "";

  const submit = async () => {
    const named = description.trim()
      ? { name: name.trim(), description: description.trim() }
      : { name: name.trim() };
    const server: NewMcpServerInput =
      kind === "command"
        ? { ...named, command: command.trim(), args: splitArguments(args) }
        : { ...named, url: url.trim() };
    if (!(await onAdd(server))) {
      setName("");
      setDescription("");
      setCommand("");
      setArgs("");
      setUrl("");
    }
  };

  return (
    <SettingsGroup
      title={t("Add server")}
      description={t("Saved to {{value0}}.", { value0: configPath })}
    >
      <SettingsRow title={t("Name")}>
        <input
          aria-label={t("Server name")}
          className="settings-text-input"
          disabled={disabled}
          placeholder="docs"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </SettingsRow>
      <SettingsRow
        title={t("What it does")}
        description={t("Optional. pi tells the model about the server with it.")}
      >
        <input
          aria-label={t("Server description")}
          className="settings-text-input"
          disabled={disabled}
          placeholder={t("Searches the team's docs")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </SettingsRow>
      <SettingsRow title={t("Type")}>
        <SettingsSegmented<ServerKind>
          label={t("Server type")}
          options={[
            { value: "command", label: t("Command") },
            { value: "url", label: "URL" },
          ]}
          value={kind}
          onChange={setKind}
        />
      </SettingsRow>
      {kind === "command" ? (
        <>
          <SettingsRow
            title={t("Command")}
            description={t("Started on this machine for each thread.")}
          >
            <input
              aria-label={t("Server command")}
              className="settings-text-input"
              disabled={disabled}
              placeholder="npx"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
            />
          </SettingsRow>
          <SettingsRow
            title={t("Arguments")}
            description={t("Separated by spaces; quote an argument that contains spaces.")}
          >
            <input
              aria-label={t("Server arguments")}
              className="settings-text-input"
              disabled={disabled}
              placeholder="-y @modelcontextprotocol/server-filesystem ."
              value={args}
              onChange={(event) => setArgs(event.target.value)}
            />
          </SettingsRow>
        </>
      ) : (
        <SettingsRow
          title="URL"
          description={t(
            "A streamable HTTP server. If it needs a sign-in, type /mcp login in a thread.",
          )}
        >
          <input
            aria-label={t("Server URL")}
            className="settings-text-input"
            disabled={disabled}
            placeholder="https://example.com/mcp"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </SettingsRow>
      )}
      <div className="settings-row">
        <span className="settings-row__description">
          {t("Open threads reload to start it. Add env or headers in the file itself.")}
        </span>
        <div className="settings-row__control">
          <button
            className="button"
            disabled={disabled || !ready}
            type="button"
            onClick={() => {
              submit().catch(() => undefined);
            }}
          >
            {t("Add server")}
          </button>
        </div>
      </div>
    </SettingsGroup>
  );
}

/** Splits on spaces, keeping quoted parts ("a b" or 'a b') together. */
export function splitArguments(text: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: string | undefined;
  let started = false;
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) args.push(current);
      current = "";
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (started) args.push(current);
  return args;
}

function quoteArgument(arg: string): string {
  return arg === "" || /\s/.test(arg) ? JSON.stringify(arg) : arg;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
