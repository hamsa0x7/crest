import type { Icon } from "@phosphor-icons/react";
import { Group, Row, Switch } from "../../ui/controls";
import { t } from "../../i18n";
import {
  getAllExtensions,
  isExtensionEnabled,
  setExtensionEnabled,
  extensionStore,
} from "../../extensions";

export function ExtensionsSettings() {
  // Re-render when any extension toggle changes
  extensionStore.use();
  const allExtensions = getAllExtensions();

  return (
    <Group title={t("Native Erweiterungen")} id="settings-extensions">
      <Row
        label={t("Modulare Erweiterungen")}
        hint={t("Aktiviere oder deaktiviere native Funktionen unabhängig voneinander")}
      />
      {allExtensions.map((ext) => {
        const enabled = isExtensionEnabled(ext.id);
        const IconComp = ext.icon as Icon;
        return (
          <Row
            key={ext.id}
            label={
              <span className="flex items-center gap-2">
                {IconComp && <IconComp size={15} weight="bold" className={enabled ? "text-label-2" : "text-label-4"} />}
                <span>{t(ext.name)}</span>
              </span>
            }
            hint={
              ext.overrides
                ? `${t(ext.description)} (${t("Ersetzt")} ${ext.overrides})`
                : t(ext.description)
            }
          >
            <div className="flex items-center gap-3">
              <Switch
                label={t(ext.name)}
                checked={enabled}
                onChange={(checked) => setExtensionEnabled(ext.id, checked)}
              />
            </div>
          </Row>
        );
      })}
    </Group>
  );
}
