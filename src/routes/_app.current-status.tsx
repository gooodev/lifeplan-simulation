import { createFileRoute } from "@tanstack/react-router";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { sumAssets } from "@/domain/finance";
import { ASSET_CATEGORIES } from "@/domain/types";
import type { AssetCategory, CurrentAsset } from "@/domain/types";
import { createId } from "@/domain/id";
import { updatePlan } from "@/store/collections";
import { useActivePlan } from "@/store/hooks";
import { AssetTransferTable } from "@/ui/AssetTransferTable";
import { NumberField } from "@/ui/fields";
import { formatMan } from "@/ui/format";
import { ASSET_CATEGORY_LABELS } from "@/ui/labels";

export const Route = createFileRoute("/_app/current-status")({
  component: CurrentStatusPage,
});

const ASSET_CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORY_LABELS) as [AssetCategory, string][];

function CurrentStatusPage() {
  const plan = useActivePlan();
  if (!plan) {
    return null;
  }

  const handleAddAsset = () => {
    const asset: CurrentAsset = { id: createId(), label: "", category: "cash", amount: 0 };
    updatePlan(plan.id, (p) => ({ ...p, assets: [...p.assets, asset] }));
  };

  const patchAsset = (assetId: string, changes: Partial<CurrentAsset>) => {
    updatePlan(plan.id, (p) => ({
      ...p,
      assets: p.assets.map((asset) => (asset.id === assetId ? { ...asset, ...changes } : asset)),
    }));
  };

  const removeAsset = (assetId: string) => {
    updatePlan(plan.id, (p) => ({
      ...p,
      assets: p.assets.filter((asset) => asset.id !== assetId),
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>試算の範囲</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <NumberField
            label="試算開始年"
            value={plan.baseYear}
            suffix="西暦"
            onChange={(baseYear) => updatePlan(plan.id, (p) => ({ ...p, baseYear }))}
          />
          <NumberField
            label="試算終了年"
            value={plan.endYear}
            suffix="西暦"
            onChange={(endYear) => updatePlan(plan.id, (p) => ({ ...p, endYear }))}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            資産（試算開始時点。現金・投資・不動産などを区別して入力）
          </h3>
          <Button size="sm" onClick={handleAddAsset}>
            <LuPlus />
            資産を追加
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-32">名称</TableHead>
                <TableHead className="w-40">区分</TableHead>
                <TableHead className="w-40">金額</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Input
                      value={asset.label}
                      placeholder="名称未設定"
                      onChange={(e) => patchAsset(asset.id, { label: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={asset.category}
                      onValueChange={(category) =>
                        patchAsset(asset.id, { category: category as AssetCategory })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CATEGORY_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={asset.amount}
                        onChange={(e) =>
                          patchAsset(asset.id, { amount: e.target.valueAsNumber || 0 })
                        }
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">万円</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeAsset(asset.id)}
                        title="削除"
                      >
                        <LuTrash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {plan.assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    資産が登録されていません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-right text-sm text-foreground">
          資産合計: <span className="font-semibold">{formatMan(sumAssets(plan.assets))}</span>
        </p>
      </div>

      <AssetTransferTable
        planId={plan.id}
        events={plan.events}
        persons={plan.persons}
        baseYear={plan.baseYear}
      />

      <Card>
        <CardHeader>
          <CardTitle>前提条件</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              資産区分ごとの運用利回り（収支の余剰分は毎年 現金・預金
              に積み上がり、上の振替で他区分へ移せます）
            </span>
            <div className="flex flex-wrap gap-3">
              {ASSET_CATEGORIES.map((category) => (
                <NumberField
                  key={category}
                  label={ASSET_CATEGORY_LABELS[category]}
                  value={plan.assumptions.returnRateByCategory[category]}
                  step={0.1}
                  suffix="%/年"
                  onChange={(rate) =>
                    updatePlan(plan.id, (p) => ({
                      ...p,
                      assumptions: {
                        ...p.assumptions,
                        returnRateByCategory: {
                          ...p.assumptions.returnRateByCategory,
                          [category]: rate,
                        },
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>
          <NumberField
            label="手取り換算率"
            value={plan.assumptions.takeHomeRate}
            step={1}
            suffix="%（既定100%=PDF互換）"
            onChange={(takeHomeRate) =>
              updatePlan(plan.id, (p) => ({
                ...p,
                assumptions: { ...p.assumptions, takeHomeRate },
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            額面年収をそのまま収入計上する場合は手取り換算率100%のままにし、実態に近づけたい場合は70〜80%程度に下げてください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
