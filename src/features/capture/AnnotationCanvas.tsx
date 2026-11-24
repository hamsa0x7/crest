import { useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowUpRight,
  Check,
  Circle,
  HighlighterCircle,
  NumberCircleOne,
  Square,
  TextT,
  X,
  Sparkle,
} from "../../ui/iconset";
import { capture } from "../../platform/services";
import { activeAnnotation, closeAnnotation } from "./annotationStore";
import { libraryEpoch } from "./store";
import { t } from "../../i18n";
import { Button } from "../../ui/controls";

type Tool = "arrow" | "text" | "rect" | "circle" | "counter" | "highlighter" | "pixelate";

const COLORS = [
  { label: "Rot", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Grün", value: "#22c55e" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blau", value: "#3b82f6" },
  { label: "Weiß", value: "#ffffff" },
  { label: "Schwarz", value: "#000000" },
];

export function AnnotationCanvas() {
  const target = activeAnnotation.use();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [stepCounter, setStepCounter] = useState(1);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null);
  const [inputText, setInputText] = useState("");

  const isDrawing = useRef(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const snapshotBeforeDrag = useRef<ImageData | null>(null);

  // Load and render target image on canvas
  useEffect(() => {
    if (!target) return;
    let alive = true;

    async function load() {
      if (!target) return;
      let src = target.thumb ?? "";
      try {
        const full = await capture.readImage(target.path);
        if (full) src = full;
      } catch {
        // fallback to thumb
      }

      if (!alive || !src) return;
      const img = new Image();
      img.onload = () => {
        if (!alive || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initial]);
      };
      img.src = src;
    }

    void load();
    return () => {
      alive = false;
    };
  }, [target]);

  const saveHistorySnapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), current]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const nextHistory = [...history];
    nextHistory.pop(); // remove current
    const previous = nextHistory[nextHistory.length - 1];
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      setHistory(nextHistory);
    }
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Pixelate redaction mosaic filter (8x8 blocks)
  const applyPixelate = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const rx = Math.max(0, Math.floor(Math.min(x, x + w)));
    const ry = Math.max(0, Math.floor(Math.min(y, y + h)));
    const rw = Math.min(ctx.canvas.width - rx, Math.floor(Math.abs(w)));
    const rh = Math.min(ctx.canvas.height - ry, Math.floor(Math.abs(h)));
    if (rw <= 0 || rh <= 0) return;

    const blockSize = 8;
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;

    for (let by = 0; by < rh; by += blockSize) {
      for (let bx = 0; bx < rw; bx += blockSize) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        const bh = Math.min(blockSize, rh - by);
        const bw = Math.min(blockSize, rw - bx);

        for (let py = 0; py < bh; py++) {
          for (let px = 0; px < bw; px++) {
            const idx = ((by + py) * rw + (bx + px)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          a = Math.round(a / count);

          for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
              const idx = ((by + py) * rw + (bx + px)) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, rx, ry);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const pos = getCanvasCoords(e);
    startPos.current = pos;
    isDrawing.current = true;
    snapshotBeforeDrag.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === "counter") {
      // Step counter stamp: draws circled step number
      const radius = 14;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.fillStyle = color === "#ffffff" ? "#000000" : "#ffffff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(stepCounter), pos.x, pos.y + 0.5);
      ctx.restore();

      setStepCounter((c) => c + 1);
      saveHistorySnapshot();
      isDrawing.current = false;
    } else if (tool === "text") {
      setTextPrompt({ x: pos.x, y: pos.y });
      isDrawing.current = false;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !snapshotBeforeDrag.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const pos = getCanvasCoords(e);
    // Restore clean snapshot before rendering live preview
    ctx.putImageData(snapshotBeforeDrag.current, 0, 0);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const sx = startPos.current.x;
    const sy = startPos.current.y;
    const dx = pos.x - sx;
    const dy = pos.y - sy;

    if (tool === "arrow") {
      // Draw arrow line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(dy, dx);
      const headLength = Math.max(14, strokeWidth * 3);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(
        pos.x - headLength * Math.cos(angle - Math.PI / 6),
        pos.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        pos.x - headLength * Math.cos(angle + Math.PI / 6),
        pos.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (tool === "rect") {
      ctx.beginPath();
      ctx.strokeRect(sx, sy, dx, dy);
    } else if (tool === "circle") {
      ctx.beginPath();
      const radiusX = Math.abs(dx) / 2;
      const radiusY = Math.abs(dy) / 2;
      const centerX = sx + dx / 2;
      const centerY = sy + dy / 2;
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === "highlighter") {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(16, strokeWidth * 4);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "pixelate") {
      // Show pixelation selection box preview
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(sx, sy, dx, dy);
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(sx + 1, sy + 1, dx, dy);
    }

    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || !snapshotBeforeDrag.current) return;

    const pos = getCanvasCoords(e);
    const sx = startPos.current.x;
    const sy = startPos.current.y;

    if (tool === "pixelate") {
      // Revert dash preview then apply actual pixel mosaic
      ctx.putImageData(snapshotBeforeDrag.current, 0, 0);
      applyPixelate(ctx, sx, sy, pos.x - sx, pos.y - sy);
    }

    saveHistorySnapshot();
    snapshotBeforeDrag.current = null;
  };

  const confirmText = () => {
    if (!textPrompt || !inputText.trim()) {
      setTextPrompt(null);
      setInputText("");
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (canvas && ctx) {
      ctx.save();
      ctx.font = "bold 15px system-ui, sans-serif";
      const metrics = ctx.measureText(inputText);
      const padding = 6;
      const textH = 18;

      // Dark translucent pill backdrop
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.beginPath();
      ctx.roundRect(
        textPrompt.x - padding,
        textPrompt.y - textH + 2,
        metrics.width + padding * 2,
        textH + padding,
        6
      );
      ctx.fill();

      // Foreground text
      ctx.fillStyle = color;
      ctx.fillText(inputText, textPrompt.x, textPrompt.y);
      ctx.restore();
      saveHistorySnapshot();
    }
    setTextPrompt(null);
    setInputText("");
  };

  const handleSaveAndCopy = async () => {
    if (!target || !canvasRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      await capture.saveImage(target.path, dataUrl);
      libraryEpoch.set((n) => n + 1);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
        closeAnnotation();
      }, 700);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md overflow-hidden select-none"
    >
      {/* Floating Markup Toolbar */}
      <div className="flex h-12 w-full shrink-0 items-center justify-between border-b border-separator/60 px-4 bg-fill-1/90">
        <div className="flex items-center gap-1">
          <ToolButton
            active={tool === "arrow"}
            icon={ArrowUpRight}
            label={t("Pfeil")}
            onClick={() => setTool("arrow")}
          />
          <ToolButton
            active={tool === "rect"}
            icon={Square}
            label={t("Rechteck")}
            onClick={() => setTool("rect")}
          />
          <ToolButton
            active={tool === "circle"}
            icon={Circle}
            label={t("Kreis")}
            onClick={() => setTool("circle")}
          />
          <ToolButton
            active={tool === "text"}
            icon={TextT}
            label={t("Text")}
            onClick={() => setTool("text")}
          />
          <ToolButton
            active={tool === "counter"}
            icon={NumberCircleOne}
            label={t("Schrittzähler ① ② ③")}
            badge={tool === "counter" ? String(stepCounter) : undefined}
            onClick={() => setTool("counter")}
          />
          <ToolButton
            active={tool === "highlighter"}
            icon={HighlighterCircle}
            label={t("Textmarker")}
            onClick={() => setTool("highlighter")}
          />
          <ToolButton
            active={tool === "pixelate"}
            icon={Sparkle}
            label={t("Sensible Daten verpixeln")}
            onClick={() => setTool("pixelate")}
          />

          <div className="mx-2 h-4 w-[1px] bg-separator/80" />

          {/* Color picker */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setColor(c.value)}
                className={`size-4 rounded-full border transition-transform ${
                  color === c.value ? "scale-125 border-white ring-1 ring-white" : "border-transparent opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          <div className="mx-2 h-4 w-[1px] bg-separator/80" />

          {/* Stroke width */}
          <div className="flex items-center gap-1 text-caption text-label-2 font-medium">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`flex size-6 items-center justify-center rounded-[6px] ${
                  strokeWidth === w ? "bg-secondary-container text-on-secondary-container" : "text-label-3 hover:text-label-2"
                }`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: w + 1, height: w + 1 }}
                />
              </button>
            ))}
          </div>

          <div className="mx-2 h-4 w-[1px] bg-separator/80" />

          <button
            title={t("Rückgängig")}
            disabled={history.length <= 1}
            onClick={undo}
            className="pressable flex size-7 items-center justify-center rounded-full text-label-3 hover:text-label disabled:opacity-30"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button icon={X} onClick={closeAnnotation}>
            {t("Abbrechen")}
          </Button>
          <Button primary icon={Check} disabled={saving} onClick={() => void handleSaveAndCopy()}>
            {copied ? t("Kopiert!") : saving ? t("Speichert …") : t("Speichern & Kopieren")}
          </Button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="max-h-full max-w-full rounded-[8px] shadow-2xl cursor-crosshair touch-none object-contain border border-separator/40"
        />

        {/* Inline text entry dialog */}
        {textPrompt && (
          <div
            className="absolute z-20 flex items-center gap-1 rounded-full bg-elevated/95 p-1 shadow-xl border border-separator"
            style={{
              left: Math.min(window.innerWidth - 240, Math.max(20, textPrompt.x)),
              top: Math.max(20, textPrompt.y - 45),
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder={t("Text eingeben …")}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmText();
                if (e.key === "Escape") setTextPrompt(null);
              }}
              className="w-40 bg-transparent px-2 text-footnote text-label outline-none placeholder:text-label-4"
            />
            <button
              onClick={confirmText}
              className="flex size-6 items-center justify-center rounded-full bg-accent text-white"
            >
              <Check size={12} weight="bold" />
            </button>
            <button
              onClick={() => setTextPrompt(null)}
              className="flex size-6 items-center justify-center rounded-full text-label-3 hover:text-label"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  active,
  icon: I,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ size: number; weight: "bold" | "fill" }>;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`pressable relative flex h-7 items-center gap-1 rounded-full px-2.5 text-caption font-medium transition-colors ${
        active ? "bg-secondary-container text-on-secondary-container font-semibold shadow-sm" : "text-label-3 hover:text-label-2"
      }`}
    >
      <I size={14} weight={active ? "fill" : "bold"} />
      <span className="hidden sm:inline">{label}</span>
      {badge && (
        <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
