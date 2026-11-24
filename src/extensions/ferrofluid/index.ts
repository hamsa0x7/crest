import { Waves } from "@phosphor-icons/react";
import { registerExtension, type NativeExtension } from "../registry";

export const FerrofluidExtension: NativeExtension = {
  id: "ferrofluid",
  name: "Liquid Island Physics",
  description: "Ferrofluid liquid dynamics, audio frequency spikes, and black hole charging gravitational effects.",
  kind: "overlay",
  icon: Waves,
  hue: "cyan",
  enabledByDefault: true,
};

registerExtension(FerrofluidExtension);
