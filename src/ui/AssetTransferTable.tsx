import { useState } from "react";
import { LuCopy, LuPlus, LuTrash2 } from "react-icons/lu";
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
import { createId } from "../domain/id";
import type { AssetCategory, AssetTransferEvent, LifeEvent, Period, Person } from "../domain/types";
import { PeriodField } from "./compositeFields";
import { formatPeriodSummary } from "./format";
import { ASSET_CATEGORY_LABELS } from "./labels";

const ASSET_CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORY_LABELS) as [AssetCategory, string][];

type AssetTransferTableProps = {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
  baseYear: number;
};

/**
 * 資産区分間の定期的な付け替え（例: 毎月の積立NISA拠出＝現金→投資）。
 * 収支（収入・支出）には一切計上せず、資産の内訳だけを動かす。
 */
export function AssetTransferTable({ planId, events, persons, baseYear }: AssetTransferTableProps) {
  const items = events.filter((e): e is AssetTransferEvent => e.kind === "assetTransfer");

  const handleAdd = () => {
    const event: AssetTransferEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: "other",
      kind: "assetTransfer",
      fromCategory: "cash",
      toCategory: "investment",
      period: { start: { type: "year", year: baseYear }, intervalYears: 1 },
      amount: 0,
    };
    addEvent(planId, event);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          資産の定期振替（積立NISAなど。収支には計上されません）
        </h3>
        <Button size="sm" onClick={handleAdd}>
          <LuPlus />
          振替を追加
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">有効</TableHead>
              <TableHead className="min-w-32">名前</TableHead>
              <TableHead className="w-36">振替元</TableHead>
              <TableHead className="w-36">振替先</TableHead>
              <TableHead className="w-32">金額</TableHead>
              <TableHead className="w-40">期間</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((event) => {
              const patch = (changes: Partial<AssetTransferEvent>) =>
                updateEvent(planId, event.id, () => ({ ...event, ...changes }));
              return (
                <TableRow key={event.id} className={event.enabled ? "" : "opacity-50"}>
                  <TableCell>
                    <Checkbox
                      checked={event.enabled}
                      onCheckedChange={() => toggleEvent(planId, event.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={event.label}
                      placeholder="例: 積立NISA"
                      onChange={(e) => patch({ label: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <CategoryPicker
                      value={event.fromCategory}
                      onChange={(fromCategory) => patch({ fromCategory })}
                    />
                  </TableCell>
                  <TableCell>
                    <CategoryPicker
                      value={event.toCategory}
                      onChange={(toCategory) => patch({ toCategory })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={event.amount}
                        onChange={(e) => patch({ amount: e.target.valueAsNumber || 0 })}
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        万円/年
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PeriodPopover
                      period={event.period}
                      persons={persons}
                      onChange={(period) => patch({ period })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => duplicateEvent(planId, event.id)}
                        title="複製"
                      >
                        <LuCopy />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeEvent(planId, event.id)}
                        title="削除"
                      >
                        <LuTrash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  資産振替がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        金額は年間換算で入力してください（例: 毎月3万円の積立 →
        年36万円）。振替元の残高が不足していてもマイナスのまま計算されます。
      </p>
    </div>
  );
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: AssetCategory;
  onChange: (value: AssetCategory) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AssetCategory)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSET_CATEGORY_OPTIONS.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PeriodPopover({
  period,
  persons,
  onChange,
}: {
  period: Period;
  persons: Person[];
  onChange: (period: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <Badge variant="secondary" className="pointer-events-none">
            {formatPeriodSummary(period, persons)}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <PeriodField value={period} onChange={onChange} persons={persons} />
      </PopoverContent>
    </Popover>
  );
}
