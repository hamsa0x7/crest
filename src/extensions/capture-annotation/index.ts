import { PaintBrush } from "../../ui/iconset";
import { registerExtension, type NativeExtension } from "../registry";
import { AnnotationCanvas } from "../../features/capture/AnnotationCanvas";

export const CaptureAnnotationExtension: NativeExtension = {
  id: "capture-annotation",
  name: "Capture & Annotate",
  description: "Desktop screenshot decision card with 24h staging shelf and instant markup annotation toolbar.",
  kind: "overlay",
  icon: PaintBrush,
  hue: "cyan",
  Overlay: AnnotationCanvas,
  enabledByDefault: true,
};

registerExtension(CaptureAnnotationExtension);
