import { useState } from "react";
import {
  EDUCATION_COST_TABLE,
  STANDARD_ENROLLMENT_AGE,
  type SchoolStageKey,
  type SchoolTrack,
} from "../domain/constants";
import { createId } from "../domain/id";
import type { EducationStage, Loan, Period, Person, Timing } from "../domain/types";
import { Button, CheckboxField, NumberField, SelectField } from "./fields";

type TimingFieldProps = {
  label: string;
  value: Timing;
  onChange: (value: Timing) => void;
  persons: Person[];
};

/** Timing（西暦／年齢基準／相対年）の切替式入力。 */
export function TimingField({ label, value, onChange, persons }: TimingFieldProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField
        label={label}
        value={value.type}
        options={[
          { value: "year", label: "西暦で指定" },
          { value: "age", label: "誰かの年齢で指定" },
          { value: "offset", label: "基準年からの経過年数" },
        ]}
        onChange={(type) => {
          if (type === "year") {
            onChange({
              type: "year",
              year: value.type === "year" ? value.year : new Date().getFullYear(),
            });
          } else if (type === "offset") {
            onChange({ type: "offset", years: value.type === "offset" ? value.years : 1 });
          } else {
            onChange({
              type: "age",
              personId: value.type === "age" ? value.personId : (persons[0]?.id ?? ""),
              age: value.type === "age" ? value.age : 30,
            });
          }
        }}
      />
      {value.type === "year" && (
        <NumberField
          label="西暦"
          value={value.year}
          onChange={(year) => onChange({ type: "year", year })}
        />
      )}
      {value.type === "offset" && (
        <NumberField
          label="年後"
          value={value.years}
          onChange={(years) => onChange({ type: "offset", years })}
        />
      )}
      {value.type === "age" && (
        <>
          <SelectField
            label="人物"
            value={value.personId}
            options={persons.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(personId) => onChange({ type: "age", personId, age: value.age })}
          />
          <NumberField
            label="歳"
            value={value.age}
            onChange={(age) => onChange({ type: "age", personId: value.personId, age })}
          />
        </>
      )}
    </div>
  );
}

type PeriodFieldProps = {
  value: Period;
  onChange: (value: Period) => void;
  persons: Person[];
};

/** Period（開始・終了・発生間隔）の入力。終了未指定は「試算終了年まで」を意味する。 */
export function PeriodField({ value, onChange, persons }: PeriodFieldProps) {
  const hasEnd = value.end !== undefined && value.end.type !== "never";
  const endTiming: Timing = hasEnd
    ? (value.end as Timing)
    : { type: "year", year: new Date().getFullYear() + 1 };

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 p-2 dark:border-gray-700">
      <TimingField
        label="開始時期"
        value={value.start}
        onChange={(start) => onChange({ ...value, start })}
        persons={persons}
      />
      <NumberField
        label="発生間隔"
        value={value.intervalYears ?? 0}
        onChange={(intervalYears) => onChange({ ...value, intervalYears })}
        suffix="年（0=単発、1=毎年、n=n年毎）"
      />
      <CheckboxField
        label="終了時期を指定する（未指定なら試算終了年まで続く）"
        checked={hasEnd}
        onChange={(checked) => onChange({ ...value, end: checked ? endTiming : undefined })}
      />
      {hasEnd && (
        <TimingField
          label="終了時期"
          value={endTiming}
          onChange={(end) => onChange({ ...value, end })}
          persons={persons}
        />
      )}
    </div>
  );
}

type LoanListFieldProps = {
  loans: Loan[];
  onChange: (loans: Loan[]) => void;
};

export function LoanListField({ loans, onChange }: LoanListFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ローン</span>
      {loans.map((loan, index) => (
        <div
          key={`loan-${index}`}
          className="flex flex-wrap items-end gap-2 rounded border border-gray-200 p-2 dark:border-gray-700"
        >
          <NumberField
            label="借入額"
            value={loan.principal}
            suffix="万円"
            onChange={(principal) =>
              onChange(loans.map((l, i) => (i === index ? { ...l, principal } : l)))
            }
          />
          <NumberField
            label="返済期間"
            value={loan.termYears}
            suffix="年"
            onChange={(termYears) =>
              onChange(loans.map((l, i) => (i === index ? { ...l, termYears } : l)))
            }
          />
          <NumberField
            label="年利"
            value={loan.annualRatePercent}
            step={0.01}
            suffix="%"
            onChange={(annualRatePercent) =>
              onChange(loans.map((l, i) => (i === index ? { ...l, annualRatePercent } : l)))
            }
          />
          <Button variant="danger" onClick={() => onChange(loans.filter((_, i) => i !== index))}>
            削除
          </Button>
        </div>
      ))}
      <Button
        onClick={() => onChange([...loans, { principal: 0, termYears: 35, annualRatePercent: 1 }])}
      >
        + ローンを追加
      </Button>
    </div>
  );
}

const SCHOOL_STAGE_LABELS: Record<SchoolStageKey, string> = {
  nursery: "保育所",
  kindergarten: "幼稚園",
  elementary: "小学校",
  juniorHigh: "中学校",
  highSchool: "高校",
  university: "大学・専門学校",
  graduateSchool: "大学院",
};

const SCHOOL_TRACK_LABELS: Record<SchoolTrack, string> = {
  public: "公立",
  private: "私立",
  privateScience: "私立理系",
  national: "国公立",
};

type EducationStageListFieldProps = {
  stages: EducationStage[];
  onChange: (stages: EducationStage[]) => void;
};

/** 進学ステージの一覧。プリセット（相場テーブル）から追加するか、手入力で追加できる。 */
export function EducationStageListField({ stages, onChange }: EducationStageListFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">進学ステージ</span>
      {stages.map((stage) => (
        <div
          key={stage.id}
          className="flex flex-wrap items-end gap-2 rounded border border-gray-200 p-2 dark:border-gray-700"
        >
          <NumberField
            label="開始年齢"
            value={stage.startAge}
            suffix="歳"
            onChange={(startAge) =>
              onChange(stages.map((s) => (s.id === stage.id ? { ...s, startAge } : s)))
            }
          />
          <NumberField
            label="在学年数"
            value={stage.durationYears}
            suffix="年"
            onChange={(durationYears) =>
              onChange(stages.map((s) => (s.id === stage.id ? { ...s, durationYears } : s)))
            }
          />
          <NumberField
            label="入学金"
            value={stage.entranceFee}
            suffix="万円"
            onChange={(entranceFee) =>
              onChange(stages.map((s) => (s.id === stage.id ? { ...s, entranceFee } : s)))
            }
          />
          <NumberField
            label="年間費用"
            value={stage.annualCost}
            suffix="万円"
            onChange={(annualCost) =>
              onChange(stages.map((s) => (s.id === stage.id ? { ...s, annualCost } : s)))
            }
          />
          <Button
            variant="danger"
            onClick={() => onChange(stages.filter((s) => s.id !== stage.id))}
          >
            削除
          </Button>
        </div>
      ))}
      <EducationPresetPicker onAdd={(stage) => onChange([...stages, stage])} />
    </div>
  );
}

type EducationPresetOption = {
  value: string;
  stageKey: SchoolStageKey;
  trackKey: SchoolTrack;
  entranceFee: number;
  annualCost: number;
  durationYears: number;
};

function buildEducationPresetOptions(): EducationPresetOption[] {
  const stageKeys = Object.keys(EDUCATION_COST_TABLE) as SchoolStageKey[];
  return stageKeys.flatMap((stageKey) =>
    Object.entries(EDUCATION_COST_TABLE[stageKey]).flatMap(([track, cost]) => {
      if (!cost) {
        return [];
      }
      const trackKey = track as SchoolTrack;
      return [{ value: `${stageKey}:${trackKey}`, stageKey, trackKey, ...cost }];
    }),
  );
}

function EducationPresetPicker({ onAdd }: { onAdd: (stage: EducationStage) => void }) {
  const options = buildEducationPresetOptions();
  const [selectedValue, setSelectedValue] = useState(options[0]?.value ?? "");

  const handleAddPreset = () => {
    const option = options.find((o) => o.value === selectedValue);
    if (!option) {
      return;
    }
    onAdd({
      id: createId(),
      label: `${SCHOOL_STAGE_LABELS[option.stageKey]}（${SCHOOL_TRACK_LABELS[option.trackKey]}）`,
      startAge: STANDARD_ENROLLMENT_AGE[option.stageKey],
      durationYears: option.durationYears,
      entranceFee: option.entranceFee,
      annualCost: option.annualCost,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded border border-dashed border-gray-300 p-2 dark:border-gray-600">
      <SelectField
        label="相場から追加"
        value={selectedValue}
        options={options.map((option) => ({
          value: option.value,
          label: `${SCHOOL_STAGE_LABELS[option.stageKey]}・${SCHOOL_TRACK_LABELS[option.trackKey]}`,
        }))}
        onChange={setSelectedValue}
      />
      <Button onClick={handleAddPreset}>追加</Button>
      <Button
        onClick={() =>
          onAdd({
            id: createId(),
            label: "新しいステージ",
            startAge: 6,
            durationYears: 6,
            entranceFee: 0,
            annualCost: 0,
          })
        }
      >
        + 手入力で追加
      </Button>
    </div>
  );
}
