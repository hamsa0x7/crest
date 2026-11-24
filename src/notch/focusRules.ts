/** This many quick clicks on the notch toggle focus mode (EXIT_CLICKS in hit_test.rs counts the ones that leave it). */
export const FOCUS_CLICKS = 3;

/**
 * Whether a click series began on the notch: on the closed notch, or on the open panel's header, where the closed notch sits (with Open on
 * hover the panel is often open by the first click). Never on a control or inside a tool, where a triple click selects or presses something.
 */
export function startsOnNotch(open: boolean, onHeader: boolean, interactive: boolean): boolean {
  return !interactive && (!open || onHeader);
}

/**
 * Whether a click toggles focus mode: only with its switch on (display.focusClicks), only in a series that began on the notch, and only
 * on its third click, whatever lies under it by then (on the bottom edge the opening panel puts the dock there). A fourth does nothing.
 */
export function togglesFocus(clicks: number, enabled: boolean, onNotch: boolean): boolean {
  return enabled && onNotch && clicks === FOCUS_CLICKS;
}

/** Whether a click opens the notch: not when it is open already, and in focus mode only on a card, whose click opens the notch and so ends focus mode. */
export function clickOpens(open: boolean, focus: boolean, cardShown: boolean): boolean {
  return !open && (!focus || cardShown);
}

/** In focus mode the closed shape stays the line: with the line look, and with the half transparent one over the idle line, unless a card needs the notch. */
export function focusLine(look: "dim" | "line", idleIsLine: boolean, cardShown: boolean): boolean {
  return look === "line" || (idleIsLine && !cardShown);
}
