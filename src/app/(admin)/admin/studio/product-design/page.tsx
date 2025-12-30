"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Package, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BUSINESS_TYPES = [
    { value: "digital", label: "デジタル商品" },
    { value: "coaching", label: "コーチング・コンサル" },
    { value: "subscription", label: "サブスクリプション" },
    { value: "course", label: "オンライン講座" },
];

interface ProductDesign {
    name: string;
    description: string;
    features: string[];
    pricing: string;
    targetAudience: string;
    uniqueValue: string;
}

export default function ProductDesignPage() {
    const [niche, setNiche] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [businessType, setBusinessType] = useState("digital");
    const [budget, setBudget] = useState("");
    const [loading, setLoading] = useState(false);
    const [designs, setDesigns] = useState<ProductDesign[]>([]);

    const handleGenerate = async () => {
        if (!niche.trim()) return;
        setLoading(true);

        try {
            const selectedType = BUSINESS_TYPES.find(t => t.value === businessType);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `商品・サービスの設計案を3つ提案してください。

ニッチ・分野: ${niche}
ターゲット: ${targetAudience || "未指定"}
ビジネスタイプ: ${selectedType?.label}
予算感: ${budget || "未指定"}

以下のJSON形式で出力（コードブロックなし）:
[
  {
    "name": "商品名",
    "description": "50文字以内の説明",
    "features": ["特徴1", "特徴2", "特徴3"],
    "pricing": "価格または価格帯",
    "targetAudience": "具体的なターゲット",
    "uniqueValue": "独自の価値・差別化ポイント"
  }
]

※実現可能で売れる商品を提案
※それぞれ異なるアプローチで`,
                    system: "あなたは商品企画のプロフェッショナルです。"
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                try {
                    const jsonMatch = data.data.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setDesigns(parsed);
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

    const handleCopy = (design: ProductDesign) => {
        const text = `【${design.name}】
${design.description}

■ 特徴
${design.features.map(f => `・${f}`).join("\n")}

■ ターゲット: ${design.targetAudience}
■ 価格: ${design.pricing}
■ 独自価値: ${design.uniqueValue}`;
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    商品・サービス自動設計
                </h1>
                <p className="text-muted-foreground">売れる商品・サービスのアイデアをAIで自動生成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>ニッチ・分野 *</Label>
                            <Textarea
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                placeholder="例: AI×副業、健康×40代女性..."
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ターゲット</Label>
                            <Input
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="例: 副業を始めたい会社員"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ビジネスタイプ</Label>
                            <Select value={businessType} onValueChange={setBusinessType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {BUSINESS_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>顧客の予算感</Label>
                            <Input
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="例: 3〜10万円"
                            />
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !niche.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "商品アイデアを生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>商品アイデア（3案）</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {designs.length > 0 ? (
                            <div className="space-y-4">
                                {designs.map((design, i) => (
                                    <div key={i} className="p-4 border rounded-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <Badge className="mb-2">案{i + 1}</Badge>
                                                <h3 className="font-bold text-lg">{design.name}</h3>
                                                <p className="text-sm text-muted-foreground">{design.description}</p>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => handleCopy(design)}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">特徴</Label>
                                                <ul className="list-disc list-inside">
                                                    {design.features.map((f, j) => <li key={j}>{f}</li>)}
                                                </ul>
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">価格</Label>
                                                    <p className="font-medium">{design.pricing}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">独自価値</Label>
                                                    <p className="text-primary">{design.uniqueValue}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>商品アイデアがここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
