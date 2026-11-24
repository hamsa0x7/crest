import { CircleDashed } from "@phosphor-icons/react";
import { registerExtension, type NativeExtension } from "../registry";

export const SatelliteBubbleExtension: NativeExtension = {
  id: "satellite-bubble",
  name: "Satellite Bubble",
  description: "Detached circular satellite activity bubble and hover peek secondary presentation HUD.",
  kind: "overlay",
  icon: CircleDashed,
  hue: "violet",
  enabledByDefault: true,
};

registerExtension(SatelliteBubbleExtension);
