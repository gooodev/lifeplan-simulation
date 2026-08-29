import { useState } from "react";
import {
  LuChevronDown,
  LuChevronRight,
  LuCopy,
  LuGraduationCap,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addEvent,
  duplicateEvent,
  removeEvent,
  toggleEvent,
  updateEvent,
} from "@/store/collections";
import { useCategoriesByDirection } from "@/store/hooks";
import { createId } from "../domain/id";
import type {
  Category,
  EducationEvent,
  HousingBuyEvent,
  InsuranceEvent,
  LifeEvent,
  PensionEvent,
  Person,
  RetirementEvent,
  Timing,
} from "../domain/types";
import { EducationStageListField, LoanListField, TimingField } from "./compositeFields";
import { formatMan } from "./format";

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="未分類" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PersonSelect({
  persons,
  value,
  onChange,
  allowHousehold,
}: {
  persons: Person[];
  value: string;
  onChange: (value: string) => void;
  allowHousehold?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="世帯全体" />
      </SelectTrigger>
      <SelectContent>
        {allowHousehold && <SelectItem value="">世帯全体</SelectItem>}
        {persons.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EnabledCell({
  planId,
  eventId,
  enabled,
}: {
  planId: string;
  eventId: string;
  enabled: boolean;
}) {
  return <Checkbox checked={enabled} onCheckedChange={() => toggleEvent(planId, eventId)} />;
}

function RowActions({ planId, eventId }: { planId: string; eventId: string }) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => duplicateEvent(planId, eventId)}
        title="複製"
      >
        <LuCopy />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => removeEvent(planId, eventId)}
        title="削除"
      >
        <LuTrash2 className="text-destructive" />
      </Button>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

function TableSection({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button size="sm" onClick={onAdd}>
          <LuPlus />
          {addLabel}
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>{children}</Table>
      </div>
    </div>
  );
}

// --- 住宅購入 -------------------------------------------------------

export function HousingTable({
  planId,
  events,
  persons,
  baseYear,
}: {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
  baseYear: number;
}) {
  const categories = useCategoriesByDirection("out");
  const items = events.filter((e): e is HousingBuyEvent => e.kind === "housingBuy");

  const handleAdd = () => {
    const event: HousingBuyEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: categories[0]?.id ?? "",
      kind: "housingBuy",
      timing: { type: "year", year: baseYear },
      price: 0,
      initialCashOutlay: 0,
      maintenanceAnnual: 0,
      loans: [],
    };
    addEvent(planId, event);
  };

  return (
    <TableSection title="住宅" addLabel="住宅購入を追加" onAdd={handleAdd}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">有効</TableHead>
          <TableHead className="min-w-32">名前</TableHead>
          <TableHead className="w-36">カテゴリ</TableHead>
          <TableHead className="w-32">購入時期</TableHead>
          <TableHead className="w-28">価格</TableHead>
          <TableHead className="w-28">自己資金</TableHead>
          <TableHead className="w-24">共益費</TableHead>
          <TableHead className="w-24">ローン</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((event) => {
          const patch = (changes: Partial<HousingBuyEvent>) =>
            updateEvent(planId, event.id, () => ({ ...event, ...changes }));
          return (
            <TableRow key={event.id} className={event.enabled ? "" : "opacity-50"}>
              <TableCell>
                <EnabledCell planId={planId} eventId={event.id} enabled={event.enabled} />
              </TableCell>
              <TableCell>
                <Input
                  value={event.label}
                  placeholder="名称未設定"
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <CategorySelect
                  categories={categories}
                  value={event.category}
                  onChange={(category) => patch({ category })}
                />
              </TableCell>
              <TableCell>
                <TimingPopover
                  label="購入時期"
                  value={event.timing}
                  persons={persons}
                  onChange={(timing) => patch({ timing })}
                />
              </TableCell>
              <TableCell>
                <AmountInput value={event.price} onChange={(price) => patch({ price })} />
              </TableCell>
              <TableCell>
                <AmountInput
                  value={event.initialCashOutlay}
                  onChange={(initialCashOutlay) => patch({ initialCashOutlay })}
                />
              </TableCell>
              <TableCell>
                <MaintenancePopover
                  maintenanceAnnual={event.maintenanceAnnual}
                  maintenanceUntil={event.maintenanceUntil}
                  persons={persons}
                  onChange={(changes) => patch(changes)}
                />
              </TableCell>
              <TableCell>
                <LoansPopover loans={event.loans} onChange={(loans) => patch({ loans })} />
              </TableCell>
              <TableCell>
                <RowActions planId={planId} eventId={event.id} />
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && <EmptyRow colSpan={9} label="住宅購入イベントがありません" />}
      </TableBody>
    </TableSection>
  );
}

// --- 教育費 -----------------------------------------------------------

/**
 * 教育費は子ごとにステージ（保育所〜大学院）をまとめて編集したいため、
 * 他のイベント種別と違いフラットな表ではなく子ごとのアコーディオンにする。
 * 続柄が「子」の人物を対象に、既存の教育イベントがあれば紐づけて表示する
 * （旧データ等で childId が「子」以外の人物を指している場合もその人物を含める）。
 *
 * shadcn の Accordion（Radix）は開いた状態のまま中身の高さが変わっても
 * 再計測されず、ステージ追加時に内容が見切れる不具合があったため、
 * CashflowTable の収入/支出アコーディオンと同じ、素朴な useState 開閉に揃えている。
 */
export function EducationAccordion({
  planId,
  events,
  persons,
}: {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
}) {
  const categories = useCategoriesByDirection("out");
  const items = events.filter((e): e is EducationEvent => e.kind === "education");
  const [closedChildIds, setClosedChildIds] = useState<Set<string>>(new Set());

  const childIds = new Set(persons.filter((p) => p.role === "child").map((p) => p.id));
  for (const event of items) {
    childIds.add(event.childId);
  }
  const children = persons.filter((p) => childIds.has(p.id));

  const handleAddForChild = (childId: string) => {
    const event: EducationEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: categories[0]?.id ?? "",
      kind: "education",
      childId,
      stages: [],
    };
    addEvent(planId, event);
  };

  const toggleChild = (childId: string) => {
    setClosedChildIds((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">教育</h3>
      {children.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          家族構成で続柄が「子」の人物を追加すると、ここで教育費を入力できます
        </p>
      ) : (
        <div className="flex flex-col rounded-lg border">
          {children.map((child) => {
            const isOpen = !closedChildIds.has(child.id);
            const childEvents = items.filter((event) => event.childId === child.id);
            const stageCount = childEvents.reduce((sum, event) => sum + event.stages.length, 0);
            return (
              <div key={child.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleChild(child.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent"
                >
                  {isOpen ? (
                    <LuChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <LuChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <LuGraduationCap className="size-4 shrink-0 text-muted-foreground" />
                  <span>{child.name}</span>
                  {stageCount > 0 && <Badge variant="secondary">{stageCount}ステージ</Badge>}
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-4 px-4 pb-4">
                    {childEvents.length === 0 && (
                      <p className="text-sm text-muted-foreground">教育費イベントがありません</p>
                    )}
                    {childEvents.map((event) => (
                      <EducationEventEditor
                        key={event.id}
                        planId={planId}
                        event={event}
                        categories={categories}
                      />
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => handleAddForChild(child.id)}
                    >
                      <LuPlus />
                      教育費を追加
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EducationEventEditor({
  planId,
  event,
  categories,
}: {
  planId: string;
  event: EducationEvent;
  categories: Category[];
}) {
  const patch = (changes: Partial<EducationEvent>) =>
    updateEvent(planId, event.id, () => ({ ...event, ...changes }));

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-3 ${event.enabled ? "" : "opacity-50"}`}
    >
      <div className="flex flex-wrap items-end gap-2">
        <EnabledCell planId={planId} eventId={event.id} enabled={event.enabled} />
        <div className="min-w-40 flex-1">
          <Input
            value={event.label}
            placeholder="名称未設定"
            onChange={(e) => patch({ label: e.target.value })}
          />
        </div>
        <div className="w-48">
          <CategorySelect
            categories={categories}
            value={event.category}
            onChange={(category) => patch({ category })}
          />
        </div>
        <RowActions planId={planId} eventId={event.id} />
      </div>
      <EducationStageListField stages={event.stages} onChange={(stages) => patch({ stages })} />
    </div>
  );
}

// --- 公的年金 ---------------------------------------------------------

export function PensionTable({
  planId,
  events,
  persons,
}: {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
}) {
  const categories = useCategoriesByDirection("in");
  const items = events.filter((e): e is PensionEvent => e.kind === "pension");

  const handleAdd = () => {
    const event: PensionEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: categories.find((c) => c.id === "pension")?.id ?? categories[0]?.id ?? "",
      kind: "pension",
      personId: persons[0]?.id ?? "",
      enrollFromAge: 22,
      enrollToAge: 60,
      monthlyIncome: 0,
      receiveFromAge: 65,
    };
    addEvent(planId, event);
  };

  return (
    <TableSection title="公的年金" addLabel="年金を追加" onAdd={handleAdd}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">有効</TableHead>
          <TableHead className="min-w-32">名前</TableHead>
          <TableHead className="w-32">対象者</TableHead>
          <TableHead className="w-36">カテゴリ</TableHead>
          <TableHead className="w-24">加入開始</TableHead>
          <TableHead className="w-24">加入終了</TableHead>
          <TableHead className="w-28">平均月収</TableHead>
          <TableHead className="w-24">受給開始</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((event) => {
          const patch = (changes: Partial<PensionEvent>) =>
            updateEvent(planId, event.id, () => ({ ...event, ...changes }));
          return (
            <TableRow key={event.id} className={event.enabled ? "" : "opacity-50"}>
              <TableCell>
                <EnabledCell planId={planId} eventId={event.id} enabled={event.enabled} />
              </TableCell>
              <TableCell>
                <Input
                  value={event.label}
                  placeholder="名称未設定"
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <PersonSelect
                  persons={persons}
                  value={event.personId}
                  onChange={(personId) => patch({ personId })}
                />
              </TableCell>
              <TableCell>
                <CategorySelect
                  categories={categories}
                  value={event.category}
                  onChange={(category) => patch({ category })}
                />
              </TableCell>
              <TableCell>
                <AgeInput
                  value={event.enrollFromAge}
                  onChange={(enrollFromAge) => patch({ enrollFromAge })}
                />
              </TableCell>
              <TableCell>
                <AgeInput
                  value={event.enrollToAge}
                  onChange={(enrollToAge) => patch({ enrollToAge })}
                />
              </TableCell>
              <TableCell>
                <AmountInput
                  value={event.monthlyIncome}
                  onChange={(monthlyIncome) => patch({ monthlyIncome })}
                />
              </TableCell>
              <TableCell>
                <AgeInput
                  value={event.receiveFromAge}
                  onChange={(receiveFromAge) => patch({ receiveFromAge })}
                />
              </TableCell>
              <TableCell>
                <RowActions planId={planId} eventId={event.id} />
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && <EmptyRow colSpan={9} label="公的年金イベントがありません" />}
      </TableBody>
    </TableSection>
  );
}

// --- 退職金 -----------------------------------------------------------

export function RetirementTable({
  planId,
  events,
  persons,
}: {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
}) {
  const categories = useCategoriesByDirection("in");
  const items = events.filter((e): e is RetirementEvent => e.kind === "retirement");

  const handleAdd = () => {
    const event: RetirementEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: categories.find((c) => c.id === "otherIncome")?.id ?? categories[0]?.id ?? "",
      kind: "retirement",
      personId: persons[0]?.id ?? "",
      retireAge: 60,
      lumpSum: 0,
    };
    addEvent(planId, event);
  };

  return (
    <TableSection title="退職金" addLabel="退職金を追加" onAdd={handleAdd}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">有効</TableHead>
          <TableHead className="min-w-32">名前</TableHead>
          <TableHead className="w-32">対象者</TableHead>
          <TableHead className="w-36">カテゴリ</TableHead>
          <TableHead className="w-24">退職年齢</TableHead>
          <TableHead className="w-28">退職金</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((event) => {
          const patch = (changes: Partial<RetirementEvent>) =>
            updateEvent(planId, event.id, () => ({ ...event, ...changes }));
          return (
            <TableRow key={event.id} className={event.enabled ? "" : "opacity-50"}>
              <TableCell>
                <EnabledCell planId={planId} eventId={event.id} enabled={event.enabled} />
              </TableCell>
              <TableCell>
                <Input
                  value={event.label}
                  placeholder="名称未設定"
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <PersonSelect
                  persons={persons}
                  value={event.personId}
                  onChange={(personId) => patch({ personId })}
                />
              </TableCell>
              <TableCell>
                <CategorySelect
                  categories={categories}
                  value={event.category}
                  onChange={(category) => patch({ category })}
                />
              </TableCell>
              <TableCell>
                <AgeInput value={event.retireAge} onChange={(retireAge) => patch({ retireAge })} />
              </TableCell>
              <TableCell>
                <AmountInput value={event.lumpSum} onChange={(lumpSum) => patch({ lumpSum })} />
              </TableCell>
              <TableCell>
                <RowActions planId={planId} eventId={event.id} />
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && <EmptyRow colSpan={7} label="退職金イベントがありません" />}
      </TableBody>
    </TableSection>
  );
}

// --- 保険 -------------------------------------------------------------

export function InsuranceTable({
  planId,
  events,
  persons,
}: {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
}) {
  const categories = useCategoriesByDirection("out");
  const items = events.filter((e): e is InsuranceEvent => e.kind === "insurance");

  const handleAdd = () => {
    const event: InsuranceEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: categories.find((c) => c.id === "insurance")?.id ?? categories[0]?.id ?? "",
      kind: "insurance",
      insuredId: persons[0]?.id ?? "",
      annualPremium: 0,
      premiumUntilAge: 60,
    };
    addEvent(planId, event);
  };

  return (
    <TableSection title="保険" addLabel="保険を追加" onAdd={handleAdd}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">有効</TableHead>
          <TableHead className="min-w-32">名前</TableHead>
          <TableHead className="w-32">被保険者</TableHead>
          <TableHead className="w-36">カテゴリ</TableHead>
          <TableHead className="w-28">年間保険料</TableHead>
          <TableHead className="w-24">払込満了</TableHead>
          <TableHead className="w-32">満期金</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((event) => {
          const patch = (changes: Partial<InsuranceEvent>) =>
            updateEvent(planId, event.id, () => ({ ...event, ...changes }));
          return (
            <TableRow key={event.id} className={event.enabled ? "" : "opacity-50"}>
              <TableCell>
                <EnabledCell planId={planId} eventId={event.id} enabled={event.enabled} />
              </TableCell>
              <TableCell>
                <Input
                  value={event.label}
                  placeholder="名称未設定"
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <PersonSelect
                  persons={persons}
                  value={event.insuredId}
                  onChange={(insuredId) => patch({ insuredId })}
                />
              </TableCell>
              <TableCell>
                <CategorySelect
                  categories={categories}
                  value={event.category}
                  onChange={(category) => patch({ category })}
                />
              </TableCell>
              <TableCell>
                <AmountInput
                  value={event.annualPremium}
                  onChange={(annualPremium) => patch({ annualPremium })}
                />
              </TableCell>
              <TableCell>
                <AgeInput
                  value={event.premiumUntilAge}
                  onChange={(premiumUntilAge) => patch({ premiumUntilAge })}
                />
              </TableCell>
              <TableCell>
                <MaturityPopover
                  maturity={event.maturity}
                  onChange={(maturity) => patch({ maturity })}
                />
              </TableCell>
              <TableCell>
                <RowActions planId={planId} eventId={event.id} />
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && <EmptyRow colSpan={8} label="保険イベントがありません" />}
      </TableBody>
    </TableSection>
  );
}

// --- 共通の小さな入力セル ----------------------------------------------

function AmountInput({
  value,
  onChange,
  suffix = "万円",
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input type="number" value={value} onChange={(e) => onChange(e.target.valueAsNumber || 0)} />
      <span className="whitespace-nowrap text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}

function AgeInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Input type="number" value={value} onChange={(e) => onChange(e.target.valueAsNumber || 0)} />
      <span className="text-xs text-muted-foreground">歳</span>
    </div>
  );
}

function TimingPopover({
  label,
  value,
  persons,
  onChange,
}: {
  label: string;
  value: HousingBuyEvent["timing"];
  persons: Person[];
  onChange: (value: HousingBuyEvent["timing"]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <TimingSummaryBadge value={value} persons={persons} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <TimingField label={label} value={value} onChange={onChange} persons={persons} />
      </PopoverContent>
    </Popover>
  );
}

function TimingSummaryBadge({
  value,
  persons,
}: {
  value: HousingBuyEvent["timing"];
  persons: Person[];
}) {
  const text =
    value.type === "year"
      ? `${value.year}年`
      : value.type === "offset"
        ? `${value.years}年後`
        : `${persons.find((p) => p.id === value.personId)?.name ?? "?"}が${value.age}歳`;
  return (
    <Badge variant="secondary" className="pointer-events-none">
      {text}
    </Badge>
  );
}

function LoansPopover({
  loans,
  onChange,
}: {
  loans: HousingBuyEvent["loans"];
  onChange: (loans: HousingBuyEvent["loans"]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <Badge variant="secondary" className="pointer-events-none">
            {loans.length}件
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <LoanListField loans={loans} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * 共益費（金額）とその終了時期を、価格・自己資金などとは別枠でまとめて編集する。
 * 終了時期を個別指定しない場合は試算終了年まで発生し続ける。
 */
function MaintenancePopover({
  maintenanceAnnual,
  maintenanceUntil,
  persons,
  onChange,
}: {
  maintenanceAnnual: number;
  maintenanceUntil: Timing | undefined;
  persons: Person[];
  onChange: (changes: {
    maintenanceAnnual?: number;
    maintenanceUntil?: Timing | undefined;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <Badge variant="secondary" className="pointer-events-none">
            {formatMan(maintenanceAnnual)}/年
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">共益費（万円/年）</span>
            <Input
              type="number"
              value={maintenanceAnnual}
              onChange={(e) => onChange({ maintenanceAnnual: e.target.valueAsNumber || 0 })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={maintenanceUntil !== undefined}
              onCheckedChange={(checked) =>
                onChange({
                  maintenanceUntil: checked ? { type: "offset", years: 10 } : undefined,
                })
              }
            />
            <span className="text-muted-foreground">終了時期を個別に指定する</span>
          </label>
          {maintenanceUntil ? (
            <TimingField
              label="共益費の終了時期"
              value={maintenanceUntil}
              onChange={(timing) => onChange({ maintenanceUntil: timing })}
              persons={persons}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              未指定の場合、試算終了年まで発生し続けます。
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MaturityPopover({
  maturity,
  onChange,
}: {
  maturity: InsuranceEvent["maturity"];
  onChange: (maturity: InsuranceEvent["maturity"]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <Badge variant="secondary" className="pointer-events-none">
            {maturity ? `${formatMan(maturity.amount)}（${maturity.age}歳）` : "なし"}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">満期金額（万円、0で満期金なし）</span>
            <Input
              type="number"
              value={maturity?.amount ?? 0}
              onChange={(e) => {
                const amount = e.target.valueAsNumber || 0;
                onChange(amount > 0 ? { age: maturity?.age ?? 99, amount } : undefined);
              }}
            />
          </label>
          {maturity && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">満期年齢</span>
              <Input
                type="number"
                value={maturity.age}
                onChange={(e) =>
                  onChange({ age: e.target.valueAsNumber || 0, amount: maturity.amount })
                }
              />
            </label>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
