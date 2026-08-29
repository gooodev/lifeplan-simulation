import { LuPlus, LuTrash2 } from "react-icons/lu";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addCategory,
  isCategoryInUse,
  removeCategory,
  renameCategory,
  setEventDisplayThreshold,
} from "@/store/collections";
import { useCategoriesByDirection, useEventDisplayThreshold } from "@/store/hooks";

/** カテゴリ（収入・支出の分類）の管理と、年表・キャッシュフロー表の表示設定画面。 */
export function SettingsTab() {
  return (
    <div className="flex flex-col gap-6">
      <EventDisplayThresholdCard />
      <CategoryCard direction="in" title="収入カテゴリ" />
      <CategoryCard direction="out" title="支出カテゴリ" />
    </div>
  );
}

function EventDisplayThresholdCard() {
  const threshold = useEventDisplayThreshold();

  return (
    <Card>
      <CardHeader>
        <CardTitle>年表・キャッシュフロー表の表示設定</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">主なイベントとして表示する金額の下限</span>
          <div className="flex max-w-xs items-center gap-1.5">
            <Input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setEventDisplayThreshold(Math.max(0, e.target.valueAsNumber || 0))}
            />
            <span className="whitespace-nowrap text-xs text-muted-foreground">万円以上</span>
          </div>
        </label>
        <p className="text-xs text-muted-foreground">
          年表の「主なイベント」欄で、この金額未満の収入・支出イベントを非表示にします（住宅購入などの大型イベントだけ確認したい場合に設定してください）。0にするとすべて表示します。ライフイベント（記念日など金額のないもの）は常に表示されます。
        </p>
      </CardContent>
    </Card>
  );
}

function CategoryCard({ direction, title }: { direction: "in" | "out"; title: string }) {
  const categories = useCategoriesByDirection(direction);
  const [newLabel, setNewLabel] = useState("");
  const [blockedId, setBlockedId] = useState<string | null>(null);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) {
      return;
    }
    addCategory(label, direction);
    setNewLabel("");
  };

  const handleRemove = (categoryId: string) => {
    const removed = removeCategory(categoryId);
    if (!removed) {
      setBlockedId(categoryId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Input
                    value={category.label}
                    onChange={(e) => renameCategory(category.id, e.target.value)}
                  />
                  {blockedId === category.id && (
                    <Badge variant="destructive" className="mt-1">
                      使用中のため削除できません
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isCategoryInUse(category.id)}
                    onClick={() => handleRemove(category.id)}
                    title={
                      isCategoryInUse(category.id) ? "イベントで使用中のため削除できません" : "削除"
                    }
                  >
                    <LuTrash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex gap-2">
          <Input
            value={newLabel}
            placeholder="新しいカテゴリ名"
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button onClick={handleAdd}>
            <LuPlus />
            追加
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
