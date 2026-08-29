import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import type { Category, PlanInput } from "../domain/types";
import { appStateCollection, categoriesCollection, plansCollection } from "./collections";

/** 全プランを購読する。plansCollection の変更で自動的に再レンダリングされる。 */
export function usePlans(): PlanInput[] {
  const { data } = useLiveQuery(plansCollection);
  return data;
}

export function useActivePlanId(): string | null {
  const { data } = useLiveQuery(appStateCollection);
  return data[0]?.activePlanId ?? null;
}

/** 年表・キャッシュフロー表で「主なイベント」を絞り込む金額の下限（万円）。未設定なら 0（絞り込みなし）。 */
export function useEventDisplayThreshold(): number {
  const { data } = useLiveQuery(appStateCollection);
  return data[0]?.eventDisplayThreshold ?? 0;
}

export function usePlan(planId: string): PlanInput | undefined {
  const plans = usePlans();
  return plans.find((plan) => plan.id === planId);
}

/** 現在アクティブなプラン。各ページはこれだけ呼べば自己完結する。 */
export function useActivePlan(): PlanInput | null {
  const plans = usePlans();
  const activePlanId = useActivePlanId();
  return plans.find((plan) => plan.id === activePlanId) ?? null;
}

/** 表示順（order）でソート済みの全カテゴリ。設定画面・各種セレクトで使う。 */
export function useCategories(): Category[] {
  const { data } = useLiveQuery(categoriesCollection);
  return useMemo(() => [...data].sort((a, b) => a.order - b.order), [data]);
}

export function useCategoriesByDirection(direction: "in" | "out"): Category[] {
  const categories = useCategories();
  return useMemo(
    () => categories.filter((category) => category.direction === direction),
    [categories, direction],
  );
}

/** categoryId -> label のマップ。テーブル・グラフでの表示に使う。 */
export function useCategoryLabelMap(): Map<string, string> {
  const categories = useCategories();
  return useMemo(
    () => new Map(categories.map((category) => [category.id, category.label])),
    [categories],
  );
}
