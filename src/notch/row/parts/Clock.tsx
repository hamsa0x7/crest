import { useEffect, useState } from "react";
import { useSecondTick } from "../../../features/timer/store";
import { locale } from "../../../i18n";
import { measureText } from "../measure";
import { defaultZoneAbbrev, formatClock, isZone, wallTime } from "../../../features/clocks/zones";

/** The time as the language writes it, with its own digits and day period. */
const format = (seconds: boolean, h12: boolean) =>
  new Intl.DateTimeFormat(locale(), { hour: h12 ? "numeric" : "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hourCycle: h12 ? "h12" : "h23" });

/** Fixed room: a two-digit hour, and the wider of the morning and the evening on a 12 h clock. */
export function clockWidth(seconds: boolean, h12: boolean, secondZone?: string | null, secondLabel?: string): number {
  const f = format(seconds, h12);
  // Digits are tabular, each as wide as an 8 (in the language's own numerals), which the canvas does not know.
  const eight = f.format(new Date(2000, 0, 1, 8, 8, 8)).match(/\p{Nd}/gu)!.at(-1)!;
  const baseWidth = Math.max(...[10, 22].map((h) => measureText(f.format(new Date(2000, 0, 1, h, 8, 8)).replace(/\p{Nd}/gu, eight))));

  if (secondZone && isZone(secondZone)) {
    const f2 = format(false, h12);
    const eight2 = f2.format(new Date(2000, 0, 1, 8, 8, 8)).match(/\p{Nd}/gu)!.at(-1)!;
    const secondWidth = Math.max(...[10, 22].map((h) => measureText(f2.format(new Date(2000, 0, 1, h, 8, 8)).replace(/\p{Nd}/gu, eight2))));
    const label = (secondLabel && secondLabel.trim()) || defaultZoneAbbrev(secondZone);
    const labelWidth = measureText(label);
    return Math.ceil(baseWidth + 10 + measureText("·") + labelWidth + 4 + secondWidth);
  }

  return baseWidth;
}

/** Re-renders once a minute, 50 ms after it turns. */
function useMinuteTick(active: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const next = () => {
      const t = Date.now();
      setNow(t);
      id = window.setTimeout(next, 60_000 - (t % 60_000) + 50);
    };
    next();
    return () => window.clearTimeout(id);
  }, [active]);
  return now;
}

/** `paused` (under a notice) stops the ticking; it catches up on the first tick after. */
export function Clock({
  seconds,
  h12,
  paused,
  secondZone,
  secondLabel,
}: {
  seconds: boolean;
  h12: boolean;
  paused: boolean;
  secondZone?: string | null;
  secondLabel?: string;
}) {
  const minute = useMinuteTick(!seconds && !paused);
  const second = useSecondTick(seconds && !paused);
  const curMs = seconds ? second : minute;
  const time = format(seconds, h12).format(curMs);

  const hasSecond = Boolean(secondZone && isZone(secondZone));
  const secondTime = hasSecond ? formatClock(wallTime(curMs, secondZone!), locale(), h12) : null;
  const label = hasSecond ? ((secondLabel && secondLabel.trim()) || defaultZoneAbbrev(secondZone!)) : null;

  return (
    <span
      className="tabular inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-footnote font-medium text-label"
      style={{ width: clockWidth(seconds, h12, secondZone, secondLabel) }}
    >
      <span>{time}</span>
      {hasSecond && (
        <>
          <span className="text-label-4 select-none">·</span>
          <span className="text-[10px] uppercase font-semibold text-label-3 tracking-wider">{label}</span>
          <span className="text-label-2">{secondTime}</span>
        </>
      )}
    </span>
  );
}
