# 計算エンジン（`src/core`）仕様

UI だけでなく API からも使うことを前提に作り直した計算エンジンの仕様。
既存の `src/domain/`（`docs/SPEC.md`）とは独立しており、現時点では UI から使われていない。
実装を変更する際は、まずここを更新してから着手すること。

## 設計方針

- **入力は4層だけ。** 基準・ストック・フロー（振替を含む）・前提。それ以外の属性は持たない。
- **種別は型ではなくタグで表す。** 住宅・教育・年金・保険といった種別ごとの型は持たない。
  各項目の `tags`（キーと値の組）で表し、エンジンはタグを一切解釈せず結果の明細に引き継ぐ。
  集計・絞り込みは利用側が `groupEntries` などで行う。
- **複合イベントの計算は入力側の責務。** 年金額の簡易計算や教育費の相場表のような
  「入力を作るための計算」はエンジンに含めない。エンジンが持つ計算は、タイミングの解決・
  繰り返しの展開・増加率・運用利回り・ローンの元利均等返済だけ。
- **JSON で完結する。** 入力は JSON としてそのまま送れる形にし、`schemaVersion` で版を管理する。
  Zod スキーマ（`src/core/schema.ts`）を正とし、JSON Schema は `simulationInputJsonSchema()` で生成する。
- **単位は解釈しない。** 金額の単位は呼び出し側に委ねる（既存アプリは万円）。

## 公開 API（`src/core/index.ts`）

| 関数                                                  | 役割                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `parseSimulationInput(value)`                         | 未検証の値を検証し、`{ success, data }` または `{ success: false, issues }` を返す |
| `assertSimulationInput(value)`                        | 同上の例外版（`SimulationInputError`）                                             |
| `simulate(input)`                                     | 検証したうえで、年次の結果と明細を返す                                             |
| `groupEntries(entries, keyOf, filter)` / `byTag(key)` | 明細を年 × グループで合計する                                                      |
| `simulationInputJsonSchema()`                         | 入力の JSON Schema                                                                 |

## 入力

```jsonc
{
  "schemaVersion": 1,
  "basis": {
    "startYear": 2026,
    "endYear": 2075,
    "persons": [{ "id": "self", "birthYear": 1990 }],
  },
  "stocks": {
    "accounts": [
      { "id": "cash", "label": "預金", "initialBalance": 3698, "tags": { "class": "cash" } },
      { "id": "nisa", "initialBalance": 0, "tags": { "class": "investment" } },
    ],
    "settlementAccountId": "cash",
    "loans": [
      {
        "id": "mortgage",
        "start": { "type": "year", "year": 2028 },
        "principal": 8000,
        "termYears": 35,
        "annualRatePercent": 0.8,
        "tags": { "type": "housing", "home": "A" },
      },
    ],
  },
  "flows": [
    {
      "id": "salary",
      "direction": "in",
      "amount": 600,
      "growthRatePercent": 1,
      "period": {
        "start": { "type": "offset", "years": 0 },
        "end": { "type": "age", "personId": "self", "age": 59 },
        "intervalYears": 1,
      },
      "overrides": [{ "year": 2030, "amount": 0 }],
      "tags": { "type": "salary", "person": "self" },
    },
  ],
  "transfers": [
    {
      "id": "tsumitate",
      "fromAccountId": "cash",
      "toAccountId": "nisa",
      "amount": 120,
      "period": { "start": { "type": "offset", "years": 0 }, "intervalYears": 1 },
    },
  ],
  "assumptions": { "returnRatePercent": { "nisa": 3 } },
}
```

### 基準（`basis`）

試算期間と人物。人物は年齢基準のタイミング（`{ type: "age" }`）を解決するためだけに使うので、
`id` と `birthYear` しか持たない。年齢は「西暦 − 生年」の年単位。

### ストック（`stocks`）

- **口座（`accounts`）**: 試算開始時点の残高を持ち、フロー・振替・ローン返済の入出金先になる。
  資産区分（現金・投資・不動産など）は固定の列挙ではなく、口座のタグで表す。
- **決済口座（`settlementAccountId`）**: 口座を指定しないフロー・ローン返済の入出金先。
- **ローン（`loans`）**: 元利均等返済。返済額（支出）と期末残債（負債）はエンジンが計算する。
  借入時の資金の受け取りは扱わない（頭金などの現金支出はフローとして別に入れる）。
  `start` が試算開始年より前でもよく、その場合は残りの返済期間だけを計上する。

### フロー（`flows`）・振替（`transfers`）

どちらも共通の「スケジュール」（`period`・`amount`・`growthRatePercent`・`overrides`）を持つ。
フローは収入（`in`）または支出（`out`）、振替は口座間の移動で収支には計上しない。
単発か継続かは型で分けず、`period.intervalYears` で表す。

- `intervalYears` 省略または 0: 単発（`start` の年のみ）
- n（≥1）: `start` から n 年毎、`end`（含む。省略時は試算終了年）まで
- 発生年 y の金額 = `overrides` にあればその値、なければ `amount × (1 + growthRatePercent/100)^(y − 期間の開始年)`
- `overrides` に、試算期間内なのに発生年でない年を指定するとエラー

### 前提（`assumptions`）

口座ごとの運用利回り（%）。指定のない口座は 0。

### 検証

型の検証に加えて、次を `SimulationInputError`（`issues: { path, message }[]`）として返す。
API ではこの `issues` をそのままレスポンスにすればよい。

- 人物・口座の ID 重複、フロー・振替・ローンをまたいだ ID 重複（明細の `sourceId` を一意にするため）
- 存在しない人物・口座への参照（利回りの指定を含む）
- `startYear > endYear`、振替元と振替先が同じ口座

## 出力

```ts
type SimulationResult = { years: YearResult[]; entries: Entry[] };
```

- `years`: 年ごとの `income`・`expense`・`net`・口座ごとの期末残高（`balances`）・`totalAssets`・
  ローンごとの期末残債（`loanBalances`）・`totalLiabilities`・`netWorth`・人物の年齢（`ages`）。
- `entries`: 試算期間中に発生したすべての入出金の明細（`kind`: `flow` / `loanRepayment` / `transfer`）。
  発生元の `sourceId`・`label`・`tags` を持つ。カテゴリ別の集計や年表は、この明細から利用側で組み立てる。

表示用の情報（年表のマーカー、カテゴリの表示名など）は出力に含めない。

## 計算

口座ごとの年次漸化式:

```
残高[t] = 残高[t−1] × (1 + 運用利回り) + 入金 − 出金 ± 振替
```

利回りは前年末残高にだけ掛かる（その年の入出金は年末に発生したものとみなす）。

ローン（`src/core/loan.ts`、式は `docs/SPEC.md` と同じ）:

```
月利 r = 年利 / 12、n = 返済年数 × 12
年間返済額 = 借入額 × r(1+r)^n / ((1+r)^n − 1) × 12
返済は開始年から返済年数の間、毎年計上する
期末残債[t] = 開始年から (t − 開始年 + 1) × 12 か月返済した後の残高（開始前は 0、完済後は 0）
```

## 既存エンジン（`src/domain`）からの変更点

| 既存                                                           | 新エンジン                             | 理由                                                         |
| -------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `kind` ごとの型が9種類（住宅・教育・年金など）                 | フロー・振替・ローンの3種類 + `tags`   | 種別ごとの分岐をなくし、API のスキーマを小さく安定させるため |
| 資産区分は4種類で固定                                          | 口座を任意に定義し、区分はタグで表す   | 口座単位で利回り・入出金先を指定できるようにするため         |
| 収支カテゴリはプラン外のマスタ                                 | タグの値（エンジンは解釈しない）       | 入力 JSON だけで試算が完結するようにするため                 |
| 手取り換算率（`takeHomeRate`）を給与に一律適用                 | 廃止（手取り額は入力側で計算して渡す） | どのフローが給与かをエンジンが知らなくて済むようにするため   |
| `marker`（金額のない年表マーカー）                             | 廃止                                   | 計算に影響しない表示用の情報のため                           |
| 増加率の起点は試算期間内の最初の発生年                         | 期間の開始年                           | 試算開始年を変えても同じ年の金額が変わらないようにするため   |
| 残債は購入年に借入額のまま（その年の返済を反映しない）         | その年の返済後の期末残債               | 期末の資産残高と時点をそろえるため                           |
| `intervalYears` の小数は切り捨て、存在しない人物は試算時に例外 | 入力検証でまとめてエラーにする         | API で不正な入力を事前に弾けるようにするため                 |

## 未対応（今後の検討事項）

- 複合イベント（住宅・教育・年金など）からフロー・ローンを生成するジェネレーターと、
  その入力値の保存場所（`sources` など）
- 前提からタグを参照する仕組み（手取り換算や物価上昇率の一括適用など）
- 借入時の資金受け取り（教育ローンなど、借りた資金が口座に入るケース）
- 既存 UI の新エンジンへの移行
