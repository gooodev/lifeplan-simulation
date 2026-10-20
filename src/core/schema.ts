/**
 * 計算エンジン（src/core）の入力スキーマ。
 *
 * 設計方針（docs/CORE_SPEC.md 参照）:
 * 入力は「基準」「ストック」「フロー」「前提」の4層だけで構成する。
 * 住宅・教育・年金といった種別は計算エンジンの型としては持たず、各項目の `tags` で表す。
 * 計算エンジンはタグを一切解釈せず、結果にそのまま引き継ぐ（集計・絞り込みは利用側の責務）。
 *
 * 金額の単位は呼び出し側に委ねる（エンジンは単位を解釈しない）。既存アプリは万円を使う。
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1;

const id = z.string().min(1);
const year = z.number().int();
const finite = z.number().finite();

/** 種別などを表すキーと値の組。例: `{ "type": "housing", "home": "自宅A" }` */
export const tagsSchema = z.record(z.string().min(1), z.string());

/**
 * 発生時期。西暦・年齢基準・試算開始年からの相対年の3種類。
 * 年齢は「西暦 − 生年」の年単位で扱う。
 */
export const timingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("year"), year }),
  z.object({ type: z.literal("age"), personId: id, age: z.number().int() }),
  z.object({ type: z.literal("offset"), years: z.number().int() }),
]);

/**
 * 発生期間。`intervalYears` が省略または 0 なら単発（start の年のみ）、
 * n（≥1）なら start から n 年毎に `end`（含む。省略時は試算終了年）まで発生する。
 */
export const periodSchema = z.object({
  start: timingSchema,
  end: timingSchema.optional(),
  intervalYears: z.number().int().nonnegative().optional(),
});

/**
 * 金額の発生スケジュール。フローと振替で共通に使う。
 * 発生年 y の金額 = `overrides` にあればその値、なければ amount × (1 + growthRatePercent/100)^(y − 期間の開始年)。
 */
const scheduleShape = {
  period: periodSchema,
  /** 期間の開始年における1回あたりの金額。 */
  amount: finite.nonnegative(),
  /** 1年あたりの増加率（%）。省略時 0。 */
  growthRatePercent: finite.optional(),
  /** 特定の発生年だけ金額を上書きする。発生年以外の年を指定するとエラーになる。 */
  overrides: z.array(z.object({ year, amount: finite.nonnegative() })).optional(),
};

const itemShape = {
  id,
  label: z.string().optional(),
  tags: tagsSchema.optional(),
};

/** 基準: 試算期間と、年齢基準のタイミングを解決するための人物。 */
export const basisSchema = z.object({
  startYear: year,
  endYear: year,
  persons: z.array(z.object({ id, birthYear: year })),
});

/** 資産口座。試算開始時点の残高を持ち、フロー・振替の入出金先になる。 */
export const accountSchema = z.object({
  ...itemShape,
  initialBalance: finite,
});

/**
 * 元利均等返済のローン。返済額（支出）と残債（負債）はエンジンが計算する。
 * 借入時の資金の受け取りは扱わない（頭金などの現金支出はフローとして別に入れる）。
 * start が試算開始年より前でもよい（既存のローンを途中から試算する場合）。
 */
export const loanSchema = z.object({
  ...itemShape,
  start: timingSchema,
  principal: finite.nonnegative(),
  termYears: z.number().int().positive(),
  annualRatePercent: finite.nonnegative(),
  /** 返済の出金口座。省略時は stocks.settlementAccountId。 */
  accountId: id.optional(),
});

/** ストック: 試算開始時点の資産口座と負債。 */
export const stocksSchema = z.object({
  accounts: z.array(accountSchema).min(1),
  /** 口座を指定しないフロー・ローン返済の入出金先。 */
  settlementAccountId: id,
  loans: z.array(loanSchema).optional(),
});

/** 収入または支出。単発か継続かは period で表す。 */
export const flowSchema = z.object({
  ...itemShape,
  ...scheduleShape,
  direction: z.enum(["in", "out"]),
  /** 入出金口座。省略時は stocks.settlementAccountId。 */
  accountId: id.optional(),
});

/** 口座間の振替。収入・支出には計上せず、口座の残高だけが動く。 */
export const transferSchema = z.object({
  ...itemShape,
  ...scheduleShape,
  fromAccountId: id,
  toAccountId: id,
});

/** 前提: 口座ごとの運用利回り（%）。指定のない口座は 0。 */
export const assumptionsSchema = z.object({
  returnRatePercent: z.record(id, finite).optional(),
});

export const simulationInputSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  basis: basisSchema,
  stocks: stocksSchema,
  flows: z.array(flowSchema).optional(),
  transfers: z.array(transferSchema).optional(),
  assumptions: assumptionsSchema.optional(),
});

export type Tags = z.infer<typeof tagsSchema>;
export type Timing = z.infer<typeof timingSchema>;
export type Period = z.infer<typeof periodSchema>;
export type Basis = z.infer<typeof basisSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type Stocks = z.infer<typeof stocksSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type Assumptions = z.infer<typeof assumptionsSchema>;
export type SimulationInput = z.infer<typeof simulationInputSchema>;
