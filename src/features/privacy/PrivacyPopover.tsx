import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Microphone,
  MicrophoneSlash,
  Monitor,
  ShieldCheck,
  Stop,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { popover } from "../../design/motion";
import { t } from "../../i18n";
import { capture, systemControls, type QuickState } from "../../platform/services";
import { discordState } from "../discord/store";
import { privacy, togglePresentation, usePresenting } from "./store";
import { Button } from "../../ui/controls";

interface Props {
  open: boolean;
  onClose: () => void;
  triggerRect: DOMRect | null;
}

export function PrivacyPopover({ open, onClose, triggerRect }: Props) {
  const p = privacy.use();
  const call = discordState.use().call;
  const presenting = usePresenting();
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [recPhase, setRecPhase] = useState<string>("idle");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Poll mic mute and screen capture state while open
  useEffect(() => {
    if (!open) return;
    void systemControls.quick().then((q: QuickState | null) => {
      if (q && typeof q.micMuted === "boolean") setMicMuted(q.micMuted);
    });
    void capture.state().then((cs) => {
      if (cs) setRecPhase(cs.phase);
    });
  }, [open]);

  // Click outside and Esc key dismissal
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const hasMic = p.mic || !!call;
  const hasCamera = p.camera;
  const hasScreen = p.screen || recPhase === "recording" || presenting;

  const micAppList = p.mic_apps && p.mic_apps.length > 0
    ? p.mic_apps.join(", ")
    : call
      ? "Discord"
      : t("Aktive Anwendung");

  const cameraAppList = p.camera_apps && p.camera_apps.length > 0
    ? p.camera_apps.join(", ")
    : t("Aktive Anwendung");

  const screenAppList = p.screen_apps && p.screen_apps.length > 0
    ? p.screen_apps.join(", ")
    : recPhase === "recording"
      ? "Crest"
      : t("Aktive Anwendung");

  const toggleMicMute = async () => {
    const next = !micMuted;
    try {
      await systemControls.setMicMuted(next);
      setMicMuted(next);
    } catch {
      // Revert if rejected
    }
  };

  const stopScreenCapture = async () => {
    if (recPhase === "recording") {
      await capture.stop();
      setRecPhase("idle");
    } else if (presenting) {
      togglePresentation();
    }
  };

  // Compute position centered below trigger
  const left = triggerRect
    ? Math.max(12, Math.min(window.innerWidth - 300, triggerRect.left + triggerRect.width / 2 - 140))
    : window.innerWidth / 2 - 140;
  const top = triggerRect ? triggerRect.bottom + 8 : 40;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          data-notch-menu
          role="dialog"
          aria-label={t("Sensor-Aktivität")}
          className="pointer-events-auto fixed z-[70] w-[280px] rounded-[16px] bg-elevated p-3 shadow-[0_12px_36px_rgb(0_0_0/0.65)] ring-1 ring-separator [scrollbar-width:none]"
          style={{ left, top }}
          initial={{ opacity: 0, transform: "scale(0.95) translateY(-4px)" }}
          animate={{ opacity: 1, transform: "scale(1) translateY(0px)", transition: popover.enter }}
          exit={{ opacity: 0, transform: "scale(0.95) translateY(-4px)", transition: popover.exit }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-separator">
            <div className="flex items-center gap-1.5 font-medium text-footnote text-label">
              <ShieldCheck size={16} weight="bold" className="text-green" />
              <span>{t("Sensor-Aktivität")}</span>
            </div>
            <button
              onClick={onClose}
              className="pressable rounded-[6px] p-1 text-label-3 hover:text-label hover:bg-fill-2 transition-colors"
              aria-label={t("Schließen")}
            >
              <X size={12} weight="bold" />
            </button>
          </div>

          {/* Sensors List */}
          <div className="divide-y divide-separator pt-1">
            {/* Microphone */}
            {hasMic && (
              <div className="py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green/15 text-green">
                      <Microphone size={13} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-footnote font-medium text-label truncate">
                        {t("Mikrofon")}
                      </div>
                      <div className="text-caption text-label-2 truncate" title={micAppList}>
                        {micAppList}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => void toggleMicMute()}
                    icon={micMuted ? MicrophoneSlash : Microphone}
                  >
                    {micMuted ? t("Stumm aus") : t("Stumm")}
                  </Button>
                </div>
              </div>
            )}

            {/* Camera */}
            {hasCamera && (
              <div className="py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green/15 text-green">
                      <VideoCamera size={13} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-footnote font-medium text-label truncate">
                        {t("Kamera")}
                      </div>
                      <div className="text-caption text-label-2 truncate" title={cameraAppList}>
                        {cameraAppList}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Screen */}
            {hasScreen && (
              <div className="py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red/15 text-red">
                      <Monitor size={13} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-footnote font-medium text-label truncate">
                        {t("Bildschirm")}
                      </div>
                      <div className="text-caption text-label-2 truncate" title={screenAppList}>
                        {screenAppList}
                      </div>
                    </div>
                  </div>
                  {(recPhase === "recording" || presenting) && (
                    <Button
                      onClick={() => void stopScreenCapture()}
                      icon={Stop}
                    >
                      {recPhase === "recording" ? t("Stoppen") : t("Beenden")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!hasMic && !hasCamera && !hasScreen && (
              <div className="py-4 text-center text-caption text-label-3">
                {t("Keine Sensoren aktiv")}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
