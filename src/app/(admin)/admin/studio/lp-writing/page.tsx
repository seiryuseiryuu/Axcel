"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Layout, Download } from "lucide-react";

const LP_TYPES = [
    { value: "opt-in", label: "オプトイン（リスト獲得）" },
    { value: "sales", label: "セールス（販売）" },
    { value: "webinar", label: "ウェビナー登録" },
    { value: "consulting", label: "相談・問い合わせ" },
];

export default function LPWritingPage() {
    const [productName, setProductName] = useState("");
    const [offer, setOffer] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [lpType, setLpType] = useState("sales");
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");

    const handleGenerate = async () => {
        if (!productName.trim() || !offer.trim()) return;
        setLoading(true);

        try {
            const selectedType = LP_TYPES.find(t => t.value === lpType);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `LP（ランディングページ）のコピーを作成してください。

商品・サービス: ${productName}
オファー内容: ${offer}
ターゲット: ${targetAudience || "未指定"}
LPタイプ: ${selectedType?.label}

以下のセクションを含めてください:
1. ファーストビュー（ヘッドライン + サブヘッド + CTA）
2. 問題提起セクション
3. 解決策セクション
4. 商品・サービス説明
5. ベネフィット（5個）
6. 実績・証拠
7. お客様の声（3件分のテンプレート）
8. よくある質問（5個）
9. 価格・プラン
10. 最終CTA

※HTML/CSSではなく、テキストコピーのみ
※各セクションに見出しを付ける
※Markdown形式で出力`,
                    system: "あなたはコンバージョン率の高いLPを作成するプロのコピーライターです。"
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
        a.download = `lp-copy-${productName.slice(0, 20).replace(/\s+/g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Layout className="h-6 w-6 text-primary" />
                    LPライティング
                </h1>
                <p className="text-muted-foreground">コンバージョンするLPのコピーをAIで作成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>商品・サービス名 *</Label>
                            <Input
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="例: AI副業スクール"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>オファー内容 *</Label>
                            <Textarea
                                value={offer}
                                onChange={(e) => setOffer(e.target.value)}
                                placeholder="提供する価値、特典など..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ターゲット</Label>
                            <Input
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="例: 30代会社員"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>LPタイプ</Label>
                            <Select value={lpType} onValueChange={setLpType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {LP_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !productName.trim() || !offer.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "LPコピーを生成"}
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
                                    <Layout className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>LPコピーがここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
