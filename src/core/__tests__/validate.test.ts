import { describe, expect, it } from "vite-plus/test";
import { simulationInputJsonSchema } from "../index";
import { parseSimulationInput } from "../validate";
import { makeInput } from "./fixtures";

function issuePaths(value: unknown): string[] {
  const result = parseSimulationInput(value);
  return result.success ? [] : result.issues.map((issue) => issue.path.join("."));
}

describe("parseSimulationInput", () => {
  it("正しい入力を受け付ける", () => {
    expect(parseSimulationInput(makeInput()).success).toBe(true);
  });

  it("schemaVersion がない入力は拒否する", () => {
    const { schemaVersion: _, ...rest } = makeInput();
    expect(issuePaths(rest)).toContain("schemaVersion");
  });

  it("存在しない人物・口座への参照を検出する", () => {
    const paths = issuePaths(
      makeInput({
        flows: [
          {
            id: "f",
            direction: "in",
            amount: 1,
            accountId: "missing",
            period: { start: { type: "age", personId: "nobody", age: 60 } },
          },
        ],
        assumptions: { returnRatePercent: { ghost: 3 } },
      }),
    );

    expect(paths).toEqual(
      expect.arrayContaining([
        "flows.0.accountId",
        "flows.0.period.start.personId",
        "assumptions.returnRatePercent.ghost",
      ]),
    );
  });

  it("フロー・振替・ローンをまたいだ ID の重複を検出する", () => {
    const paths = issuePaths(
      makeInput({
        flows: [
          { id: "x", direction: "in", amount: 1, period: { start: { type: "year", year: 2025 } } },
        ],
        transfers: [
          {
            id: "x",
            fromAccountId: "cash",
            toAccountId: "cash",
            amount: 1,
            period: { start: { type: "year", year: 2025 } },
          },
        ],
      }),
    );

    expect(paths).toEqual(expect.arrayContaining(["transfers.0.id", "transfers.0.toAccountId"]));
  });

  it("試算期間の前後が逆なら拒否する", () => {
    const input = makeInput();
    input.basis.startYear = 2030;
    expect(issuePaths(input)).toContain("basis.endYear");
  });

  it("JSON Schema を生成できる", () => {
    const schema = simulationInputJsonSchema();
    expect(schema).toMatchObject({ type: "object" });
    expect(Object.keys(schema.properties as object)).toEqual(
      expect.arrayContaining(["basis", "stocks", "flows", "transfers", "assumptions"]),
    );
  });
});
