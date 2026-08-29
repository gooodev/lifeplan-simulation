/**
 * 制度・相場に紐づく定数テーブル。
 *
 * 年金の満額・乗率や教育費の相場は制度改定・物価変動で変わるため、ここに隔離し、
 * 出典・前提年をコメントで残す。UI からの上書き（PensionEvent の *Override,
 * EducationStage の個別金額）を優先させ、ここはあくまで既定値として扱う。
 */

export const PENSION_CONSTANTS = {
  /**
   * 国民年金（基礎年金）の満額（万円/年）。
   * 出典: docs/private/lifeplan.pdf の逆算値（78万円/年）。実額は年度改定されるため、
   * 最新の年金額は日本年金機構の公表値を UI から上書きして反映すること。
   */
  BASIC_PENSION_FULL_AMOUNT: 78,
  /** 基礎年金が満額になる加入年数（20〜60歳の40年）。 */
  BASIC_PENSION_FULL_YEARS: 40,
  /**
   * 厚生年金（報酬比例部分）の乗率。2003年4月以降の総報酬制における値。
   * 年金額 = 平均標準報酬月額 × 5.481/1000 × 加入月数
   */
  WELFARE_PENSION_RATE: 5.481 / 1000,
} as const;

export type SchoolStageKey =
  | "nursery"
  | "kindergarten"
  | "elementary"
  | "juniorHigh"
  | "highSchool"
  | "university"
  | "graduateSchool";

export type SchoolTrack = "public" | "private" | "privateScience" | "national";

/**
 * 進学区分ごとの入学金・年間費用の目安（万円）。
 * 出典: 文部科学省「子供の学習費調査」および日本政策金融公庫「教育費負担の実態調査」等の
 * 公表データを参考にした概算値。世帯・地域・学校により大きく異なるため、
 * 実際の試算では EducationStage の entranceFee / annualCost を必ず個別に見直すこと。
 */
export const EDUCATION_COST_TABLE: Record<
  SchoolStageKey,
  Partial<Record<SchoolTrack, { entranceFee: number; annualCost: number; durationYears: number }>>
> = {
  nursery: {
    public: { entranceFee: 0, annualCost: 20, durationYears: 3 },
    private: { entranceFee: 3, annualCost: 35, durationYears: 3 },
  },
  kindergarten: {
    public: { entranceFee: 0, annualCost: 20, durationYears: 3 },
    private: { entranceFee: 5, annualCost: 35, durationYears: 3 },
  },
  elementary: {
    public: { entranceFee: 0, annualCost: 33, durationYears: 6 },
    private: { entranceFee: 20, annualCost: 183, durationYears: 6 },
  },
  juniorHigh: {
    public: { entranceFee: 0, annualCost: 54, durationYears: 3 },
    private: { entranceFee: 25, annualCost: 140, durationYears: 3 },
  },
  highSchool: {
    public: { entranceFee: 5, annualCost: 45, durationYears: 3 },
    private: { entranceFee: 25, annualCost: 97, durationYears: 3 },
  },
  university: {
    national: { entranceFee: 28, annualCost: 54, durationYears: 4 },
    private: { entranceFee: 25, annualCost: 115, durationYears: 4 },
    privateScience: { entranceFee: 26, annualCost: 150, durationYears: 4 },
  },
  graduateSchool: {
    national: { entranceFee: 20, annualCost: 54, durationYears: 2 },
    private: { entranceFee: 20, annualCost: 100, durationYears: 2 },
  },
};

/** 進学ステージの標準的な開始年齢（満年齢、4月入学を想定した簡易モデル）。 */
export const STANDARD_ENROLLMENT_AGE: Record<SchoolStageKey, number> = {
  nursery: 0,
  kindergarten: 3,
  elementary: 6,
  juniorHigh: 12,
  highSchool: 15,
  university: 18,
  graduateSchool: 22,
};
