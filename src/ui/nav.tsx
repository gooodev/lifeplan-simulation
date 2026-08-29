import type { IconType } from "react-icons";
import {
  LuCalendarDays,
  LuChartLine,
  LuChartPie,
  LuHouse,
  LuLayoutDashboard,
  LuPartyPopper,
  LuScale,
  LuSettings,
  LuTable,
  LuTrendingUp,
  LuUsers,
  LuWallet,
} from "react-icons/lu";

export type NavItem = {
  to: string;
  label: string;
  icon: IconType;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "入力",
    items: [
      { to: "/family", label: "家族構成", icon: LuUsers },
      { to: "/current-status", label: "現在状況", icon: LuWallet },
      { to: "/income", label: "収入", icon: LuTrendingUp },
      { to: "/expense", label: "支出", icon: LuHouse },
      { to: "/life-events", label: "ライフイベント", icon: LuPartyPopper },
      { to: "/settings", label: "設定", icon: LuSettings },
    ],
  },
  {
    label: "出力",
    items: [
      { to: "/summary", label: "サマリー", icon: LuChartPie },
      { to: "/timeline", label: "年表", icon: LuCalendarDays },
      { to: "/cashflow", label: "キャッシュフロー", icon: LuTable },
      { to: "/breakdown", label: "カテゴリ別内訳", icon: LuChartLine },
      { to: "/compare", label: "プラン比較", icon: LuScale },
    ],
  },
];

export const HOME_NAV_ITEM: NavItem = { to: "/", label: "ダッシュボード", icon: LuLayoutDashboard };

export const ALL_NAV_ITEMS: NavItem[] = [
  HOME_NAV_ITEM,
  ...NAV_GROUPS.flatMap((group) => group.items),
];

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.to === pathname);
}
