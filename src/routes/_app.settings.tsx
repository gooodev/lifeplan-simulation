import { createFileRoute } from "@tanstack/react-router";
import { SettingsTab } from "@/ui/SettingsTab";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsTab,
});
