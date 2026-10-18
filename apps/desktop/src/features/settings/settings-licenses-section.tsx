import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useState } from "react";
const notices = __PI_GUI_LICENSE_NOTICES__;
import { SettingsGroup } from "./settings-utils";

export function SettingsLicensesSection() {
  useLocale();
  const [query, setQuery] = useState("");
  const [chromium, setChromium] = useState<string>();
  const [chromiumError, setChromiumError] = useState(false);
  const normalized = query.trim().toLowerCase();
  const matches = notices.filter((entry) =>
    [
      entry.name,
      entry.version,
      entry.license,
      entry.author,
      ...entry.notices.map((notice) => notice.text),
    ].some((value) => value.toLowerCase().includes(normalized)),
  );

  return (
    <>
      <SettingsGroup
        title={t("Licenses and copyright")}
        plain
        description={t(
          "Original notices for pi-gui, installed dependencies and development tools. GitHub CLI is bundled on Windows. Independently installed extensions have their own licenses.",
        )}
      >
        <Input
          className="settings-text-input licenses-search"
          aria-label={t("Search licenses")}
          placeholder={t("Search packages, licenses or copyright holders")}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="settings-section__description" role="status">
          {t("{{shown}} of {{total}} components", { shown: matches.length, total: notices.length })}
        </p>
        <div className="settings-group">
          {matches.map((entry) => (
            <details className="license-notice" key={`${entry.name}@${entry.version}`}>
              <summary>
                <span>
                  {entry.name} <span className="license-notice__metadata">{entry.version}</span>
                </span>
                <span className="license-notice__metadata">{entry.license}</span>
              </summary>
              <div className="license-notice__body">
                {entry.author ? <p>{t("Author: {{author}}", { author: entry.author })}</p> : null}
                {entry.notices.length ? (
                  entry.notices.map((notice) => (
                    <div key={notice.file}>
                      <h4>{notice.file}</h4>
                      <pre>{notice.text}</pre>
                    </div>
                  ))
                ) : (
                  <p>
                    {t(
                      "No license or copyright notice file was supplied in this installed package. See its upstream distribution for additional terms.",
                    )}
                  </p>
                )}
              </div>
            </details>
          ))}
          {matches.length === 0 ? (
            <p className="license-notice__body">{t("No matching components.")}</p>
          ) : null}
        </div>
      </SettingsGroup>
      <SettingsGroup title={t("Chromium and Electron third-party notices")} plain>
        <Button
          variant="outline"

          type="button"
          onClick={() => {
            setChromiumError(false);
            import("./chromium-notices")
              .then((module) => setChromium(module.default))
              .catch(() => setChromiumError(true));
          }}
        >
          {t("View Chromium notices")}
        </Button>
        {chromiumError ? (
          <p role="alert">{t("Could not load Chromium notices. Try again.")}</p>
        ) : null}
        {chromium ? (
          <iframe
            className="license-notice__chromium"
            title={t("Chromium third-party notices")}
            sandbox=""
            srcDoc={chromium}
          />
        ) : null}
      </SettingsGroup>
    </>
  );
}
