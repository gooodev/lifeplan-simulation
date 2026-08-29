import { createFileRoute } from "@tanstack/react-router";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { addPerson, removePerson, updatePerson } from "@/store/collections";
import { useActivePlan } from "@/store/hooks";
import type { Person, PersonRole } from "@/domain/types";
import { PERSON_ROLE_LABELS } from "@/ui/labels";

export const Route = createFileRoute("/_app/family")({
  component: FamilyPage,
});

const ROLE_OPTIONS = (Object.entries(PERSON_ROLE_LABELS) as [PersonRole, string][]).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

function FamilyPage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }

  const handleAdd = () => {
    addPerson(plan.id, {
      name: "新しい人物",
      role: "other",
      birthDate: `${plan.baseYear - 30}-01-01`,
      lifeEndAge: 90,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">家族構成</h3>
        <Button size="sm" onClick={handleAdd}>
          <LuPlus />
          人物を追加
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-32">名前</TableHead>
              <TableHead className="w-36">続柄</TableHead>
              <TableHead className="w-40">生年月日</TableHead>
              <TableHead className="w-36">試算対象年齢</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.persons.map((person) => {
              const patch = (changes: Partial<Person>) =>
                updatePerson(plan.id, person.id, (p) => ({ ...p, ...changes }));
              return (
                <TableRow key={person.id}>
                  <TableCell>
                    <Input
                      value={person.name}
                      placeholder="名称未設定"
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={person.role}
                      onValueChange={(role) => patch({ role: role as PersonRole })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={person.birthDate}
                      placeholder="YYYY-MM-DD"
                      onChange={(e) => patch({ birthDate: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={person.lifeEndAge}
                        onChange={(e) => patch({ lifeEndAge: e.target.valueAsNumber || 0 })}
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        歳まで
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removePerson(plan.id, person.id)}
                        title="削除"
                      >
                        <LuTrash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {plan.persons.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  家族構成が登録されていません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
