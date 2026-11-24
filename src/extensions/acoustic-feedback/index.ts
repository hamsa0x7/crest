import { SpeakerHigh } from "../../ui/iconset";
import { registerExtension, type NativeExtension } from "../registry";

export const AcousticFeedbackExtension: NativeExtension = {
  id: "acoustic-feedback",
  name: "Acoustic Feedback",
  description: "Synthesized mallet acoustic chimes and low-latency audio feedback on notch actions.",
  kind: "service",
  icon: SpeakerHigh,
  hue: "amber",
  enabledByDefault: true,
};

registerExtension(AcousticFeedbackExtension);
