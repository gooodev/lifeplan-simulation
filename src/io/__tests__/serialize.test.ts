import { describe, expect, it } from "vite-plus/test";
import { makePlan } from "../../domain/__tests__/fixtures";
import { deserializePlans, serializePlans } from "../serialize";

describe("deserializePlans", () => {
  it("配分ルールを保存・復元できる", () => {
    const plan = makePlan();
    plan.assumptions.allocation = { mode: "minCash", minCash: 300 };
    const result = deserializePlans(serializePlans([plan], plan.id, []));
    expect(result.ok && result.data.plans[0].assumptions.allocation).toEqual({
      mode: "minCash",
      minCash: 300,
    });
  });

  it("配分ルールの無い旧ファイルは自動配分なしとして読み込む", () => {
    const plan = makePlan();
    const json = JSON.parse(serializePlans([plan], plan.id, []));
    delete json.plans[0].assumptions.allocation;
    const result = deserializePlans(JSON.stringify(json));
    expect(result.ok && result.data.plans[0].assumptions.allocation).toEqual({ mode: "none" });
  });
});
