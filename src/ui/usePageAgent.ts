import { useEffect, useRef } from "react";
import type { PageAgent } from "page-agent";
import { GEMINI_OPENAI_BASE_URL, PAGE_AGENT_LANGUAGE } from "@/lib/pageAgent";
import type { PageAgentSettings } from "@/store/collections";

/**
 * settings（Gemini APIキー・モデル）に応じて PageAgent インスタンスを生成・破棄する。
 * ビルド時のプリレンダー（SSRなしのHTML生成）に影響しないよう、page-agent はブラウザ側で
 * このフックの中でのみ動的importする。
 */
export function usePageAgent(settings: PageAgentSettings): {
  show: () => void;
  configured: boolean;
} {
  const agentRef = useRef<PageAgent | null>(null);
  const configured = settings.enabled && settings.apiKey.trim() !== "";

  useEffect(() => {
    if (!configured) {
      return;
    }

    let cancelled = false;
    void import("page-agent")
      .then(({ PageAgent }) => {
        if (cancelled) {
          return;
        }
        agentRef.current = new PageAgent({
          baseURL: GEMINI_OPENAI_BASE_URL,
          apiKey: settings.apiKey,
          model: settings.model,
          language: PAGE_AGENT_LANGUAGE,
        });
      })
      .catch((error: unknown) => {
        console.error("PageAgentの初期化に失敗しました", error);
      });

    return () => {
      cancelled = true;
      agentRef.current?.dispose();
      agentRef.current = null;
    };
  }, [configured, settings.apiKey, settings.model]);

  return {
    show: () => agentRef.current?.panel.show(),
    configured,
  };
}
