import type { IconType } from "react-icons";
import {
  LuBriefcase,
  LuFolders,
  LuGem,
  LuGraduationCap,
  LuHeart,
  LuHouse,
  LuPiggyBank,
  LuRocket,
  LuSparkles,
  LuStar,
  LuSun,
  LuTarget,
  LuTreePalm,
  LuTreePine,
  LuTrendingUp,
  LuUsers,
} from "react-icons/lu";

/** プラン切替メニューで選べるアイコンの候補。 */
export const PLAN_ICON_OPTIONS: { key: string; icon: IconType; label: string }[] = [
  { key: "folders", icon: LuFolders, label: "フォルダ" },
  { key: "house", icon: LuHouse, label: "住宅" },
  { key: "piggy-bank", icon: LuPiggyBank, label: "貯蓄" },
  { key: "trending-up", icon: LuTrendingUp, label: "成長" },
  { key: "users", icon: LuUsers, label: "家族" },
  { key: "heart", icon: LuHeart, label: "ハート" },
  { key: "star", icon: LuStar, label: "スター" },
  { key: "sparkles", icon: LuSparkles, label: "きらめき" },
  { key: "target", icon: LuTarget, label: "目標" },
  { key: "rocket", icon: LuRocket, label: "ロケット" },
  { key: "gem", icon: LuGem, label: "宝石" },
  { key: "tree-palm", icon: LuTreePalm, label: "旅行" },
  { key: "graduation-cap", icon: LuGraduationCap, label: "教育" },
  { key: "briefcase", icon: LuBriefcase, label: "仕事" },
  { key: "sun", icon: LuSun, label: "太陽" },
  { key: "tree-pine", icon: LuTreePine, label: "自然" },
];

/** プランにアイコンが未設定（旧データなど）のときの既定アイコン。 */
export function getPlanIcon(key: string | undefined): IconType {
  return PLAN_ICON_OPTIONS.find((option) => option.key === key)?.icon ?? LuFolders;
}
