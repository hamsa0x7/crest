import { useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from "react";
import { dampenDrag, evaluateFlick } from "./gestureDismiss";

export interface GestureNoticeProps {
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Gesture dismiss wrapper adapted 1:1 from ding's pointer drag/flick physics.
 * Allows swiping or flicking notices off the notch toward the top bezel or sideways.
 * Buttons and interactive inputs inside the notice are not intercepted.
 */
export function GestureNotice({ children, onDismiss, className, style }: GestureNoticeProps) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [flung, setFlung] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<{ x: number; y: number; time: number; active: boolean } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, input, a, [role='button'], textarea")) return;
    startRef.current = { x: e.clientX, y: e.clientY, time: e.timeStamp, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current?.active) return;
    const dx = e.clientX - startRef.current.x;
    const rawDy = e.clientY - startRef.current.y;
    const dy = dampenDrag(rawDy, -1);
    setDrag({ x: dx, y: dy });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current?.active) return;
    const { x: sx, y: sy, time: st } = startRef.current;
    startRef.current = null;
    const dx = e.clientX - sx;
    const rawDy = e.clientY - sy;
    const flick = evaluateFlick({ dx, dy: rawDy, dt: e.timeStamp - st, edge: -1 });

    if (flick.away && onDismiss) {
      setFlung({ x: flick.flingX, y: flick.flingY });
      window.setTimeout(onDismiss, 160);
    } else {
      setDrag(null);
    }
  };

  const transform = flung
    ? `translate3d(${flung.x}px, ${flung.y}px, 0)`
    : drag
    ? `translate3d(${drag.x}px, ${drag.y}px, 0)`
    : "none";

  const transition = flung
    ? "transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.18s ease-out"
    : drag
    ? "none"
    : "transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)";

  return (
    <div
      className={`pointer-events-auto select-none touch-none ${className ?? ""}`}
      style={{
        ...style,
        transform,
        transition,
        opacity: flung ? 0 : 1,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  );
}
