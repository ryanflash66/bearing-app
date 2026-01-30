import { SecuritySettings } from "@/components/settings/SecuritySettings";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security</h3>
        <p className="text-sm text-slate-500">
          Manage your account security settings.
        </p>
      </div>
      <div className="h-px bg-slate-200" />
      <SecuritySettings />
    </div>
  );
}
