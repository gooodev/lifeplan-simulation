/**
 * 計算エンジンの公開 API。UI・API サーバーのどちらからもここだけを import する。
 * 仕様は docs/CORE_SPEC.md。
 */
import { z } from "zod";
import { simulationInputSchema } from "./schema";

export { byTag, groupEntries } from "./aggregate";
export { annualLoanPayment, loanBalanceAfterMonths } from "./loan";
export { SCHEMA_VERSION, simulationInputSchema } from "./schema";
export type * from "./schema";
export { simulate } from "./simulate";
export type { Entry, SimulationResult, YearResult } from "./simulate";
export { assertSimulationInput, parseSimulationInput, SimulationInputError } from "./validate";
export type { InputIssue, ParseResult } from "./validate";

/** 入力の JSON Schema。API のドキュメントや外部クライアントでの検証に使う。 */
export function simulationInputJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(simulationInputSchema) as Record<string, unknown>;
}
