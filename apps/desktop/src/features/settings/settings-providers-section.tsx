import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { t, i18n } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useEffect, useMemo, useState } from "react";
import type { RuntimeProviderRecord, RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import { SearchIcon } from "../../ui/icons";
import type { CustomProviderConfig } from "../../../contracts/ipc";
import { SettingsCustomEndpointsSection } from "./settings-custom-endpoints-section";
import { filterProviders, ProviderRow, SettingsGroup } from "./settings-utils";

interface SettingsProvidersSectionProps {
  readonly runtime?: RuntimeSnapshot;
  readonly onLoginProvider: (providerId: string) => void;
  readonly onLogoutProvider: (providerId: string) => void;
  readonly onSetProviderApiKey: (providerId: string, apiKey: string) => Promise<string | undefined>;
  readonly onRemoveProviderApiKey: (providerId: string) => Promise<string | undefined>;
  readonly onSaveCustomProvider: (config: CustomProviderConfig) => Promise<string | undefined>;
  readonly onDeleteCustomProvider: (providerId: string) => Promise<string | undefined>;
}

const COLLAPSED_AVAILABLE_COUNT = 8;

/** Sign-in providers first, then API key providers, then the rest, each alphabetical. */
function compareAvailableProviders(left: RuntimeProviderRecord, right: RuntimeProviderRecord) {
  const rank = (provider: RuntimeProviderRecord) =>
    provider.oauthSupported ? 0 : provider.apiKeySetupSupported ? 1 : 2;
  return rank(left) - rank(right) || left.name.localeCompare(right.name);
}

export function SettingsProvidersSection({
  runtime,
  onLoginProvider,
  onLogoutProvider,
  onSetProviderApiKey,
  onRemoveProviderApiKey,
  onSaveCustomProvider,
  onDeleteCustomProvider,
}: SettingsProvidersSectionProps) {
  useLocale();
  const [providerQuery, setProviderQuery] = useState("");
  const [showAllAvailable, setShowAllAvailable] = useState(false);
  const [apiKeyProviderId, setApiKeyProviderId] = useState<string | undefined>();
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();
  const [apiKeyPending, setApiKeyPending] = useState(false);

  const providers = runtime?.providers ?? [];
  const connectedProviders = providers.filter((provider) => provider.hasAuth);
  const defaultProviderId = runtime?.settings.defaultProvider;
  const attentionProviders = providers.filter(
    (provider) => provider.id === defaultProviderId && !provider.hasAuth,
  );
  const availableProviders = providers
    .filter((provider) => !provider.hasAuth && provider.id !== defaultProviderId)
    .sort(compareAvailableProviders);
  const filteredAvailable = filterProviders(availableProviders, providerQuery);
  const expandAvailable = showAllAvailable || providerQuery.trim().length > 0;
  const shownAvailable = expandAvailable
    ? filteredAvailable
    : filteredAvailable.slice(0, COLLAPSED_AVAILABLE_COUNT);
  const hiddenAvailableCount = filteredAvailable.length - shownAvailable.length;
  const rowHandlers = {
    onLoginProvider,
    onLogoutProvider,
    onConfigureApiKey: (entry: RuntimeProviderRecord) => setApiKeyProviderId(entry.id),
  };
  const apiKeyProvider = apiKeyProviderId
    ? providers.find((provider) => provider.id === apiKeyProviderId)
    : undefined;
  const existingProviderIds = useMemo(
    () => providers.map((provider) => provider.id),
    [providers, i18n.language],
  );

  useEffect(() => {
    setApiKeyDraft("");
    setApiKeyError(undefined);
    setApiKeyPending(false);
  }, [apiKeyProviderId]);

  const closeApiKeyDialog = () => {
    if (apiKeyPending) {
      return;
    }
    setApiKeyProviderId(undefined);
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyProvider) {
      return;
    }
    setApiKeyPending(true);
    setApiKeyError(undefined);
    const nextError = await onSetProviderApiKey(apiKeyProvider.id, apiKeyDraft.trim());
    if (nextError) {
      setApiKeyPending(false);
      setApiKeyError(nextError);
      return;
    }
    setApiKeyProviderId(undefined);
  };

  const handleRemoveApiKey = async () => {
    if (!apiKeyProvider) {
      return;
    }
    setApiKeyPending(true);
    setApiKeyError(undefined);
    const nextError = await onRemoveProviderApiKey(apiKeyProvider.id);
    if (nextError) {
      setApiKeyPending(false);
      setApiKeyError(nextError);
      return;
    }
    setApiKeyProviderId(undefined);
  };

  return (
    <>
      {attentionProviders.length > 0 ? (
        <SettingsGroup
          title={t("Needs attention")}
          description={t("Your default model uses this provider, but it is not connected.")}
        >
          {attentionProviders.map((provider) => (
            <ProviderRow key={provider.id} provider={provider} {...rowHandlers} />
          ))}
        </SettingsGroup>
      ) : null}

      <section className="settings-section">
        <h3 className="settings-section__title">
          {t("Connected")}
          <span className="resource-list__count">{connectedProviders.length}</span>
        </h3>
        <p className="settings-section__description">
          {t("pi picks models from connected providers first.")}
        </p>
        <div className="settings-group">
          {connectedProviders.length > 0 ? (
            connectedProviders.map((provider) => (
              <ProviderRow key={provider.id} provider={provider} {...rowHandlers} />
            ))
          ) : (
            <div className="settings-row">
              <span className="settings-row__description">
                {t("No providers connected yet. Sign in or add an API key below.")}
              </span>
            </div>
          )}
        </div>
      </section>

      <SettingsCustomEndpointsSection
        existingProviderIds={existingProviderIds}
        onSaveCustomProvider={onSaveCustomProvider}
        onDeleteCustomProvider={onDeleteCustomProvider}
      />

      <section className="settings-section">
        <div className="settings-section__header">
          <h3 className="settings-section__title">
            {t("Available")}
            <span className="resource-list__count">{availableProviders.length}</span>
          </h3>
          <label className="resource-search">
            <SearchIcon />
            <Input
              aria-label={t("Search providers")}
              placeholder={t("Search providers")}
              spellCheck={false}
              type="search"
              value={providerQuery}
              onChange={(event) => setProviderQuery(event.currentTarget.value)}
            />
          </label>
        </div>
        <p className="settings-section__description">
          {t("Sign in with OAuth or save an API key to connect a provider.")}
        </p>
        <div className="settings-group" data-testid="settings-available-providers">
          {shownAvailable.length > 0 ? (
            shownAvailable.map((provider) => (
              <ProviderRow key={provider.id} provider={provider} {...rowHandlers} />
            ))
          ) : (
            <div className="settings-row">
              <span className="settings-row__description">
                {providerQuery.trim()
                  ? t("No providers match “{{value0}}”.", { value0: providerQuery.trim() })
                  : t("Every provider is connected.")}
              </span>
            </div>
          )}
        </div>
        {hiddenAvailableCount > 0 ? (
          <button
            className="resource-list__more"
            type="button"
            onClick={() => setShowAllAvailable(true)}
          >
            {t("Show {{value0}} more", { value0: hiddenAvailableCount })}
          </button>
        ) : null}
      </section>

      {apiKeyProvider ? (
        <ProviderApiKeyDialog
          provider={apiKeyProvider}
          draft={apiKeyDraft}
          error={apiKeyError}
          pending={apiKeyPending}
          onChangeDraft={setApiKeyDraft}
          onClose={closeApiKeyDialog}
          onRemove={apiKeyProvider.authSource === "auth_file" ? handleRemoveApiKey : undefined}
          onSave={handleSaveApiKey}
        />
      ) : null}
    </>
  );
}

function ProviderApiKeyDialog({
  provider,
  draft,
  error,
  pending,
  onChangeDraft,
  onClose,
  onRemove,
  onSave,
}: {
  readonly provider: RuntimeSnapshot["providers"][number];
  readonly draft: string;
  readonly error?: string;
  readonly pending: boolean;
  readonly onChangeDraft: (value: string) => void;
  readonly onClose: () => void;
  readonly onRemove?: () => Promise<void>;
  readonly onSave: () => Promise<void>;
}) {
  useLocale();
  const title = provider.authSource === "auth_file" ? t("Manage API key") : t("Set API key");
  const body =
    provider.authSource === "auth_file"
      ? t("Replace or remove the saved API key for {{value0}}.", { value0: provider.name })
      : t("Save an API key locally for {{value0}}.", { value0: provider.name });

  return (
    <div className="extension-dialog-backdrop">
      <div className="extension-dialog" data-testid="provider-api-key-dialog">
        <div className="extension-dialog__title">{title}</div>
        <p className="extension-dialog__body">{body}</p>
        <Input
          aria-label={t("{{value0}} API key", { value0: provider.name })}
          autoFocus
          className="settings-search"
          disabled={pending}
          placeholder={t("Enter API key")}
          type="password"
          value={draft}
          onChange={(event) => onChangeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
              return;
            }
            if (event.key === "Enter" && draft.trim()) {
              event.preventDefault();
              void onSave().catch((error: unknown) => {
                console.error("[renderer] onSave failed", error);
              });
            }
          }}
        />
        {error ? <p className="extension-dialog__body settings-warning">{error}</p> : null}
        <div className="extension-dialog__actions">
          <Button
            variant="outline"

            disabled={pending}
            type="button"
            onClick={onClose}
          >
            {t("Cancel")}
          </Button>
          {onRemove ? (
            <Button
              variant="outline"

              disabled={pending}
              type="button"
              onClick={() =>
                void onRemove().catch((error: unknown) => {
                  console.error("[renderer] onRemove failed", error);
                })
              }
            >
              {t("Remove saved key")}
            </Button>
          ) : null}
          <Button
            disabled={pending || draft.trim().length === 0}
            type="button"
            onClick={() =>
              void onSave().catch((error: unknown) => {
                console.error("[renderer] onSave failed", error);
              })
            }
          >
            {provider.authSource === "auth_file" ? t("Save key") : t("Set API key")}
          </Button>
        </div>
      </div>
    </div>
  );
}
