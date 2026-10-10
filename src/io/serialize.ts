import { z } from "zod";
import {
  resolveAllocation,
  resolveLegacyAssets,
  resolveLegacyReturnRates,
} from "../domain/legacyMigration";
import type { Category, PlanInput } from "../domain/types";

/**
 * JSON入出力用のスキーマ定義。domain/types.ts の型と1対1になるよう手で対応させている。
 * 構造が一致していることは `plans: PlanInput[] = result.data.plans` の代入で
 * コンパイル時に検証される（型が一致しなければ vp check が失敗する）。
 */

const personRoleSchema = z.enum(["self", "spouse", "child", "other"]);

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: personRoleSchema,
  birthDate: z.string(),
  lifeEndAge: z.number(),
});

const timingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("year"), year: z.number() }),
  z.object({ type: z.literal("age"), personId: z.string(), age: z.number() }),
  z.object({ type: z.literal("offset"), years: z.number() }),
]);

const neverEndSchema = z.object({ type: z.literal("never") });

const periodSchema = z.object({
  start: timingSchema,
  end: z.union([timingSchema, neverEndSchema]).optional(),
  intervalYears: z.number().optional(),
});

// カテゴリはユーザーが設定画面で自由に追加・編集できるため、固定enumではなく
// 単なる文字列（カテゴリマスタのid）として扱う。実体は categorySchema 側で検証する。
const flowCategorySchema = z.string();

const categorySchema = z.object({
  id: z.string(),
  label: z.string(),
  direction: z.enum(["in", "out"]),
  order: z.number(),
});

const assetCategorySchema = z.enum(["cash", "investment", "realEstate", "other"]);

const currentAssetSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: assetCategorySchema,
  amount: z.number(),
});

const eventBaseShape = {
  id: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  category: flowCategorySchema,
  subjectId: z.string().optional(),
  note: z.string().optional(),
};

const loanSchema = z.object({
  principal: z.number(),
  termYears: z.number(),
  annualRatePercent: z.number(),
});

const educationStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  startAge: z.number(),
  durationYears: z.number(),
  entranceFee: z.number(),
  annualCost: z.number(),
});

const flowEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("flow"),
  direction: z.enum(["in", "out"]),
  period: periodSchema,
  amount: z.number(),
  growthRate: z.number().optional(),
});

const salaryEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("salary"),
  personId: z.string(),
  period: periodSchema,
  annualAmount: z.number(),
  growthRate: z.number(),
  overrides: z.array(z.object({ year: z.number(), amount: z.number() })).optional(),
});

const housingBuyEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("housingBuy"),
  timing: timingSchema,
  price: z.number(),
  initialCashOutlay: z.number(),
  maintenanceAnnual: z.number(),
  maintenanceUntil: timingSchema.optional(),
  loans: z.array(loanSchema),
});

const educationEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("education"),
  childId: z.string(),
  stages: z.array(educationStageSchema),
});

const pensionEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("pension"),
  personId: z.string(),
  enrollFromAge: z.number(),
  enrollToAge: z.number(),
  monthlyIncome: z.number(),
  receiveFromAge: z.number(),
  basicPensionFullAmountOverride: z.number().optional(),
  welfareRateOverride: z.number().optional(),
});

const retirementEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("retirement"),
  personId: z.string(),
  retireAge: z.number(),
  lumpSum: z.number(),
});

const insuranceEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("insurance"),
  insuredId: z.string(),
  annualPremium: z.number(),
  premiumUntilAge: z.number(),
  maturity: z.object({ age: z.number(), amount: z.number() }).optional(),
});

const markerEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("marker"),
  timing: timingSchema,
});

const assetTransferEventSchema = z.object({
  ...eventBaseShape,
  kind: z.literal("assetTransfer"),
  fromCategory: assetCategorySchema,
  toCategory: assetCategorySchema,
  period: periodSchema,
  amount: z.number(),
  growthRate: z.number().optional(),
});

const lifeEventSchema = z.discriminatedUnion("kind", [
  flowEventSchema,
  salaryEventSchema,
  housingBuyEventSchema,
  educationEventSchema,
  pensionEventSchema,
  retirementEventSchema,
  insuranceEventSchema,
  markerEventSchema,
  assetTransferEventSchema,
]);

const assumptionsSchema = z.object({
  returnRateByCategory: z.record(assetCategorySchema, z.number()).optional(),
  // 旧バージョンのエクスポートファイルは運用利回りが単一の数値だったため、
  // 読み込みだけは受け付けて resolveLegacyReturnRates() で区分別へ変換する。
  investmentReturnRate: z.number().optional(),
  takeHomeRate: z.number(),
  // 配分ルール導入前のエクスポートファイルには無いため省略可。読み込み時に既定値を補う。
  allocation: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("none") }),
      z.object({ mode: z.literal("minCash"), minCash: z.number() }),
      z.object({ mode: z.literal("ratio"), cashRatioPercent: z.number() }),
    ])
    .optional(),
});

const planInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  baseYear: z.number(),
  endYear: z.number(),
  assets: z.array(currentAssetSchema).optional(),
  // 旧バージョンのエクスポートファイルは資産が単一の数値だったため、
  // 読み込みだけは受け付けて resolveLegacyAssets() で assets へ変換する。
  currentSavings: z.number().optional(),
  persons: z.array(personSchema),
  events: z.array(lifeEventSchema),
  assumptions: assumptionsSchema,
});

export const CURRENT_SCHEMA_VERSION = 1;

const exportFileSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  plans: z.array(planInputSchema),
  activePlanId: z.string().nullable(),
  // 旧バージョンのエクスポートファイルには categories が存在しないため任意項目にする。
  // 省略された場合は呼び出し側（store）が既定のカテゴリで補う。
  categories: z.array(categorySchema).optional(),
});

export type ExportFile = {
  schemaVersion: number;
  plans: PlanInput[];
  activePlanId: string | null;
  categories: Category[] | undefined;
};

export function serializePlans(
  plans: PlanInput[],
  activePlanId: string | null,
  categories: Category[],
): string {
  const payload: ExportFile = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    plans,
    activePlanId,
    categories,
  };
  return JSON.stringify(payload, null, 2);
}

export type DeserializeResult = { ok: true; data: ExportFile } | { ok: false; error: string };

export function deserializePlans(json: string): DeserializeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON として解析できませんでした" };
  }

  const result = exportFileSchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" / ");
    return { ok: false, error: message || "データの形式が不正です" };
  }

  // ここで plans: PlanInput[] へ代入できること自体が、
  // 上記スキーマが domain/types.ts の PlanInput と構造的に一致していることの検証になる。
  const plans: PlanInput[] = result.data.plans.map(({ currentSavings, assets, ...rest }) => {
    const { investmentReturnRate, ...assumptionsRest } = rest.assumptions;
    return {
      ...rest,
      assets: resolveLegacyAssets(assets, currentSavings),
      assumptions: {
        ...assumptionsRest,
        returnRateByCategory: resolveLegacyReturnRates(
          rest.assumptions.returnRateByCategory,
          investmentReturnRate,
        ),
        allocation: resolveAllocation(rest.assumptions.allocation),
      },
    };
  });
  const categories: Category[] | undefined = result.data.categories;
  return {
    ok: true,
    data: {
      schemaVersion: result.data.schemaVersion,
      plans,
      activePlanId: result.data.activePlanId,
      categories,
    },
  };
}
