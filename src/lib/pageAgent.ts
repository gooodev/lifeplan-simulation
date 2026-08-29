/**
 * PageAgent（https://github.com/alibaba/page-agent）を Google Gemini API で使うための定数。
 * Gemini は OpenAI 互換エンドポイント経由で呼び出す（Google公式のOpenAI互換API）。
 */
export const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** page-agent が動作確認済みとして案内している Gemini モデル（新しい順）。 */
export const GEMINI_MODEL_OPTIONS = [
  "gemini-3.5-flash",
  "gemini-3.1-pro",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
] as const;

export const DEFAULT_GEMINI_MODEL: (typeof GEMINI_MODEL_OPTIONS)[number] = "gemini-3.5-flash";

/** PageAgentパネルのUI言語。アプリ本体は日本語だが、PageAgent自体は英語表示にする。 */
export const PAGE_AGENT_LANGUAGE = "en-US";
