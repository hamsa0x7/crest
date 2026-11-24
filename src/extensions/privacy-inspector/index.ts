import { ShieldCheck } from "@phosphor-icons/react";
import { registerExtension, type NativeExtension } from "../registry";

export const PrivacyInspectorExtension: NativeExtension = {
  id: "privacy-inspector",
  name: "Privacy Inspector",
  description: "Interactive hardware privacy indicator with live process inspector and system diagnostics.",
  kind: "service",
  icon: ShieldCheck,
  hue: "emerald",
  enabledByDefault: true,
};

registerExtension(PrivacyInspectorExtension);
