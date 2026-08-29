import { Link, createFileRoute } from "@tanstack/react-router";
import { LuPiggyBank, LuTrendingDown, LuTrendingUp, LuTriangleAlert } from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivePlan } from "@/store/hooks";
import { sumAssets } from "@/domain/finance";
import { BalanceChart } from "@/ui/output/BalanceChart";
import { useCashflow } from "@/ui/useCashflow";
import { formatMan } from "@/ui/format";
import { NAV_GROUPS } from "@/ui/nav";

export const Route = createFileRoute("/_app/")({
  component: DashboardHome,
});

function DashboardHome() {
  const plan = useActivePlan();
  const rows = useCashflow(plan ?? undefined);

  if (!plan) {
    return null;
  }

  const first = rows[0];
  const last = rows.at(-1);
  const minRow = rows.reduce((min, row) => (row.balance < min.balance ? row : min), rows[0]);
  const hasShortfall = minRow && minRow.balance < 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
        <p className="text-sm text-muted-foreground">
          {plan.baseYear}年〜{plan.endYear}年の試算
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={LuPiggyBank}
          label="現在の資産合計"
          value={formatMan(sumAssets(plan.assets))}
        />
        <StatCard
          icon={first && first.netFlow < 0 ? LuTrendingDown : LuTrendingUp}
          label={`${plan.baseYear}年の収支`}
          value={first ? formatMan(first.netFlow) : "-"}
        />
        <StatCard
          icon={LuTrendingUp}
          label={`${plan.endYear}年の貯蓄残高`}
          value={last ? formatMan(last.balance) : "-"}
        />
        {hasShortfall ? (
          <StatCard
            icon={LuTriangleAlert}
            label={`${minRow.year}年に残高がマイナスに`}
            value={formatMan(minRow.balance)}
            tone="danger"
          />
        ) : (
          <StatCard
            icon={LuPiggyBank}
            label="試算期間中の最小残高"
            value={minRow ? formatMan(minRow.balance) : "-"}
          />
        )}
      </div>

      <BalanceChart plan={plan} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NAV_GROUPS.map((group) => (
          <Card key={group.label}>
            <CardHeader>
              <CardTitle>{group.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-foreground hover:bg-accent"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p
            className={`text-lg font-semibold ${tone === "danger" ? "text-destructive" : "text-foreground"}`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
