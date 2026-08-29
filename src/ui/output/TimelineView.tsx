import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEventDisplayThreshold } from "@/store/hooks";
import type { CashflowEventOccurrence, PlanInput } from "../../domain/types";
import { useCashflow } from "../useCashflow";

type TimelineViewProps = { plan: PlanInput };

/** 金額を持たない（marker）イベントは常に表示し、それ以外（金額が0の場合を含む）は閾値未満なら省く。 */
function isVisibleOccurrence(occurrence: CashflowEventOccurrence, threshold: number): boolean {
  if (occurrence.isMarker) {
    return true;
  }
  return Math.abs(occurrence.amount) >= threshold;
}

/** 年度別イベント表（PDF 2-1 相当）。西暦・全員の年齢・その年に発生するイベント名を一覧する。 */
export function TimelineView({ plan }: TimelineViewProps) {
  const rows = useCashflow(plan);
  const threshold = useEventDisplayThreshold();

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>西暦</TableHead>
            {plan.persons.map((person) => (
              <TableHead key={person.id}>{person.name}</TableHead>
            ))}
            <TableHead>主なイベント</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const visibleEvents = row.events.filter((e) => isVisibleOccurrence(e, threshold));
            return (
              <TableRow key={row.year} className={visibleEvents.length > 0 ? "bg-accent/40" : ""}>
                <TableCell className="tabular-nums">{row.year}</TableCell>
                {plan.persons.map((person) => (
                  <TableCell key={person.id} className="tabular-nums text-muted-foreground">
                    {row.ages[person.id]}歳
                  </TableCell>
                ))}
                <TableCell className="text-muted-foreground">
                  {visibleEvents.map((e) => e.label).join("、")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
