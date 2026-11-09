import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LockSimple,
  LockSimpleOpen,
  Moon,
  ArrowCounterClockwise,
  PushPin,
  GearSix,
  Check,
} from "@phosphor-icons/react";
import { t } from "../i18n";
import { popover } from "../design/motion";
import { display } from "../platform/services";
import { settings, updateSettings } from "../settings/store";
import { notchLocked, toggleLock } from "./lock";
import { snoozeCrest } from "./snooze";

export interface NotchContextMenuProps {
  x: number;
  y: number;
  currentTabId: string;
  onClose: () => void;
  onOpenSettings: () => void;
}

const MENU_WIDTH = 250;
const MENU_ESTIMATED_HEIGHT = 200;
const PADDING = 8;

export function NotchContextMenu({
  x,
  y,
  currentTabId,
  onClose,
  onOpenSettings,
}: NotchContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isLocked = notchLocked.use();
  const displaySettings = settings.use().display;
  const isCurrentDefault = displaySettings.defaultTab === currentTabId;

  const [restored, setRestored] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Position clamped within window bounds
  const left = Math.max(
    PADDING,
    Math.min(x, window.innerWidth - MENU_WIDTH - PADDING),
  );
  const up = y + MENU_ESTIMATED_HEIGHT > window.innerHeight - PADDING;
  const top = up ? undefined : Math.max(PADDING, y);
  const bottom = up ? window.innerHeight - y : undefined;

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose]);

  const handleToggleLock = () => {
    toggleLock();
    onClose();
  };

  const handleSnooze = async () => {
    onClose();
    await snoozeCrest(60);
  };

  const handleRestoreTaskbar = async () => {
    setRestored(true);
    await display.taskbarRestore();
    window.setTimeout(() => {
      setRestored(false);
      onClose();
    }, 900);
  };

  const handleSetDefaultTab = () => {
    const nextTab = isCurrentDefault ? "" : currentTabId;
    updateSettings((cur) => ({
      display: {
        ...cur.display,
        defaultTab: nextTab,
      },
    }));
    setPinned(true);
    window.setTimeout(() => {
      setPinned(false);
      onClose();
    }, 700);
  };

  const handleOpenSettings = () => {
    onClose();
    onOpenSettings();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        data-notch-menu
        className="pointer-events-auto fixed z-[70] w-[250px] overflow-hidden rounded-[10px] bg-elevated p-1 shadow-[0_10px_30px_rgb(0_0_0/0.6)] ring-1 ring-separator select-none"
        style={{
          left,
          top,
          bottom,
          transformOrigin: up ? "50% 100%" : "50% 0",
        }}
        initial={{ opacity: 0, transform: `scale(0.96) translateY(${up ? 4 : -4}px)` }}
        animate={{ opacity: 1, transform: "scale(1) translateY(0px)", transition: popover.enter }}
        exit={{ opacity: 0, transform: "scale(0.98)", transition: popover.exit }}
      >
        {/* 1. Lock / Unlock Notch */}
        <button
          type="button"
          onClick={handleToggleLock}
          className="pressable flex h-8 w-full items-center justify-between rounded-[6px] px-2 text-footnote text-label hover:bg-fill-2 transition-colors"
        >
          <span className="flex items-center gap-2">
            {isLocked ? (
              <LockSimpleOpen size={14} weight="bold" className="shrink-0 text-accent" />
            ) : (
              <LockSimple size={14} weight="bold" className="shrink-0 text-label-2" />
            )}
            <span>{isLocked ? t("Kerbe entsperren") : t("Kerbe sperren")}</span>
          </span>
          <span className="text-caption font-medium text-label-3">Ctrl+Alt+L</span>
        </button>

        {/* 2. Snooze Crest for 1 Hour */}
        <button
          type="button"
          onClick={() => void handleSnooze()}
          className="pressable flex h-8 w-full items-center justify-between rounded-[6px] px-2 text-footnote text-label hover:bg-fill-2 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Moon size={14} weight="bold" className="shrink-0 text-label-2" />
            <span>{t("Crest für 1 Stunde pausieren")}</span>
          </span>
          <span className="text-caption text-label-3">1h</span>
        </button>

        {/* 3. Emergency Taskbar & System Tray Restore */}
        <button
          type="button"
          onClick={() => void handleRestoreTaskbar()}
          className="pressable flex h-8 w-full items-center justify-between rounded-[6px] px-2 text-footnote text-label hover:bg-fill-2 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ArrowCounterClockwise
              size={14}
              weight="bold"
              className={`shrink-0 ${restored ? "text-green" : "text-label-2"}`}
            />
            <span>
              {restored ? t("Taskleiste wiederhergestellt") : t("Taskleiste wiederherstellen")}
            </span>
          </span>
          {restored && <Check size={12} weight="bold" className="text-green" />}
        </button>

        {/* 4. Set Current Tab as Default Opening Tab */}
        <button
          type="button"
          onClick={handleSetDefaultTab}
          className="pressable flex h-8 w-full items-center justify-between rounded-[6px] px-2 text-footnote text-label hover:bg-fill-2 transition-colors"
        >
          <span className="flex items-center gap-2">
            <PushPin
              size={14}
              weight={isCurrentDefault ? "fill" : "bold"}
              className={`shrink-0 ${isCurrentDefault ? "text-accent" : "text-label-2"}`}
            />
            <span>{t("Als Start-Tab festlegen")}</span>
          </span>
          {(isCurrentDefault || pinned) && (
            <Check size={12} weight="bold" className="text-accent" />
          )}
        </button>

        <div className="my-1 h-[1px] bg-separator" />

        {/* 5. Open Settings... */}
        <button
          type="button"
          onClick={handleOpenSettings}
          className="pressable flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-footnote text-label hover:bg-fill-2 transition-colors"
        >
          <GearSix size={14} weight="bold" className="shrink-0 text-label-2" />
          <span>{t("Einstellungen …")}</span>
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
