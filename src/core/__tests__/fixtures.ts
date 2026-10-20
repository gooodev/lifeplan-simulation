import type { SimulationInput } from "../schema";

/** 現金口座1つ・人物1人だけの最小入力に、テストごとの差分を重ねる。 */
export function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    schemaVersion: 1,
    basis: {
      startYear: 2025,
      endYear: 2027,
      persons: [{ id: "self", birthYear: 1990 }],
    },
    stocks: {
      accounts: [{ id: "cash", initialBalance: 1000 }],
      settlementAccountId: "cash",
    },
    ...overrides,
  };
}
