"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Mail, Download } from "lucide-react";

const FRAMEWORKS = [
    { value: "aida", label: "AIDA（注意→興味→欲求→行動）" },
    { value: "pas", label: "PASの法則（問題→煽り→解決）" },
    { value: "quest", label: "QUEST（適格→理解→教育→刺激→移行）" },
];

const PRICE_RANGES = [
    { value: "low", label: "低価格（〜1万円）" },
    { value: "mid", label: "中価格（1〜10万円）" },
    { value: "high", label: "高価格（10万円〜）" },
];

export default function SalesLetterPage() {
    const [productName, setProductName] = useState("");
    const [productDescription, setProductDescription] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [framework, setFramework] = useState("aida");
    const [priceRange, setPriceRange] = useState("mid");
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");

    const handleGenerate = async () => {
        if (!productName.trim() || !productDescription.trim()) return;
        setLoading(true);

        try {
            const selectedFramework = FRAMEWORKS.find(f => f.value === framework);
            const selectedPrice = PRICE_RANGES.find(p => p.value === priceRange);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `セールスレターを作成してください。

商品名: ${productName}
商品説明: ${productDescription}
ターゲット: ${targetAudience || "未指定"}
価格帯: ${selectedPrice?.label}
フレームワーク: ${selectedFramework?.label}

構成:
1. ヘッドライン（強烈な一文）
2. サブヘッドライン
3. 問題提起・共感
4. ストーリー・体験談
5. 解決策としての商品紹介
6. ベネフィット（5〜7個）
7. 特典
8. 価格提示
9. 保証
10. 限定性・緊急性
11. CTA（行動喚起）
12. PS

※読者の感情に訴えかける文章で
※具体的な数字を入れる
※Markdown形式で出力`,
                    system: "あなたは日本トップクラスのセールスコピーライターです。"
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                setContent(data.data);
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => navigator.clipboard.writeText(content);

    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-letter-${productName.slice(0, 20).replace(/\s+/g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Mail className="h-6 w-6 text-primary" />
                    セールスレターライティング
                </h1>
                <p className="text-muted-foreground">売れるセールスレターをAIで作成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>商品情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>商品・サービス名 *</Label>
                            <Input
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="例: 副業マスター講座"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>商品説明 *</Label>
                            <Textarea
                                value={productDescription}
                                onChange={(e) => setProductDescription(e.target.value)}
                                placeholder="商品の特徴、提供内容を詳しく..."
                                rows={4}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>フレームワーク</Label>
                                <Select value={framework} onValueChange={setFramework}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {FRAMEWORKS.map(f => (
                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>価格帯</Label>
                                <Select value={priceRange} onValueChange={setPriceRange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PRICE_RANGES.map(p => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !productName.trim() || !productDescription.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "セールスレターを生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>生成結果</CardTitle>
                        {content && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleCopy}>
                                    <Copy className="h-4 w-4 mr-2" />コピー
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />MD
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {content ? (
                            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[600px] font-mono text-sm" />
                        ) : (
                            <div className="h-[600px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>セールスレターがここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
