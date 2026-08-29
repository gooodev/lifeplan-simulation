import { useRef } from "react";
import { LuDownload, LuFileJson, LuUpload } from "react-icons/lu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { importPlans } from "@/store/collections";
import { useActivePlanId, useCategories, usePlans } from "@/store/hooks";
import { deserializePlans, serializePlans } from "../io/serialize";

/** ヘッダーに置く、JSONエクスポート・インポートをまとめたメニュー。 */
export function JsonMenu() {
  const plans = usePlans();
  const activePlanId = useActivePlanId();
  const categories = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = serializePlans(plans, activePlanId, categories);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lifeplan-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("JSONをエクスポートしました");
  };

  const importFile = async (file: File): Promise<void> => {
    const text = await file.text();
    const result = deserializePlans(text);
    if (!result.ok) {
      toast.error(`インポートに失敗しました: ${result.error}`);
      return;
    }
    importPlans(result.data.plans, result.data.activePlanId, result.data.categories);
    toast.success("JSONをインポートしました");
  };

  const handleImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void importFile(file);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <LuFileJson />
            データ
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExport}>
            <LuDownload />
            JSONエクスポート
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <LuUpload />
            JSONインポート
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportChange}
      />
    </>
  );
}
