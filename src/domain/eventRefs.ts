import type { LifeEvent, Period, Timing } from "./types";

/**
 * イベントが主に紐づく人物のID（personId/childId/insuredId/subjectIdのいずれか）。
 * kind ごとに参照フィールド名が異なるため、UI表示（「対象者」列など）で使う。
 * 見つからない場合（世帯全体を表すflow/housingBuy/markerでsubjectId未設定など）は undefined。
 *
 * 注意: これは「表示上の主な対象者」であり、イベントが参照する人物の全てではない。
 * period.start/end や timing（年齢基準のタイミング）も別の人物を参照しうるため、
 * 削除連鎖・ID付け替えでは eventReferencesPerson / remapEventPersonIds を使うこと。
 */
export function getEventSubjectId(event: LifeEvent): string | undefined {
  switch (event.kind) {
    case "salary":
    case "pension":
    case "retirement":
      return event.personId;
    case "education":
      return event.childId;
    case "insurance":
      return event.insuredId;
    case "flow":
    case "housingBuy":
    case "marker":
    case "assetTransfer":
      return event.subjectId;
  }
}

function timingPersonId(timing: Timing | undefined): string | undefined {
  return timing?.type === "age" ? timing.personId : undefined;
}

function periodPersonIds(period: Period): string[] {
  const ids: string[] = [];
  const startId = timingPersonId(period.start);
  if (startId) {
    ids.push(startId);
  }
  if (period.end && period.end.type !== "never") {
    const endId = timingPersonId(period.end);
    if (endId) {
      ids.push(endId);
    }
  }
  return ids;
}

/**
 * イベントが「年齢基準のタイミング」（period.start/end, timing, maintenanceUntil）経由で
 * 参照している人物ID一覧。年齢基準でなければ何も参照しない。
 */
function eventTimingPersonIds(event: LifeEvent): string[] {
  switch (event.kind) {
    case "flow":
    case "salary":
    case "assetTransfer":
      return periodPersonIds(event.period);
    case "housingBuy": {
      const ids: string[] = [];
      const timingId = timingPersonId(event.timing);
      if (timingId) {
        ids.push(timingId);
      }
      const maintenanceId = timingPersonId(event.maintenanceUntil);
      if (maintenanceId) {
        ids.push(maintenanceId);
      }
      return ids;
    }
    case "marker": {
      const id = timingPersonId(event.timing);
      return id ? [id] : [];
    }
    case "education":
    case "pension":
    case "retirement":
    case "insurance":
      return [];
  }
}

/**
 * イベントが指定した人物を参照しているかどうか（主な対象者だけでなく、
 * 年齢基準のタイミングでの参照も含む）。人物削除時の連鎖処理（store）で使う。
 */
export function eventReferencesPerson(event: LifeEvent, personId: string): boolean {
  if (getEventSubjectId(event) === personId) {
    return true;
  }
  return eventTimingPersonIds(event).includes(personId);
}

function remapTiming(timing: Timing, personIdMap: Map<string, string>): Timing {
  if (timing.type !== "age") {
    return timing;
  }
  return { ...timing, personId: personIdMap.get(timing.personId) ?? timing.personId };
}

function remapPeriod(period: Period, personIdMap: Map<string, string>): Period {
  return {
    ...period,
    start: remapTiming(period.start, personIdMap),
    end:
      period.end && period.end.type !== "never" ? remapTiming(period.end, personIdMap) : period.end,
  };
}

/**
 * イベント内の人物参照を personIdMap に従って付け替えた新しいイベントを返す。
 * プラン複製時（人物にも新しいIDを振り直す）に使う。id 自体も新規発行する。
 * 主な対象者（personId/childId/insuredId/subjectId）だけでなく、period.start/end や
 * timing（年齢基準のタイミング）が参照する人物IDも付け替える。これを漏らすと、
 * 複製先のプランに元プランの人物IDが残ってしまい、試算時に
 * 「人物が見つかりません」で失敗する。
 */
export function remapEventPersonIds(
  event: LifeEvent,
  personIdMap: Map<string, string>,
  newId: string,
): LifeEvent {
  const subjectId = event.subjectId
    ? (personIdMap.get(event.subjectId) ?? event.subjectId)
    : event.subjectId;

  switch (event.kind) {
    case "salary":
      return {
        ...event,
        id: newId,
        subjectId,
        personId: personIdMap.get(event.personId) ?? event.personId,
        period: remapPeriod(event.period, personIdMap),
      };
    case "pension":
    case "retirement":
      return {
        ...event,
        id: newId,
        subjectId,
        personId: personIdMap.get(event.personId) ?? event.personId,
      };
    case "education":
      return {
        ...event,
        id: newId,
        subjectId,
        childId: personIdMap.get(event.childId) ?? event.childId,
      };
    case "insurance":
      return {
        ...event,
        id: newId,
        subjectId,
        insuredId: personIdMap.get(event.insuredId) ?? event.insuredId,
      };
    case "flow":
    case "assetTransfer":
      return { ...event, id: newId, subjectId, period: remapPeriod(event.period, personIdMap) };
    case "housingBuy":
      return {
        ...event,
        id: newId,
        subjectId,
        timing: remapTiming(event.timing, personIdMap),
        maintenanceUntil: event.maintenanceUntil
          ? remapTiming(event.maintenanceUntil, personIdMap)
          : event.maintenanceUntil,
      };
    case "marker":
      return { ...event, id: newId, subjectId, timing: remapTiming(event.timing, personIdMap) };
  }
}
