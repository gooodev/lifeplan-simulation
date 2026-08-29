import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { createId } from "../domain/id";
import { eventReferencesPerson, remapEventPersonIds } from "../domain/eventRefs";
import { resolveLegacyAssets, resolveLegacyReturnRates } from "../domain/legacyMigration";
import type { Assumptions, Category, LifeEvent, Person, PlanInput } from "../domain/types";
import { createZeroByCategory } from "../domain/finance";

/**
 * 永続化層。TanStack DB の localStorage コレクションが状態管理と永続化を一体で担う。
 * PlanInput は非正規化のまま（persons/events を内包した配列）1行として保存する。
 * 正規化して persons/events を別コレクションに分けることもできるが、
 * このアプリの規模（プラン数個・人物/イベント数十件）では join のコストに見合わないため、
 * ドメイン層の `simulate(plan: PlanInput)` がそのまま使える非正規化モデルを維持する。
 */
export const plansCollection = createCollection(
  localStorageCollectionOptions<PlanInput, string>({
    storageKey: "lifeplan-simulation:plans",
    getKey: (plan) => plan.id,
  }),
);

/**
 * AI操作アシスタント（PageAgent）の設定。
 * apiKey はこのブラウザの localStorage にのみ保存し、ビルド成果物やリポジトリには含めない。
 */
export type PageAgentSettings = {
  enabled: boolean;
  apiKey: string;
  model: string;
};

/** どのプランを表示中かという、プラン本体とは別のUI状態。1行だけのコレクションとして持つ。 */
type AppState = {
  id: "app";
  activePlanId: string | null;
  /**
   * 年表・キャッシュフロー表で「主なイベント」として表示する金額の下限（万円）。
   * これ未満の収入・支出イベントは一覧から省く。プラン共通の表示設定として持つ。
   * 省略時（既存データ）は 0 = すべて表示。
   */
  eventDisplayThreshold?: number;
  pageAgent?: PageAgentSettings;
};

export const appStateCollection = createCollection(
  localStorageCollectionOptions<AppState, string>({
    storageKey: "lifeplan-simulation:app-state",
    getKey: (row) => row.id,
  }),
);

/**
 * カテゴリはプラン横断・全プラン共通のマスタとして持つ（設定画面で管理）。
 * id は既存データ（旧固定enum時代のイベントやエクスポート済みJSON）との後方互換のため、
 * 元の固定カテゴリと同じ文字列を初期値として使う。
 */
export const categoriesCollection = createCollection(
  localStorageCollectionOptions<Category, string>({
    storageKey: "lifeplan-simulation:categories",
    getKey: (category) => category.id,
  }),
);

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "salary", label: "給与収入", direction: "in", order: 0 },
  { id: "pension", label: "年金収入", direction: "in", order: 1 },
  { id: "otherIncome", label: "その他収入", direction: "in", order: 2 },
  { id: "living", label: "生活費", direction: "out", order: 0 },
  { id: "education", label: "教育費", direction: "out", order: 1 },
  { id: "marriage", label: "結婚関連", direction: "out", order: 2 },
  { id: "housing", label: "住宅関連", direction: "out", order: 3 },
  { id: "travel", label: "旅行", direction: "out", order: 4 },
  { id: "durable", label: "耐久消費財", direction: "out", order: 5 },
  { id: "other", label: "その他支出", direction: "out", order: 6 },
  { id: "hobby", label: "趣味", direction: "out", order: 7 },
  { id: "insurance", label: "保険料", direction: "out", order: 8 },
];

function createDefaultAssumptions(): Assumptions {
  return { returnRateByCategory: createZeroByCategory(), takeHomeRate: 100 };
}

/** 新規プランの既定アイコンキー。選択肢は `src/ui/planIcons.ts` を参照。 */
export const DEFAULT_PLAN_ICON = "folders";

/** 新規プランの雛形。本人1名だけを置いた空のプランから始める。 */
export function createEmptyPlan(name: string, baseYear: number): PlanInput {
  return {
    id: createId(),
    name,
    icon: DEFAULT_PLAN_ICON,
    baseYear,
    endYear: baseYear + 60,
    assets: [],
    persons: [
      {
        id: createId(),
        name: "夫",
        role: "self",
        birthDate: `${baseYear - 30}-01-01`,
        lifeEndAge: 90,
      },
    ],
    events: [],
    assumptions: createDefaultAssumptions(),
  };
}

/**
 * 初回起動時の初期データ投入。localStorage に何もなければ空のプランを1件作る。
 * toArrayWhenReady() は最初の同期完了を待ってから配列を返すため、
 * まだ localStorage から読み込み中のタイミングで「空だから作る」と誤判定しない。
 */
async function bootstrap(): Promise<void> {
  const plans = await plansCollection.toArrayWhenReady();
  await appStateCollection.preload();
  const categories = await categoriesCollection.toArrayWhenReady();

  if (categories.length === 0) {
    categoriesCollection.insert(DEFAULT_CATEGORIES);
  }

  if (plans.length === 0) {
    const plan = createEmptyPlan("現状プラン", new Date().getFullYear());
    plansCollection.insert(plan);
    appStateCollection.insert({ id: "app", activePlanId: plan.id });
    return;
  }

  if (!appStateCollection.has("app")) {
    appStateCollection.insert({ id: "app", activePlanId: plans[0].id });
  }

  migrateLegacyAssets(plans);
}

/**
 * 旧バージョン（試算開始時点の資産が currentSavings という単一の数値、運用利回りが
 * investmentReturnRate という単一の数値だった頃）に作られたプランを、資産内訳
 * （assets）・区分別運用利回り（returnRateByCategory）へ移行する。
 * それぞれ該当プロパティ自体が存在しないプランだけを対象にする
 * （ユーザーが資産を全件削除して空配列になったプランと区別するため）。
 */
function migrateLegacyAssets(plans: PlanInput[]): void {
  for (const plan of plans) {
    const legacy = plan as unknown as {
      currentSavings?: number;
      assumptions: { investmentReturnRate?: number };
    };
    const needsAssetsMigration = !Array.isArray(plan.assets);
    const needsRatesMigration = !plan.assumptions.returnRateByCategory;
    if (!needsAssetsMigration && !needsRatesMigration) {
      continue;
    }

    const assets = needsAssetsMigration
      ? resolveLegacyAssets(plan.assets, legacy.currentSavings)
      : plan.assets;
    const returnRateByCategory = needsRatesMigration
      ? resolveLegacyReturnRates(
          plan.assumptions.returnRateByCategory,
          legacy.assumptions.investmentReturnRate,
        )
      : plan.assumptions.returnRateByCategory;

    plansCollection.update(plan.id, (draft) => {
      draft.assets = assets;
      draft.assumptions.returnRateByCategory = returnRateByCategory;
    });
  }
}

void bootstrap();

// --- プラン操作 -------------------------------------------------------

export function updatePlan(planId: string, updater: (plan: PlanInput) => PlanInput): void {
  if (!plansCollection.has(planId)) {
    return;
  }
  plansCollection.update(planId, (draft) => {
    Object.assign(draft, updater(draft));
  });
}

export function addPlan(name: string): string {
  const baseYear = plansCollection.toArray[0]?.baseYear ?? new Date().getFullYear();
  const plan = createEmptyPlan(name, baseYear);
  plansCollection.insert(plan);
  return plan.id;
}

export function duplicatePlan(planId: string, newName: string): string | null {
  const original = plansCollection.get(planId);
  if (!original) {
    return null;
  }

  const personIdMap = new Map(original.persons.map((person) => [person.id, createId()]));
  const persons = original.persons.map((person) => ({
    ...person,
    id: personIdMap.get(person.id) as string,
  }));
  const events = original.events.map((event) =>
    remapEventPersonIds(event, personIdMap, createId()),
  );

  const copy: PlanInput = {
    ...original,
    id: createId(),
    name: newName,
    persons,
    events,
    assumptions: { ...original.assumptions },
  };
  plansCollection.insert(copy);
  return copy.id;
}

export function removePlan(planId: string): void {
  plansCollection.delete(planId);

  let firstRemainingId = plansCollection.toArray[0]?.id;
  if (!firstRemainingId) {
    const plan = createEmptyPlan("現状プラン", new Date().getFullYear());
    plansCollection.insert(plan);
    firstRemainingId = plan.id;
  }

  if (appStateCollection.get("app")?.activePlanId === planId) {
    setActivePlan(firstRemainingId);
  }
}

export function renamePlan(planId: string, name: string): void {
  updatePlan(planId, (plan) => ({ ...plan, name }));
}

export function setPlanIcon(planId: string, icon: string): void {
  updatePlan(planId, (plan) => ({ ...plan, icon }));
}

export function setActivePlan(planId: string): void {
  if (appStateCollection.has("app")) {
    appStateCollection.update("app", (draft) => {
      draft.activePlanId = planId;
    });
  } else {
    appStateCollection.insert({ id: "app", activePlanId: planId });
  }
}

export function setEventDisplayThreshold(threshold: number): void {
  if (appStateCollection.has("app")) {
    appStateCollection.update("app", (draft) => {
      draft.eventDisplayThreshold = threshold;
    });
  } else {
    appStateCollection.insert({ id: "app", activePlanId: null, eventDisplayThreshold: threshold });
  }
}

export function setPageAgentSettings(settings: PageAgentSettings): void {
  if (appStateCollection.has("app")) {
    appStateCollection.update("app", (draft) => {
      draft.pageAgent = settings;
    });
  } else {
    appStateCollection.insert({ id: "app", activePlanId: null, pageAgent: settings });
  }
}

// --- 人物操作 ---------------------------------------------------------

export function addPerson(planId: string, person: Omit<Person, "id">): void {
  updatePlan(planId, (plan) => ({
    ...plan,
    persons: [...plan.persons, { ...person, id: createId() }],
  }));
}

export function updatePerson(
  planId: string,
  personId: string,
  updater: (person: Person) => Person,
): void {
  updatePlan(planId, (plan) => ({
    ...plan,
    persons: plan.persons.map((person) => (person.id === personId ? updater(person) : person)),
  }));
}

export function removePerson(planId: string, personId: string): void {
  updatePlan(planId, (plan) => ({
    ...plan,
    persons: plan.persons.filter((person) => person.id !== personId),
    // 削除された人物を参照するイベントは、クラッシュを避けるため無効化して残す
    events: plan.events.map((event) =>
      eventReferencesPerson(event, personId) ? { ...event, enabled: false } : event,
    ),
  }));
}

// --- イベント操作 -------------------------------------------------------

export function addEvent(planId: string, event: LifeEvent): void {
  updatePlan(planId, (plan) => ({ ...plan, events: [...plan.events, event] }));
}

export function updateEvent(
  planId: string,
  eventId: string,
  updater: (event: LifeEvent) => LifeEvent,
): void {
  updatePlan(planId, (plan) => ({
    ...plan,
    events: plan.events.map((event) => (event.id === eventId ? updater(event) : event)),
  }));
}

export function removeEvent(planId: string, eventId: string): void {
  updatePlan(planId, (plan) => ({
    ...plan,
    events: plan.events.filter((event) => event.id !== eventId),
  }));
}

export function duplicateEvent(planId: string, eventId: string): void {
  updatePlan(planId, (plan) => {
    const original = plan.events.find((event) => event.id === eventId);
    if (!original) {
      return plan;
    }
    const copy: LifeEvent = { ...original, id: createId(), label: `${original.label}（コピー）` };
    return { ...plan, events: [...plan.events, copy] };
  });
}

export function toggleEvent(planId: string, eventId: string): void {
  updatePlan(planId, (plan) => ({
    ...plan,
    events: plan.events.map((event) =>
      event.id === eventId ? { ...event, enabled: !event.enabled } : event,
    ),
  }));
}

export function reorderEvents(planId: string, orderedIds: string[]): void {
  updatePlan(planId, (plan) => {
    const byId = new Map(plan.events.map((event) => [event.id, event]));
    const reordered = orderedIds
      .map((id) => byId.get(id))
      .filter((event): event is LifeEvent => event !== undefined);
    const remaining = plan.events.filter((event) => !orderedIds.includes(event.id));
    return { ...plan, events: [...reordered, ...remaining] };
  });
}

// --- カテゴリ操作 -------------------------------------------------------

export function addCategory(label: string, direction: "in" | "out"): string {
  const siblings = categoriesCollection.toArray.filter(
    (category) => category.direction === direction,
  );
  const order =
    siblings.length > 0 ? Math.max(...siblings.map((category) => category.order)) + 1 : 0;
  const category: Category = { id: createId(), label, direction, order };
  categoriesCollection.insert(category);
  return category.id;
}

export function renameCategory(categoryId: string, label: string): void {
  if (!categoriesCollection.has(categoryId)) {
    return;
  }
  categoriesCollection.update(categoryId, (draft) => {
    draft.label = label;
  });
}

/** カテゴリがどこかのプランのイベントから参照されているか。削除可否の判定に使う。 */
export function isCategoryInUse(categoryId: string): boolean {
  return plansCollection.toArray.some((plan) =>
    plan.events.some((event) => event.category === categoryId),
  );
}

/** 使用中のカテゴリは削除できない（イベント側が参照を失うため）。戻り値は削除できたかどうか。 */
export function removeCategory(categoryId: string): boolean {
  if (isCategoryInUse(categoryId)) {
    return false;
  }
  categoriesCollection.delete(categoryId);
  return true;
}

export function reorderCategories(orderedIds: string[]): void {
  orderedIds.forEach((id, index) => {
    if (categoriesCollection.has(id)) {
      categoriesCollection.update(id, (draft) => {
        draft.order = index;
      });
    }
  });
}

// --- 入出力 -------------------------------------------------------------

export function importPlans(
  plans: PlanInput[],
  activePlanId: string | null,
  categories?: Category[],
): void {
  const existingIds = plansCollection.toArray.map((plan) => plan.id);
  if (existingIds.length > 0) {
    plansCollection.delete(existingIds);
  }

  const finalPlans =
    plans.length > 0 ? plans : [createEmptyPlan("現状プラン", new Date().getFullYear())];
  plansCollection.insert(finalPlans);

  if (categories && categories.length > 0) {
    const existingCategoryIds = categoriesCollection.toArray.map((category) => category.id);
    if (existingCategoryIds.length > 0) {
      categoriesCollection.delete(existingCategoryIds);
    }
    categoriesCollection.insert(categories);
  }

  const resolvedActiveId =
    activePlanId && finalPlans.some((plan) => plan.id === activePlanId)
      ? activePlanId
      : finalPlans[0].id;
  setActivePlan(resolvedActiveId);
}

export function resetAll(): void {
  const existingIds = plansCollection.toArray.map((plan) => plan.id);
  if (existingIds.length > 0) {
    plansCollection.delete(existingIds);
  }
  const plan = createEmptyPlan("現状プラン", new Date().getFullYear());
  plansCollection.insert(plan);
  setActivePlan(plan.id);
}
