import { findPerson, yearWhenAge } from "../timing";
import type { AnnualFlow, EducationEvent, SimulationContext } from "../types";

/**
 * 教育費の展開。子ごとに持つ進学ステージ（保育所・小学校…）を、
 * 開始年齢・在学年数から実年に変換する。入学金はステージ初年度のみ、
 * 年間費用は在学期間ずっと計上する。
 */
export function expandEducation(event: EducationEvent, ctx: SimulationContext): AnnualFlow[] {
  const child = findPerson(event.childId, ctx.persons);
  const flows: AnnualFlow[] = [];

  for (const stage of event.stages) {
    const startYear = yearWhenAge(child, stage.startAge);
    for (let i = 0; i < stage.durationYears; i++) {
      const year = startYear + i;
      if (year < ctx.baseYear || year > ctx.endYear) {
        continue;
      }
      const amount = stage.annualCost + (i === 0 ? stage.entranceFee : 0);
      flows.push({
        year,
        category: event.category,
        direction: "out",
        amount,
        sourceEventId: event.id,
        label: `${event.label}・${stage.label}`,
      });
    }
  }

  return flows;
}
