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
import type { LifeEvent, MarkerEvent, Person, Timing } from "../domain/types";
import { TimingField } from "./compositeFields";

type MarkerEventsTableProps = {
  planId: string;
  events: LifeEvent[];
  persons: Person[];
  baseYear: number;
};

/**
 * 支出の伴わないライフイベント（記念日・節目など、金額を持たないマーカー）専用の表。
 * 収入・支出のどちらにも属さないため、別画面で独立して管理する。
 */
export function MarkerEventsTable({ planId, events, persons, baseYear }: MarkerEventsTableProps) {
  const items = events.filter((e): e is MarkerEvent => e.kind === "marker");

  const handleAdd = () => {
    const event: MarkerEvent = {
      id: createId(),
      label: "",
      enabled: true,
      category: "other",
      kind: "marker",
      timing: { type: "year", year: baseYear },
    };
    addEvent(planId, event);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          ライフイベント（記念日・節目など）
        </h3>
        <Button size="sm" onClick={handleAdd}>
          <LuPlus />
          イベントを追加
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">有効</TableHead>
              <TableHead className="min-w-32">名前</TableHead>
              <TableHead className="w-32">対象者</TableHead>
              <TableHead className="w-36">時期</TableHead>
              <TableHead className="min-w-32">メモ</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((event) => {
              const patch = (changes: Partial<MarkerEvent>) =>
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
                      placeholder="名称未設定"
                      onChange={(e) => patch({ label: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={event.subjectId ?? ""}
                      onValueChange={(subjectId) => patch({ subjectId: subjectId || undefined })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="世帯全体" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">世帯全体</SelectItem>
                        {persons.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TimingPopover
                      value={event.timing}
                      persons={persons}
                      onChange={(timing) => patch({ timing })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={event.note ?? ""}
                      onChange={(e) => patch({ note: e.target.value || undefined })}
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
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  ライフイベントがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TimingPopover({
  value,
  persons,
  onChange,
}: {
  value: Timing;
  persons: Person[];
  onChange: (value: Timing) => void;
}) {
  const [open, setOpen] = useState(false);
  const text =
    value.type === "year"
      ? `${value.year}年`
      : value.type === "offset"
        ? `${value.years}年後`
        : `${persons.find((p) => p.id === value.personId)?.name ?? "?"}が${value.age}歳`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-normal">
          <Badge variant="secondary" className="pointer-events-none">
            {text}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <TimingField label="発生時期" value={value} onChange={onChange} persons={persons} />
      </PopoverContent>
    </Popover>
  );
}
