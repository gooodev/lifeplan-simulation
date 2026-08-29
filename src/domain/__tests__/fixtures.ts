/**
 * テスト専用の架空データ生成ヘルパー。
 * 個人の家計の生データ（docs/private/lifeplan.pdf）は一切使わず、合成した値のみを扱う。
 */
import { createZeroByCategory } from "../finance";
import type { Assumptions, CurrentAsset, Person, PlanInput, SimulationContext } from "../types";

export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "self",
    name: "テスト太郎",
    role: "self",
    birthDate: "1990-01-01",
    lifeEndAge: 90,
    ...overrides,
  };
}

export function makeAssumptions(overrides: Partial<Assumptions> = {}): Assumptions {
  return {
    returnRateByCategory: createZeroByCategory(),
    takeHomeRate: 100,
    ...overrides,
  };
}

export function makeContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
  return {
    persons: [makePerson()],
    baseYear: 2025,
    endYear: 2035,
    assumptions: makeAssumptions(),
    ...overrides,
  };
}

export function makeAsset(overrides: Partial<CurrentAsset> = {}): CurrentAsset {
  return {
    id: "asset-1",
    label: "現金・預金",
    category: "cash",
    amount: 0,
    ...overrides,
  };
}

export function makePlan(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    id: "plan-1",
    name: "テストプラン",
    baseYear: 2025,
    endYear: 2035,
    assets: [],
    persons: [makePerson()],
    events: [],
    assumptions: makeAssumptions(),
    ...overrides,
  };
}
