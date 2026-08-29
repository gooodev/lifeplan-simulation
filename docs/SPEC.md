# 計算仕様

このドキュメントは、`src/domain/` の計算ロジックの仕様と、その根拠を記録する。
実装を変更する際は、まずここを更新してから着手すること。

## 背景

FP に依頼して作成したライフプラン帳票（`docs/private/lifeplan.pdf`、個人の家計情報を含むため
リポジトリには含めない）と同等の試算を、自分たちの手で何度でもやり直せるようにするために
このシステムを作った。PDF は「FP ツールの入力項目 → 固定レイアウトの帳票」という構造だったが、
それをそのまま型にすると可変性を失う（後述）。そこで本システムは、すべてのライフイベントを
時間軸上のイベント配列として扱う「統一イベントモデル」を採用している。

## 統一イベントモデル

`src/domain/types.ts` に定義。

- **Person**: 続柄は 夫/妻/子/その他（親や同居家族など）。人数は可変。
- **Timing**: `{ type: "year" }` / `{ type: "age" }` / `{ type: "offset" }` の3種類で
  発生時期を表す。PDF の「1年後」「60歳迄」という表記を一般化したもの。
- **Period**: `Timing` の開始・終了・発生間隔（`intervalYears`）。0または未指定=単発、
  1=毎年、n=n年毎。
- **LifeEvent**: `kind` で判別する discriminated union。
  `flow`（汎用の単発/繰返し収支）・`salary`・`housingBuy`・`education`・`pension`・
  `retirement`・`insurance`・`marker`（金額を持たない年表マーカー）・
  `assetTransfer`（資産区分間の付け替え。後述）の9種類。
  `flow` があれば旅行・耐久消費財・固定資産税・塾代・奨学金・結婚援助・臨時収支は
  すべて表現できる。専用の `kind` を用意したのは、元利均等返済や年金の簡易計算のように
  ユーザーに手計算させたくないロジックを持つものだけ。
- 各イベントは `enabled` フラグを持ち、削除せず無効化できる（「これをやめたらどうなるか」の検討用）。
- `period.start`/`period.end`・`housingBuy.timing`/`maintenanceUntil`・`marker.timing` は
  いずれも `Timing` 型のため、`{ type: "age", personId }` で **人物の主参照
  （personId/childId/insuredId/subjectId）とは別の人物** を参照しうる。プラン複製時の
  ID付け替え（`remapEventPersonIds`）・人物削除時の連鎖無効化（`eventReferencesPerson`）は
  この経路も含めて全人物参照を辿る（`src/domain/eventRefs.ts`）。ここを漏らすと、複製先の
  プランに元プランの人物IDが残り、試算時に「人物が見つかりません」で失敗する。

### PDF のモデルから変更した点

| PDF（帳票固定）                   | 本システム                                                                | 理由                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 住宅は購入1回きり                 | `housingBuy` イベントを複数追加可能                                       | 賃貸→購入→買い替えを表現するため                                       |
| 人物は本人/配偶者/子の3ロール固定 | `Person[]` で人数・続柄とも可変                                           | 親の介護費などを紐づけられるようにするため                             |
| 退職金に企業年金が内包            | 退職金（`retirement`）と企業年金（`flow` + category `otherIncome`）を分離 | 企業年金は実質「期間指定の年金収入」であり、汎用フローで表現できるため |
| 収支カテゴリが帳票の行として固定  | `Category`（`id`/`label`/`direction`/`order`）をユーザーが設定画面でCRUD  | 生活費の内訳を自分の家計に合わせて増減したいため                       |
| 貯蓄残高は単一の預貯金額          | `CurrentAsset[]` で現金・投資・不動産・その他を区別（後述）               | NISA等の投資と現金・預金を分けて管理したいため                         |

買い替えは「既存の `housingBuy` の `maintenanceUntil` を売却時期にし、
新しい `housingBuy` を追加する」ことで表現する（売却益・残債精算は `flow` で個別に追加する）。

## 資産・負債モデル

### 試算開始時点の資産（`PlanInput.assets: CurrentAsset[]`）

`CurrentAsset = { id, label, category, amount }`。`category` は
`AssetCategory = "cash" | "investment" | "realEstate" | "other"` の4区分固定
（`src/domain/types.ts`）。現金・投資・不動産で運用利回りの前提が異なるため区別している。
区分ごとの合計は `sumAssetsByCategory()`、全体合計は `sumAssets()`（`src/domain/finance.ts`）。

### 区分ごとの運用利回りと資産振替

`Assumptions.returnRateByCategory: Record<AssetCategory, number>` で区分ごとに毎年の
運用利回り（%）を設定する。収支の余剰分（純キャッシュフロー）は常に `cash` 区分に積み上がり、
他区分の利回りを効かせたい場合は `assetTransfer` イベント（`fromCategory`/`toCategory`/
`period`/`amount`）で明示的に振り替える（例: 毎月の積立NISA拠出 = 現金→投資への定期振替）。
`assetTransfer` は収支（収入・支出）には一切計上しない。

`simulate()`（`src/domain/cashflow.ts`）内の年次漸化式（区分ごと）:

```
残高[t, 区分] = 残高[t-1, 区分] × (1 + その区分の運用利回り)
残高[t, cash] += 収支[t]
残高[t, from] -= 振替額、残高[t, to] += 振替額（その年に発生した振替ごとに）
```

検算: PDF 5-2 初年度、預貯金残高 3,698万円 + 収支 664万円 = 貯蓄残高 4,362万円
（運用利回り0%・資産区分1つのみの場合。これは上記漸化式が単一区分に退化したケースと一致）。

### 負債（住宅ローン残債）

`CashflowRow.liabilities: LiabilityItem[]` / `totalLiabilities: number`。
`housingBuy` イベントの各ローンについて、購入年からの経過年数をもとに
`remainingLoanBalance()`（`src/domain/finance.ts`）で残債を計算する。

```
残債 = 借入額 × (1+月利)^経過月数 − 月返済額 × ((1+月利)^経過月数 − 1) / 月利
```

返済期間を超えたら 0（完済）。無効化された住宅イベントは負債に計上しない。
「純資産」は `資産合計 − 負債合計` としてサマリー画面に表示する。

## 展開と集計（`src/domain/cashflow.ts`）

1. 各イベントを `expand/*.ts` の対応する関数で `AnnualFlow[]`（年・カテゴリ・方向・金額）に展開する。
   ディスパッチテーブルは `cashflow.ts` の `expandEvent()`。新しい `kind` を追加する場合は
   `expand/` にモジュールを1つ足してここに1行登録すればよい。
   `marker`・`assetTransfer` は収支に計上しないため、このディスパッチとは別に `simulate()` が
   直接処理する。
2. 年ごとに `AnnualFlow` を集計し、収入合計・支出合計・収支を出す。
3. 同時に、その年に発生したイベントを `CashflowEventOccurrence`（label/amount/category/
   direction/isMarker）として記録する。年表の金額閾値フィルタ・キャッシュフロー表の
   カテゴリ別ホバー内訳は、この構造化データをもとに絞り込む。
4. 資産区分ごとの残高・負債を上記の漸化式で更新する。

## 検証済みの計算式

### 住宅ローン（元利均等返済） — `src/domain/finance.ts`

```
月利 r = 年利 / 12
月返済 = 借入額 × r(1+r)^n / ((1+r)^n − 1)   n = 返済期間 × 12
年間返済額 = 月返済 × 12
```

検算: 借入8,000万円・35年・年利0.8% → 年間262.1万円（PDF 4-2 の「262万円」と一致）。

### 公的年金（簡易計算） — `src/domain/expand/pension.ts`

```
基礎年金 = 満額(78万円) × 加入年数 / 40      （20〜60歳の40年で満額）
厚生年金 = 平均標準報酬月額 × 5.481/1000 × 加入月数
```

満額・乗率は `src/domain/constants.ts` の `PENSION_CONSTANTS` に定数として隔離し、
イベント側の `basicPensionFullAmountOverride` / `welfareRateOverride` で上書きできる
（年金制度の改定に追従するため）。

検算: 加入23〜60歳(37年)・月収48万円 → 基礎72.15万円・厚生116.8万円
（PDFの帳票値「72万円・117万円」とほぼ一致。差は端数処理による）。

### 教育費 — `src/domain/expand/education.ts`

入学金はステージ初年度のみ、年間費用は在学期間中ずっと計上する。
`src/domain/constants.ts` の `EDUCATION_COST_TABLE` は文部科学省「子供の学習費調査」等の
公表データを参考にした概算値であり、実際の試算では個別に見直すことを前提とする
（世帯の実データではない）。入力画面では進学区分・トラックをプルダウンで選んで
「追加」ボタンで相場値を反映するか、手入力で個別に作成できる。

## PDF にない拡張

| 項目                                                           | 既定値 | 説明                                                                                                                                                                                        |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 昇給率（`SalaryEvent.growthRate`）                             | 0%     | PDF は年収が50年間一定という前提だったため、複利成長を追加した                                                                                                                              |
| 物価上昇率（`FlowEvent.growthRate`）                           | 0%     | 生活費・教育費などの逓増を個別イベント単位で表現できる                                                                                                                                      |
| 資産区分ごとの運用利回り（`Assumptions.returnRateByCategory`） | 0%     | PDF は貯蓄が全額現預金（運用なし）前提だった。区分ごとに設定できるようにし、現金→投資の定期振替（積立NISA等）と組み合わせて使う                                                             |
| 手取り換算率（`Assumptions.takeHomeRate`）                     | 100%   | **既知の弱点への対応。** PDF は額面年収をそのまま収入計上しており、税・社会保険料が引かれていない。既定100%はPDFと同じ挙動（額面のまま）だが、実態に近づけたい場合は70〜80%程度に下げられる |
| 年表・キャッシュフロー表の表示閾値                             | 0万円  | 収支イベントが多いと年表が見にくくなるため、設定画面で指定した金額未満のイベントを年表から省ける。marker（記念日等）は金額を持たないため常に表示する                                        |

いずれも既定値では PDF と同じ挙動になり、必要な人だけ拡張パラメータを使う設計にしている。

## カテゴリ・アセット区分は永続化された共通マスタ

収支カテゴリ（`Category`）は `src/store/collections.ts` の `categoriesCollection` で
プラン横断・全プラン共通のマスタとして管理し、設定画面（`/settings`）でCRUDできる。
初期値は `DEFAULT_CATEGORIES`（給与収入・年金収入・その他収入・生活費・教育費・結婚関連・
住宅関連・旅行・耐久消費財・その他支出・趣味・保険料）。資産区分（`AssetCategory`）は
現金・投資・不動産・その他の4種で固定（ユーザーCRUD対象ではない）。

## 旧バージョンからの移行

- `PlanInput.currentSavings: number` → `assets: CurrentAsset[]`
  （`resolveLegacyAssets`。単一値は「現金・預金」区分1件として引き継ぐ）
- `Assumptions.investmentReturnRate: number` → `returnRateByCategory: Record<AssetCategory, number>`
  （`resolveLegacyReturnRates`。単一値は挙動を変えないよう全区分に同じ値を設定する）

いずれも `src/domain/legacyMigration.ts` に実装し、localStorage起動時（`store/collections.ts`
の `bootstrap()`）とJSONインポート時（`io/serialize.ts` の `deserializePlans()`）の両方から
呼ばれる。値を失わないことを最優先し、旧仕様の試算結果が変わらないように変換する。

## UI構成

入力（家族構成・現在状況・収入・支出・ライフイベント・設定）と出力（サマリー・年表・
キャッシュフロー・カテゴリ別内訳・プラン比較）を、サイドバー付きのダッシュボード型
レイアウトで画面ごとに分離している（`src/routes/_app.*.tsx`）。ダークテーマ対応
（`next-themes`）、アイコンは `react-icons` の Lucide セット（`react-icons/lu`）を使用。

## 単位

すべての金額は万円（PDF の帳票表記に合わせた）。
