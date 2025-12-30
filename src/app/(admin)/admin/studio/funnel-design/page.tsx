"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, GitBranch, Download, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FUNNEL_TYPES = [
    { value: "tripwire", label: "トリップワイヤー型" },
    { value: "webinar", label: "ウェビナー型" },
    { value: "challenge", label: "チャレンジ型" },
    { value: "book", label: "書籍・電子書籍型" },
];

interface FunnelStep {
    stage: string;
    name: string;
    description: string;
    content: string;
    price?: string;
}

interface FunnelDesign {
    type: string;
    steps: FunnelStep[];
    estimatedConversion: string;
    keyMetrics: string[];
}

export default function FunnelDesignPage() {
    const [product, setProduct] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [funnelType, setFunnelType] = useState("tripwire");
    const [mainProductPrice, setMainProductPrice] = useState("");
    const [loading, setLoading] = useState(false);
    const [funnel, setFunnel] = useState<FunnelDesign | null>(null);

    const handleGenerate = async () => {
        if (!product.trim()) return;
        setLoading(true);

        try {
            const selectedType = FUNNEL_TYPES.find(t => t.value === funnelType);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `マーケティングファネルを設計してください。

メイン商品: ${product}
メイン商品価格: ${mainProductPrice || "未定"}
ターゲット: ${targetAudience || "未指定"}
ファネルタイプ: ${selectedType?.label}

以下のJSON形式で出力（コードブロックなし）:
{
  "type": "ファネルタイプ名",
  "steps": [
    {
      "stage": "認知",
      "name": "ステップ名（例: リードマグネット）",
      "description": "このステップの目的",
      "content": "具体的なコンテンツ・施策",
      "price": "無料 or 価格"
    }
  ],
  "estimatedConversion": "全体のコンバージョン予測",
  "keyMetrics": ["追跡すべきKPI1", "KPI2", "KPI3"]
}

※認知→興味→検討→購入→リピートの流れで
※各ステップは具体的に
※アップセル・クロスセルも含める`,
                    system: "あなたはDRM（ダイレクトレスポンスマーケティング）のエキスパートです。"
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                try {
                    const jsonMatch = data.data.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setFunnel(parsed);
                    }
                } catch {
                    console.error("Parse error");
                }
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!funnel) return;
        const text = `【${funnel.type}ファネル設計】

${funnel.steps.map((s, i) => `${i + 1}. ${s.stage}: ${s.name}
   目的: ${s.description}
   内容: ${s.content}
   価格: ${s.price || "N/A"}`).join("\n\n")}

■ 予測コンバージョン: ${funnel.estimatedConversion}
■ KPI: ${funnel.keyMetrics.join(", ")}`;
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <GitBranch className="h-6 w-6 text-primary" />
                    マーケティングファネル自動設計
                </h1>
                <p className="text-muted-foreground">売れるファネル構造をAIで自動生成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>メイン商品・サービス *</Label>
                            <Textarea
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
                                placeholder="例: 高単価コンサルティング（月50万円）"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ターゲット</Label>
                            <Input
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="例: 起業家、経営者"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ファネルタイプ</Label>
                                <Select value={funnelType} onValueChange={setFunnelType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {FUNNEL_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>メイン商品価格</Label>
                                <Input
                                    value={mainProductPrice}
                                    onChange={(e) => setMainProductPrice(e.target.value)}
                                    placeholder="例: 50万円"
                                />
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !product.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "ファネルを設計"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>ファネル設計</CardTitle>
                        {funnel && (
                            <Button size="sm" variant="outline" onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" />コピー
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {funnel ? (
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    {funnel.steps.map((step, i) => (
                                        <div key={i} className="flex items-center">
                                            <div className="p-3 bg-primary/10 rounded-lg text-center min-w-[120px]">
                                                <Badge variant="outline" className="mb-1">{step.stage}</Badge>
                                                <p className="font-medium text-sm">{step.name}</p>
                                                {step.price && <p className="text-xs text-muted-foreground">{step.price}</p>}
                                            </div>
                                            {i < funnel.steps.length - 1 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {funnel.steps.map((step, i) => (
                                        <div key={i} className="p-3 border rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge>{i + 1}</Badge>
                                                <span className="font-medium">{step.stage}: {step.name}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-1">{step.description}</p>
                                            <p className="text-sm">{step.content}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="font-medium mb-2">予測コンバージョン: {funnel.estimatedConversion}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {funnel.keyMetrics.map((metric, i) => (
                                            <Badge key={i} variant="secondary">{metric}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>ファネル設計がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
