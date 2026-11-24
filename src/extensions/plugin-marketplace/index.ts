import { Storefront } from "../../ui/iconset";
import { registerExtension, type NativeExtension } from "../registry";
import { MarketplaceView } from "../../features/plugins/MarketplaceView";

export const PluginMarketplaceExtension: NativeExtension = {
  id: "plugin-marketplace",
  name: "Plugin Marketplace",
  description: "Browse, discover, and install community plugins from the official verified catalog.",
  kind: "tool",
  icon: Storefront,
  hue: "purple",
  size: { w: 640, h: 420 },
  View: MarketplaceView,
  enabledByDefault: true,
};

registerExtension(PluginMarketplaceExtension);
