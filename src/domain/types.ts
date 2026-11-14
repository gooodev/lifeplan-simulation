/**
 * ライフプラン計算エンジンのドメイン型。
 *
 * 設計方針（統一イベントモデル）:
 * 元になった FP 帳票（docs/private/lifeplan.pdf）はセクションごとに固定の入力欄を持つが、
 * それをそのまま型にすると「住宅は購入1回きり」「人物は本人/配偶者/子の3ロール固定」
 * のように可変性を失う。そこで本システムでは、すべてのライフイベントを
 * `LifeEvent` の配列として持ち、時間軸上に展開してから集計する。
 * PDF の各セクション（住宅・教育・旅行など）は、この配列にイベントを
 * 追加するための入力 UI として位置づけられる。
 *
 * 金額の単位はすべて「万円」。PDF の帳票表記に合わせ、以降のドキュメント・
 * コメントでも万円を前提とする。
 */

/** 人物の続柄。'other' は親や同居家族など、本人/配偶者/子以外の全て。 */
export type PersonRole = "self" | "spouse" | "child" | "other";

export type Person = {
  id: string;
  name: string;
  role: PersonRole;
  /** YYYY-MM-DD。年齢計算には年のみ使用する（timing.ts 参照）。 */
  birthDate: string;
  /** この人を何歳まで試算に含めるか。UI がイベントの終了条件を作る際の既定値として使う。 */
  lifeEndAge: number;
};

/**
 * イベントの発生タイミング。西暦・年齢基準・相対年のいずれかで指定する。
 * PDF の「1年後」「60歳迄」という表記をこの3種類に一般化したもの。
 */
export type Timing =
  | { type: "year"; year: number }
  | { type: "age"; personId: string; age: number }
  | { type: "offset"; years: number };

/** Period の終了を「試算終了年まで続く」と明示するための値。 */
export type NeverEnd = { type: "never" };

export type Period = {
  start: Timing;
  /** 省略時は試算終了年まで続くとみなす（never と同義）。 */
  end?: Timing | NeverEnd;
  /**
   * 発生間隔（年）。省略または 0 以下なら単発。1 なら毎年、n なら n 年毎。
   * PDF の「1年毎」「10年毎」に対応する。
   */
  intervalYears?: number;
};

/**
 * キャッシュフロー表の行に集計する際のカテゴリ。
 * ドメイン層はカテゴリの中身（ラベルや収入/支出の別）を一切解釈せず、
 * 単なるグルーピングキーとして扱う。カテゴリの実体（ユーザーが追加・編集できる
 * マスタ）は `Category` 型として別に持ち、`store/collections.ts` で管理する。
 */
export type FlowCategory = string;

/** ユーザーが設定画面で追加・編集・削除できるカテゴリマスタ1件分。 */
export type Category = {
  id: string;
  label: string;
  /** このカテゴリが収入用か支出用か。収入・支出それぞれのテーブルでの絞り込みに使う。 */
  direction: "in" | "out";
  /** 表示順。小さいほど先に表示する。 */
  order: number;
};

export type EventBase = {
  id: string;
  /** 自由記述の表示名。CF表の「主要イベント」欄や年表にもこの名前を使う。 */
  label: string;
  /** 無効化しても削除せず残せる。プラン比較や「やめたらどうなるか」の検討に使う。 */
  enabled: boolean;
  category: FlowCategory;
  /** このイベントが誰に紐づくか（表示・絞り込み用途。計算上は各 kind 固有のフィールドを使う）。 */
  subjectId?: string;
  note?: string;
};

/** 住宅ローン1本分。元利均等返済を前提とする。 */
export type Loan = {
  principal: number;
  termYears: number;
  /** 年利（%）。例: 0.8 */
  annualRatePercent: number;
};

/** 進学ステージ1件分。子ごとに時系列で複数持つ。 */
export type EducationStage = {
  id: string;
  label: string;
  /** このステージが始まる年齢（子の年齢）。 */
  startAge: number;
  /** 在学年数。 */
  durationYears: number;
  /** 入学金（初年度に一括計上）。 */
  entranceFee: number;
  /** 年間費用。 */
  annualCost: number;
};

export type FlowEvent = EventBase & {
  kind: "flow";
  direction: "in" | "out";
  period: Period;
  /** 1回あたりの金額（万円）。繰返しイベントでは毎回この額が基準になる。 */
  amount: number;
  /** 発生ごとの増加率（%）。物価上昇や賃上げを個別イベントに反映したい場合に使う。省略時 0。 */
  growthRate?: number;
};

export type SalaryEvent = EventBase & {
  kind: "salary";
  personId: string;
  period: Period;
  /** 基準年（period.start の年）の年収。 */
  annualAmount: number;
  /** 昇給率（%）。 */
  growthRate: number;
  /** 特定の年だけ金額を上書きしたい場合（転職・休職など）。 */
  overrides?: { year: number; amount: number }[];
};

export type HousingBuyEvent = EventBase & {
  kind: "housingBuy";
  timing: Timing;
  price: number;
  /**
   * 購入時に一括で必要な現金（頭金＋諸経費など）。
   * ローンは price に対して独立に設定する（頭金分だけ元本を減らす、という自動計算はしない）。
   */
  initialCashOutlay: number;
  maintenanceAnnual: number;
  /** 共益費の終了時期。省略時は試算終了年まで（売却・引っ越し時にここで打ち切る）。 */
  maintenanceUntil?: Timing;
  loans: Loan[];
};

export type EducationEvent = EventBase & {
  kind: "education";
  childId: string;
  stages: EducationStage[];
};

export type PensionEvent = EventBase & {
  kind: "pension";
  personId: string;
  enrollFromAge: number;
  enrollToAge: number;
  /** 加入期間中の平均月収（万円）。厚生年金の簡易計算に使う。 */
  monthlyIncome: number;
  receiveFromAge: number;
  /** 基礎年金の満額を上書きしたい場合（制度改定対応）。省略時は constants.ts の値。 */
  basicPensionFullAmountOverride?: number;
  /** 厚生年金の乗率を上書きしたい場合。省略時は constants.ts の値。 */
  welfareRateOverride?: number;
};

export type RetirementEvent = EventBase & {
  kind: "retirement";
  personId: string;
  retireAge: number;
  lumpSum: number;
};

export type InsuranceEvent = EventBase & {
  kind: "insurance";
  insuredId: string;
  annualPremium: number;
  /** 払込満了年齢。保険料はこの年齢に達する前年まで発生する。 */
  premiumUntilAge: number;
  /** 満期金（あれば）。指定した年齢の年に一括収入として計上する。 */
  maturity?: { age: number; amount: number };
};

/** 金額を持たない、年表への印だけのイベント（結婚記念日など）。 */
export type MarkerEvent = EventBase & {
  kind: "marker";
  timing: Timing;
};

/**
 * 資産区分間の定期的な付け替え（例: 毎月の積立NISA拠出＝現金→投資）。
 * 収支（収入・支出）には一切影響しない。資産の内訳だけが変わる。
 */
export type AssetTransferEvent = EventBase & {
  kind: "assetTransfer";
  fromCategory: AssetCategory;
  toCategory: AssetCategory;
  period: Period;
  /** 1回あたりの振替額（万円）。 */
  amount: number;
  /** 発生ごとの増加率（%）。積立額を段階的に増やしたい場合に使う。省略時 0。 */
  growthRate?: number;
};

export type LifeEvent =
  | FlowEvent
  | SalaryEvent
  | HousingBuyEvent
  | EducationEvent
  | PensionEvent
  | RetirementEvent
  | InsuranceEvent
  | MarkerEvent
  | AssetTransferEvent;

/**
 * 現金と投資の配分ルール。毎年の収支・振替を反映した後、期末に現金と投資の間で自動的に付け替える。
 * - none: 自動配分しない（収支の余剰はすべて cash に積み上がる。従来の挙動）
 * - minCash: 現金を minCash（万円）だけ残し、超過分を投資へ回す。不足すれば投資から取り崩す
 * - ratio: 現金＋投資の合計のうち cashRatioPercent（%）を現金、残りを投資になるよう毎年配分し直す
 * 投資が尽きても現金が足りない場合は、現金がマイナスのまま残る（不足として表示される）。
 * 不動産・その他の区分には手を付けない。
 */
export type AllocationRule =
  | { mode: "none" }
  | { mode: "minCash"; minCash: number }
  | { mode: "ratio"; cashRatioPercent: number };

export type AllocationMode = AllocationRule["mode"];

export type Assumptions = {
  /**
   * 資産区分ごとに毎年適用する運用利回り（%）。既定はすべて 0（PDF互換）。
   * 収支の余剰分（純キャッシュフロー）は毎年 cash 区分に積み上がる。
   * investment 等の利回りを効かせたい場合は allocation で自動配分するか、
   * AssetTransferEvent で明示的に振り替える。
   */
  returnRateByCategory: Record<AssetCategory, number>;
  /**
   * 給与収入に乗じる手取り換算率（%）。PDF は額面をそのまま収入計上しているため
   * 既定 100（PDF互換）。実態に近づけるなら 70〜80 程度を設定する。
   */
  takeHomeRate: number;
  /** 現金と投資の自動配分ルール。既定は none（従来の挙動）。 */
  allocation: AllocationRule;
};

/** 試算開始時点の資産の分類。現金・投資・不動産で運用利回りの前提が異なりうるため区別する。 */
export type AssetCategory = "cash" | "investment" | "realEstate" | "other";

/** AssetCategory の全値。既定値の生成や UI での列挙に使う。 */
export const ASSET_CATEGORIES: AssetCategory[] = ["cash", "investment", "realEstate", "other"];

/** 試算開始時点の資産1件分（例: 普通預金、証券口座、自宅の評価額など）。 */
export type CurrentAsset = {
  id: string;
  label: string;
  category: AssetCategory;
  amount: number;
};

export type PlanInput = {
  id: string;
  name: string;
  /** サイドバーのプラン切替で表示するアイコンのキー（`src/ui/planIcons.ts` 参照）。省略時は既定アイコン。 */
  icon?: string;
  /** 試算開始年（西暦）。offset タイミングの基準にもなる。 */
  baseYear: number;
  /** 試算終了年（西暦）。 */
  endYear: number;
  /** 試算開始時点の資産の内訳。貯蓄残高の初期値には合計額を使う。 */
  assets: CurrentAsset[];
  persons: Person[];
  events: LifeEvent[];
  assumptions: Assumptions;
};

/** イベント展開・タイミング解決の両方で使う実行コンテキスト。 */
export type SimulationContext = {
  persons: Person[];
  baseYear: number;
  endYear: number;
  assumptions: Assumptions;
};

/** イベント展開の結果、年ごとに集計される最小単位。 */
export type AnnualFlow = {
  year: number;
  category: FlowCategory;
  direction: "in" | "out";
  amount: number;
  sourceEventId: string;
  label: string;
};

/**
 * その年に発生したイベント1件分（年表・キャッシュフロー表のホバー内訳で使う）。
 * category/direction は住宅ローン・資産振替・marker など収支に計上されないものは undefined。
 */
export type CashflowEventOccurrence = {
  label: string;
  /** 金額（万円）。marker イベントは金額を持たないため 0。 */
  amount: number;
  category?: FlowCategory;
  direction?: "in" | "out";
  /**
   * 金額を持たない marker イベント由来かどうか。年表の金額閾値フィルタで、
   * 金額が偶然0の収入・支出イベント（例: 共益費0円）と区別するために使う。
   */
  isMarker?: boolean;
};

/** 負債（ローン残債など）1件分。 */
export type LiabilityItem = {
  label: string;
  amount: number;
};

export type CashflowRow = {
  year: number;
  /** personId -> その年の年齢 */
  ages: Record<string, number>;
  incomeByCategory: Partial<Record<FlowCategory, number>>;
  expenseByCategory: Partial<Record<FlowCategory, number>>;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  /** 期末貯蓄残高（前年残高 + 運用収益 + 収支）。assetsByCategory の合計と一致する。 */
  balance: number;
  /** 期末の資産区分ごとの残高。区分ごとの運用利回り・振替を反映した内訳。 */
  assetsByCategory: Record<AssetCategory, number>;
  /** その年の資産区分ごとの運用収益（前年末残高 × 区分の運用利回り）。 */
  returnByCategory: Record<AssetCategory, number>;
  /** 運用収益の合計。returnByCategory の合計と一致する。 */
  totalReturn: number;
  /**
   * 配分ルール（assumptions.allocation）により現金から投資へ自動で付け替えた額。
   * 負の値は投資から現金への取り崩しを表す。
   */
  autoTransfer: number;
  /** 期末時点の負債（住宅ローンの残債）の内訳。 */
  liabilities: LiabilityItem[];
  /** 負債の合計額。liabilities の合計と一致する。 */
  totalLiabilities: number;
  /** その年に発生したイベント一覧（marker を含む）。年表・ホバー内訳の表示に使う。 */
  events: CashflowEventOccurrence[];
};
