import { t, i18n } from "../../../i18n";
import { useLocale } from "../../ui/use-locale";
import { useEffect, useId, useState } from "react";
import type {
  SessionPlanLimit,
  SessionPromptCache,
  SessionUsageSnapshot,
} from "@pi-gui/session-driver";

interface ContextMeterProps {
  readonly usage: SessionUsageSnapshot | undefined;
}

const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Codex-style context ring beside the model picker. Hovering or focusing it
 * opens a card with pi's context, prompt-cache, plan-limit and thread usage.
 */
export function ContextMeter({ usage }: ContextMeterProps) {
  useLocale();
  const [open, setOpen] = useState(false);
  const cardId = useId();
  const now = useNow(open && hasCountdown(usage));
  const context = usage?.context;
  if (!usage || !context) return null;

  const percent = context.tokens === null ? null : (context.tokens / context.contextWindow) * 100;
  const tone =
    percent === null ? "unknown" : percent > 90 ? "danger" : percent > 70 ? "warning" : "normal";
  const label =
    percent === null
      ? t("Context window: usage unknown until the next reply")
      : t("Context window: {{value0}} used", { value0: formatPercent(percent) });

  return (
    <div
      className="context-meter"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="context-meter__ring"
        data-tone={tone}
        aria-label={label}
        aria-describedby={open ? cardId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle className="context-meter__track" cx="8" cy="8" r={RING_RADIUS} />
          <circle
            className="context-meter__fill"
            cx="8"
            cy="8"
            r={RING_RADIUS}
            strokeDasharray={`${(Math.min(percent ?? 0, 100) / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            transform="rotate(-90 8 8)"
          />
        </svg>
      </button>
      {open ? (
        <div className="context-meter__card" id={cardId} role="tooltip">
          <section className="context-meter__section">
            <h3 className="context-meter__heading">{t("Context window")}</h3>
            <p className="context-meter__headline">
              {context.tokens === null || percent === null
                ? t("Unknown until the next reply · {{value0}} window", {
                    value0: formatTokens(context.contextWindow),
                  })
                : t("{{value0}} used · {{value1}} / {{value2}} tokens", {
                    value0: formatPercent(percent),
                    value1: formatTokens(context.tokens),
                    value2: formatTokens(context.contextWindow),
                  })}
            </p>
            <p className="context-meter__note">
              {context.compactAtTokens === undefined
                ? t("Automatic compaction is off")
                : t("Compacts automatically at {{value0}}", {
                    value0: formatPercent((context.compactAtTokens / context.contextWindow) * 100),
                  })}
            </p>
          </section>
          <section className="context-meter__section">
            <h3 className="context-meter__heading">{t("Prompt cache")}</h3>
            {usage.lastTurn ? (
              <Row
                label={t("Last turn")}
                value={t("{{value0}} cached", {
                  value0: formatPercent(cacheHitPercent(usage.lastTurn)),
                })}
              />
            ) : null}
            <CacheRow cache={usage.cache} now={now} />
          </section>
          {usage.planLimits && usage.planLimits.limits.length > 0 ? (
            <section className="context-meter__section">
              <h3 className="context-meter__heading">{t("Plan limits")}</h3>
              {usage.planLimits.limits.map((limit) => (
                <Row
                  key={limit.windowMinutes}
                  label={t("{{value0}} of {{value1}} limit", {
                    value0: formatPercent(limit.usedPercent),
                    value1: windowLabel(limit),
                  })}
                  value={
                    limit.resetsAt
                      ? t("resets in {{value0}}", {
                          value0: formatDuration(Date.parse(limit.resetsAt) - now),
                        })
                      : ""
                  }
                />
              ))}
            </section>
          ) : null}
          <section className="context-meter__section">
            <h3 className="context-meter__heading">{t("This thread")}</h3>
            <Row
              label={t("Input / Output")}
              value={`${formatTokens(usage.totals.input)} / ${formatTokens(usage.totals.output)}`}
            />
            <Row
              label={t("Cache read / write")}
              value={`${formatTokens(usage.totals.cacheRead)} / ${formatTokens(usage.totals.cacheWrite)}`}
            />
            <Row
              label={t("Cost")}
              value={usage.subscription ? t("Subscription") : `$${usage.totals.cost.toFixed(2)}`}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  useLocale();
  return (
    <div className="context-meter__row">
      <span>{label}</span>
      <span className="context-meter__value">{value}</span>
    </div>
  );
}

function CacheRow({ cache, now }: { readonly cache: SessionPromptCache; readonly now: number }) {
  useLocale();
  const nextRefreshIn = cache.nextRefreshAt ? Date.parse(cache.nextRefreshAt) - now : 0;
  if (nextRefreshIn > 0) {
    return (
      <Row
        label={t("Kept warm")}
        value={t("next refresh in {{value0}}", { value0: formatCountdown(nextRefreshIn) })}
      />
    );
  }
  if (!cache.expiresAt) {
    return cache.lifetimeSeconds === undefined ? (
      <Row label={t("Expiry")} value="not reported by this model" />
    ) : (
      <Row label={t("Expiry")} value="nothing cached for this model yet" />
    );
  }
  const expiresIn = Date.parse(cache.expiresAt) - now;
  return expiresIn > 0 ? (
    <Row label={t("Expires in")} value={formatCountdown(expiresIn)} />
  ) : (
    <Row label={t("Expiry")} value="expired, next turn rewrites it" />
  );
}

function hasCountdown(usage: SessionUsageSnapshot | undefined): boolean {
  return Boolean(usage && (usage.cache.expiresAt || usage.cache.nextRefreshAt || usage.planLimits));
}

/** Current time; re-renders every second only while something on screen counts down. */
function useNow(ticking: boolean): number {
  useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [wasTicking, setWasTicking] = useState(ticking);
  if (ticking !== wasTicking) {
    // Read the clock during the render that opens the card, so it never shows a stale countdown.
    setWasTicking(ticking);
    setNow(Date.now());
  }
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  return now;
}

function cacheHitPercent(turn: NonNullable<SessionUsageSnapshot["lastTurn"]>): number {
  const prompt = turn.input + turn.cacheRead + turn.cacheWrite;
  return prompt > 0 ? (turn.cacheRead / prompt) * 100 : 0;
}

function windowLabel(limit: SessionPlanLimit): string {
  if (limit.windowMinutes === 7 * 24 * 60) return "weekly";
  if (limit.windowMinutes === 24 * 60) return "daily";
  if (limit.windowMinutes % 60 === 0)
    return t("{{value0}}-hour", { value0: limit.windowMinutes / 60 });
  return t("{{value0}}-minute", { value0: limit.windowMinutes });
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : Number(millions.toFixed(1))}M`;
  }
  if (count >= 1000) return `${Math.round(count / 1000)}k`;
  return String(count);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** m:ss for the short cache timers. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** Coarse "1 d 16 h" / "2 hr 57 min" for plan-limit resets, like Claude's hover. */
function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t("{{value0}} d {{value1}} h", { value0: days, value1: hours });
  if (hours > 0) return t("{{value0}} hr {{value1}} min", { value0: hours, value1: minutes });
  return t("{{value0}} min", { value0: minutes });
}
