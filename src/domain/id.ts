import { nanoid } from "nanoid";

/** イベント・人物・ステージなど、ドメインオブジェクトのID発行を1箇所に集約する。 */
export function createId(): string {
  return nanoid(10);
}
