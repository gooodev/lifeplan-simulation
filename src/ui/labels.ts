import type { AssetCategory, PersonRole } from "../domain/types";

// カテゴリのラベル・収入/支出の別はユーザーが設定画面で管理する動的なデータになったため、
// 静的な定数はここには置かない。store/hooks.ts の useCategories() 系のフックを使うこと。

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  self: "夫",
  spouse: "妻",
  child: "子",
  other: "その他（親など）",
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: "現金・預金",
  investment: "投資",
  realEstate: "不動産",
  other: "その他",
};
