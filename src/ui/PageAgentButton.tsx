import { useEffect, useState } from "react";
import { LuBot } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePageAgentSettings } from "@/store/hooks";
import { usePageAgent } from "@/ui/usePageAgent";

/** ヘッダーに置く、AI操作アシスタント（PageAgent）を呼び出すボタン。設定画面でAPIキーを登録すると使えるようになる。 */
export function PageAgentButton() {
  const settings = usePageAgentSettings();
  const { show, configured } = usePageAgent(settings);
  // SSR/プリレンダー時とクライアントで状態が食い違うのを避けるため、マウント後に描画する（ThemeToggleと同様）。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="AIアシスタント"
          disabled={!configured}
          onClick={show}
        >
          <LuBot />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {configured ? "AIアシスタントを開く" : "設定画面でGemini APIキーを登録すると使えます"}
      </TooltipContent>
    </Tooltip>
  );
}
