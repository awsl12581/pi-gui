import { Button } from "../../components/ui/button";
import { t } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import type { DesktopNotificationPermissionStatus } from "../../../contracts/ipc";
import type { NotificationPreferences } from "../../../contracts/desktop-state";
import { SettingsSwitch } from "./settings-controls";
import { SettingsGroup, SettingsRow } from "./settings-utils";

interface SettingsNotificationsSectionProps {
  readonly notificationPreferences: NotificationPreferences;
  readonly notificationPermissionStatus: DesktopNotificationPermissionStatus;
  readonly notificationPermissionPending: boolean;
  readonly onSetNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void;
  readonly onRequestNotificationPermission: () => void;
  readonly onOpenSystemNotificationSettings: () => void;
}

export function SettingsNotificationsSection({
  notificationPreferences,
  notificationPermissionStatus,
  notificationPermissionPending,
  onSetNotificationPreferences,
  onRequestNotificationPermission,
  onOpenSystemNotificationSettings,
}: SettingsNotificationsSectionProps) {
  useLocale();
  const statusLabel = labelForPermissionStatus(notificationPermissionStatus);
  const statusDescription = descriptionForPermissionStatus(notificationPermissionStatus);
  const showAskMacOs = notificationPermissionStatus === "default";
  const showOpenSystemSettings = notificationPermissionStatus === "denied";
  const showRecoveryActions = showAskMacOs || showOpenSystemSettings;

  return (
    <>
      <SettingsGroup
        title={t("System")}
        description={t("macOS decides whether pi-gui can show desktop notifications at all.")}
      >
        <SettingsRow title={t("macOS notification access")} description={statusDescription}>
          <span className="settings-row__value">{statusLabel}</span>
        </SettingsRow>
        {showRecoveryActions ? (
          <SettingsRow
            title={t("Turn on notifications")}
            description={
              showAskMacOs
                ? t(
                    "pi-gui asks macOS when active work first moves into the background. You can also ask now.",
                  )
                : t(
                    "macOS notifications are already turned off for pi-gui. Open System Settings to enable them again.",
                  )
            }
          >
            <div className="settings-row__actions">
              {showAskMacOs ? (
                <Button
                  variant="outline"

                  disabled={notificationPermissionPending}
                  type="button"
                  onClick={onRequestNotificationPermission}
                >
                  {t("Ask macOS")}
                </Button>
              ) : null}
              {showOpenSystemSettings ? (
                <Button
                  variant="outline"

                  disabled={notificationPermissionPending}
                  type="button"
                  onClick={onOpenSystemNotificationSettings}
                >
                  {t("Open System Settings")}
                </Button>
              ) : null}
            </div>
          </SettingsRow>
        ) : null}
      </SettingsGroup>

      <SettingsGroup
        title={t("In-app alerts")}
        description={t(
          "Choose which background events should try to notify once macOS access is enabled.",
        )}
      >
        <SettingsRow
          title={t("Background completion")}
          description={t("Notify when a background session finishes.")}
        >
          <SettingsSwitch
            checked={notificationPreferences.backgroundCompletion}
            label={t("Background completion")}
            onChange={(checked) => onSetNotificationPreferences({ backgroundCompletion: checked })}
          />
        </SettingsRow>
        <SettingsRow
          title={t("Background failures")}
          description={t("Notify when a background session fails.")}
        >
          <SettingsSwitch
            checked={notificationPreferences.backgroundFailure}
            label={t("Background failures")}
            onChange={(checked) => onSetNotificationPreferences({ backgroundFailure: checked })}
          />
        </SettingsRow>
        <SettingsRow
          title={t("Needs input or approval")}
          description={t("Notify when input is needed to continue.")}
        >
          <SettingsSwitch
            checked={notificationPreferences.attentionNeeded}
            label={t("Needs input or approval")}
            onChange={(checked) => onSetNotificationPreferences({ attentionNeeded: checked })}
          />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}

function labelForPermissionStatus(status: DesktopNotificationPermissionStatus): string {
  switch (status) {
    case "granted":
      return t("Enabled");
    case "denied":
      return t("Turned off");
    case "default":
      return t("Not enabled yet");
    case "unsupported":
      return t("Unavailable");
    default:
      return t("Checking…");
  }
}

function descriptionForPermissionStatus(status: DesktopNotificationPermissionStatus): string {
  switch (status) {
    case "granted":
      return t(
        "macOS will allow pi-gui to show desktop notifications for background thread updates.",
      );
    case "denied":
      return t(
        "macOS notifications are turned off for pi-gui. Enable them in System Settings to receive background completion alerts.",
      );
    case "default":
      return t("pi-gui has not asked macOS for desktop notification access yet.");
    case "unsupported":
      return t("Desktop notifications are unavailable on this system.");
    default:
      return t("Checking whether macOS notifications are available for pi-gui.");
  }
}
