import { useState } from "react";
import { LuChevronsUpDown, LuCopy, LuPalette, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  addPlan,
  duplicatePlan,
  removePlan,
  renamePlan,
  setActivePlan,
  setPlanIcon,
} from "@/store/collections";
import { useActivePlanId, usePlans } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { PLAN_ICON_OPTIONS, getPlanIcon } from "./planIcons";

/** サイドバー上部に置く、プランの切替・追加・複製・改名・削除・アイコン変更をまとめたメニュー。 */
export function PlanSwitcher() {
  const plans = usePlans();
  const activePlanId = useActivePlanId();
  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? null;
  const ActiveIcon = getPlanIcon(activePlan?.icon);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const openRename = () => {
    if (!activePlan) {
      return;
    }
    setRenameValue(activePlan.name);
    setRenameOpen(true);
  };

  const handleRenameSave = () => {
    const name = renameValue.trim();
    if (activePlan && name) {
      renamePlan(activePlan.id, name);
    }
    setRenameOpen(false);
  };

  const handleAdd = () => {
    const newId = addPlan("新しいプラン");
    setActivePlan(newId);
  };

  const handleDuplicate = () => {
    if (!activePlan) {
      return;
    }
    const newId = duplicatePlan(activePlan.id, `${activePlan.name}のコピー`);
    if (newId) {
      setActivePlan(newId);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:justify-center">
                <ActiveIcon />
                <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{activePlan?.name ?? "プラン未選択"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {plans.length}件のプラン
                  </span>
                </div>
                <LuChevronsUpDown className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>プランを切り替え</DropdownMenuLabel>
              {plans.map((plan) => {
                const PlanIcon = getPlanIcon(plan.icon);
                return (
                  <DropdownMenuItem key={plan.id} onClick={() => setActivePlan(plan.id)}>
                    <PlanIcon className="shrink-0" />
                    <span className="flex-1 truncate">{plan.name}</span>
                    {plan.id === activePlanId && (
                      <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAdd}>
                <LuPlus />
                新規プラン
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate} disabled={!activePlan}>
                <LuCopy />
                プランを複製
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openRename} disabled={!activePlan}>
                <LuPencil />
                名前を変更
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!activePlan}>
                  <LuPalette />
                  アイコンを変更
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="grid w-48 grid-cols-4 gap-1 p-2">
                  {PLAN_ICON_OPTIONS.map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={() => {
                        if (activePlan) {
                          setPlanIcon(activePlan.id, key);
                        }
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground",
                        activePlan?.icon === key && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {plans.length > 1 && activePlan && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => removePlan(activePlan.id)}>
                    <LuTrash2 />
                    このプランを削除
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プラン名を変更</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            autoFocus
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRenameSave();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleRenameSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
