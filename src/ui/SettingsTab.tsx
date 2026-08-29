import { LuPlus, LuTrash2 } from "react-icons/lu";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GEMINI_MODEL_OPTIONS } from "@/lib/pageAgent";
import {
  addCategory,
  isCategoryInUse,
  removeCategory,
  renameCategory,
  setEventDisplayThreshold,
  setPageAgentSettings,
} from "@/store/collections";
import {
  useCategoriesByDirection,
  useEventDisplayThreshold,
  usePageAgentSettings,
} from "@/store/hooks";

/** カテゴリ（収入・支出の分類）の管理、年表・キャッシュフロー表の表示設定、AIアシスタント設定の画面。 */
export function SettingsTab() {
  return (
    <div className="flex flex-col gap-6">
      <EventDisplayThresholdCard />
      <CategoryCard direction="in" title="収入カテゴリ" />
      <CategoryCard direction="out" title="支出カテゴリ" />
      <PageAgentCard />
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

/** 自然言語で画面操作を行うAIアシスタント（page-agent）の設定。Google Gemini APIを使用する。 */
function PageAgentCard() {
  const settings = usePageAgentSettings();
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.apiKey);

  // ページ再読み込み・他タブでの変更に追従する（入力中の値を上書きしないよう settings.apiKey だけを見る）。
  useEffect(() => {
    setApiKeyDraft(settings.apiKey);
  }, [settings.apiKey]);

  const commitApiKey = () => {
    const apiKey = apiKeyDraft.trim();
    setApiKeyDraft(apiKey);
    if (apiKey !== settings.apiKey) {
      setPageAgentSettings({ ...settings, apiKey });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AIアシスタント（PageAgent）</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          自然言語の指示で画面操作を行うAIアシスタントです（
          <a
            href="https://github.com/alibaba/page-agent"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            page-agent
          </a>
          ・Google Gemini APIを使用）。有効にすると、画面の表示内容と操作結果がGoogleのGemini
          APIに送信されます。APIキーはこのブラウザにのみ保存されます。
        </p>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span>有効にする</span>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => setPageAgentSettings({ ...settings, enabled })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Gemini APIキー</span>
          <Input
            type="password"
            autoComplete="off"
            value={apiKeyDraft}
            placeholder="AIzaSy..."
            onChange={(e) => setApiKeyDraft(e.target.value)}
            onBlur={commitApiKey}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">モデル</span>
          <Select
            value={settings.model}
            onValueChange={(model) => setPageAgentSettings({ ...settings, model })}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GEMINI_MODEL_OPTIONS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </CardContent>
    </Card>
  );
}
