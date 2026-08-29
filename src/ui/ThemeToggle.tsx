import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LuMonitor, LuMoon, LuSun } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "ライト", icon: LuSun },
  { value: "dark", label: "ダーク", icon: LuMoon },
  { value: "system", label: "システムに合わせる", icon: LuMonitor },
] as const;

/** ライト/ダーク/システム追従を切り替えるトグル。next-themes が localStorage への永続化を担う。 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // SSR/プリレンダー時とクライアントで初期テーマが食い違うのを避けるため、マウント後に描画する。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label="テーマ切替">
        <LuMonitor />
      </Button>
    );
  }

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="テーマ切替">
          <CurrentIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
