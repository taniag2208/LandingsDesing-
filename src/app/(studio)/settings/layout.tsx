import { PageHeader } from "@/components/studio/page-header";
import { SettingsTabs } from "@/components/studio/settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Configuración" description="Empresa, equipo, plan y registro de actividad." />
      <SettingsTabs />
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-8 sm:px-8">{children}</div>
    </>
  );
}
