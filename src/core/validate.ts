import { simulationInputSchema } from "./schema";
import type { SimulationInput, Timing } from "./schema";

export type InputIssue = {
  /** 問題のある値の位置。例: ["flows", 2, "accountId"] */
  path: (string | number)[];
  message: string;
};

/** 入力が不正な場合に投げる例外。API ではこの issues をそのまま返せばよい。 */
export class SimulationInputError extends Error {
  readonly issues: InputIssue[];

  constructor(issues: InputIssue[]) {
    super(
      issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n"),
    );
    this.name = "SimulationInputError";
    this.issues = issues;
  }
}

export type ParseResult =
  | { success: true; data: SimulationInput }
  | { success: false; issues: InputIssue[] };

/**
 * 未検証の値（API の JSON ボディなど）を検証する。
 * 型の検証（Zod）に加えて、ID の重複・存在しない人物や口座への参照・期間の前後関係を確認する。
 */
export function parseSimulationInput(value: unknown): ParseResult {
  const parsed = simulationInputSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map((key) => (typeof key === "number" ? key : String(key))),
        message: issue.message,
      })),
    };
  }

  const issues = checkReferences(parsed.data);
  return issues.length > 0 ? { success: false, issues } : { success: true, data: parsed.data };
}

/** parseSimulationInput の例外版。 */
export function assertSimulationInput(value: unknown): SimulationInput {
  const result = parseSimulationInput(value);
  if (!result.success) {
    throw new SimulationInputError(result.issues);
  }
  return result.data;
}

function checkReferences(input: SimulationInput): InputIssue[] {
  const issues: InputIssue[] = [];
  const { basis, stocks } = input;

  if (basis.startYear > basis.endYear) {
    issues.push({ path: ["basis", "endYear"], message: "endYear は startYear 以降にしてください" });
  }

  const personIds = collectUniqueIds(
    basis.persons.map((person) => person.id),
    ["basis", "persons"],
    issues,
  );
  const accountIds = collectUniqueIds(
    stocks.accounts.map((account) => account.id),
    ["stocks", "accounts"],
    issues,
  );

  // フロー・振替・ローンは結果の明細で sourceId として区別するため、種類をまたいで一意にする。
  const itemIds = new Set<string>();
  const checkItemId = (itemId: string, path: (string | number)[]): void => {
    if (itemIds.has(itemId)) {
      issues.push({ path: [...path, "id"], message: `ID が重複しています: ${itemId}` });
    }
    itemIds.add(itemId);
  };

  const checkAccount = (accountId: string | undefined, path: (string | number)[]): void => {
    if (accountId !== undefined && !accountIds.has(accountId)) {
      issues.push({ path, message: `口座が見つかりません: ${accountId}` });
    }
  };

  const checkTiming = (timing: Timing | undefined, path: (string | number)[]): void => {
    if (timing?.type === "age" && !personIds.has(timing.personId)) {
      issues.push({
        path: [...path, "personId"],
        message: `人物が見つかりません: ${timing.personId}`,
      });
    }
  };

  checkAccount(stocks.settlementAccountId, ["stocks", "settlementAccountId"]);

  (stocks.loans ?? []).forEach((loan, index) => {
    const path = ["stocks", "loans", index];
    checkItemId(loan.id, path);
    checkTiming(loan.start, [...path, "start"]);
    checkAccount(loan.accountId, [...path, "accountId"]);
  });

  (input.flows ?? []).forEach((flow, index) => {
    const path = ["flows", index];
    checkItemId(flow.id, path);
    checkTiming(flow.period.start, [...path, "period", "start"]);
    checkTiming(flow.period.end, [...path, "period", "end"]);
    checkAccount(flow.accountId, [...path, "accountId"]);
  });

  (input.transfers ?? []).forEach((transfer, index) => {
    const path = ["transfers", index];
    checkItemId(transfer.id, path);
    checkTiming(transfer.period.start, [...path, "period", "start"]);
    checkTiming(transfer.period.end, [...path, "period", "end"]);
    checkAccount(transfer.fromAccountId, [...path, "fromAccountId"]);
    checkAccount(transfer.toAccountId, [...path, "toAccountId"]);
    if (transfer.fromAccountId === transfer.toAccountId) {
      issues.push({ path: [...path, "toAccountId"], message: "振替元と振替先が同じ口座です" });
    }
  });

  for (const accountId of Object.keys(input.assumptions?.returnRatePercent ?? {})) {
    checkAccount(accountId, ["assumptions", "returnRatePercent", accountId]);
  }

  return issues;
}

function collectUniqueIds(
  ids: string[],
  path: (string | number)[],
  issues: InputIssue[],
): Set<string> {
  const seen = new Set<string>();
  ids.forEach((itemId, index) => {
    if (seen.has(itemId)) {
      issues.push({ path: [...path, index, "id"], message: `ID が重複しています: ${itemId}` });
    }
    seen.add(itemId);
  });
  return seen;
}
