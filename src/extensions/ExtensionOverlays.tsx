import { type ComponentType, type ReactNode } from "react";
import { extensionStore, getAllExtensions, isExtensionEnabled } from "./registry";

/** Unified component rendering all active overlay extensions inside the Notch shell */
export function ExtensionOverlays(): ReactNode {
  extensionStore.use(); // Trigger re-render on toggle
  const activeOverlays = getAllExtensions().filter(
    (ext) => ext.kind === "overlay" && ext.Overlay && isExtensionEnabled(ext.id),
  );
  if (activeOverlays.length === 0) return null;
  return (
    <>
      {activeOverlays.map((ext) => {
        const OverlayComp = ext.Overlay as ComponentType;
        return <OverlayComp key={ext.id} />;
      })}
    </>
  );
}
