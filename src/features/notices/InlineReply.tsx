import { useEffect, useRef, useState } from "react";
import { ChatTeardropText, PaperPlaneRight, X, Check } from "@phosphor-icons/react";
import { t } from "../../i18n";
import { noticeHover } from "../../notch/useNotchState";
import { noticeSource } from "../../platform/services";
import { holdPop, dismissPop } from "./store";
import { sendInlineReply } from "./chat";
import type { Notice } from "./history";

export const REPLY_COLLAPSED_WIDTH = 84;
export const REPLY_EXPANDED_WIDTH = 220;

export function InlineReplyButton({ n }: { n: Notice }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      holdPop(true);
      noticeHover.set(true);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        window.clearTimeout(timer);
        holdPop(false);
        noticeHover.set(false);
      };
    }
  }, [open]);

  const handleSend = async () => {
    if (!text.trim() || sent) return;
    setSent(true);
    await sendInlineReply(n.appName, n.appId, text, (val) => noticeSource.copyCode(val));
    window.setTimeout(() => {
      dismissPop();
    }, 1200);
  };

  const handleCancel = () => {
    setOpen(false);
    setText("");
    holdPop(false);
  };

  if (sent) {
    return (
      <span className="flex h-[22px] items-center gap-1 rounded-full bg-green/20 px-2 text-caption font-semibold text-green">
        <Check size={12} weight="bold" />
        <span>{t("Gesendet")}</span>
      </span>
    );
  }

  if (open) {
    return (
      <div
        className="pointer-events-auto flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          placeholder={t("Antworten …")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") void handleSend();
            else if (e.key === "Escape") handleCancel();
          }}
          className="h-[24px] w-36 rounded-[6px] bg-fill-2 px-2 text-footnote text-label placeholder:text-label-4 outline-none ring-1 ring-separator focus:ring-accent"
        />
        <button
          type="button"
          aria-label={t("Senden")}
          title={t("Senden")}
          onClick={() => void handleSend()}
          className="pressable flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:opacity-90"
        >
          <PaperPlaneRight size={12} weight="bold" />
        </button>
        <button
          type="button"
          aria-label={t("Abbrechen")}
          title={t("Abbrechen")}
          onClick={handleCancel}
          className="pressable flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-fill-2 text-label-3 transition hover:bg-fill-3 hover:text-label"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={t("Antworten")}
      title={t("Antworten")}
      className="pressable pointer-events-auto flex h-[22px] shrink-0 items-center gap-1 rounded-full bg-fill-2 px-2 text-label-2 transition hover:bg-fill-3 hover:text-label"
      onPointerEnter={() => noticeHover.set(true)}
      onPointerLeave={() => noticeHover.set(false)}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
    >
      <ChatTeardropText size={12} weight="bold" />
      <span className="text-caption font-medium">{t("Antworten")}</span>
    </button>
  );
}
