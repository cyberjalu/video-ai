import { Suspense } from "react";
import SettingsForm from "./SettingsForm";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-400">Loading settings…</div>}>
      <SettingsForm />
    </Suspense>
  );
}
