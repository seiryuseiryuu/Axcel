"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, MonitorPlay, Download } from "lucide-react";

const VSL_LENGTHS = [
    { value: "short", label: "ショート（5〜10分）" },
    { value: "medium", label: "ミディアム（15〜30分）" },
    { value: "long", label: "ロング（45〜60分）" },
];

export default function VSLWritingPage() {
    const [productName, setProductName] = useState("");
    const [problem, setProblem] = useState("");
    const [solution, setSolution] = useState("");
    const [price, setPrice] = useState("");
    const [vslLength, setVslLength] = useState("medium");
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");

    const handleGenerate = async () => {
        if (!productName.trim() || !problem.trim()) return;
        setLoading(true);

        try {
            const selectedLength = VSL_LENGTHS.find(l => l.value === vslLength);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `VSL（ビデオセールスレター）の台本を作成してください。

商品・サービス: ${productName}
顧客の問題: ${problem}
解決策: ${solution || "商品で解決"}
価格: ${price || "未定"}
尺: ${selectedLength?.label}

VSL構成:
1. フック（最初の30秒で注意を引く）
2. 問題の提示と共感
3. 問題の深掘り（痛みを感じさせる）
4. 希望の提示
5. 解決策（商品）の紹介
6. 特徴とベネフィット
7. 社会的証明（成功事例）
8. オファーの詳細
9. 価格の提示（価値の正当化）
10. リスクリバーサル（保証）
11. 緊急性・限定性
12. CTA（行動喚起）

※話し言葉で自然な口調
※感情に訴える構成
※スライドの指示も含める（例: [スライド: 問題のイラスト]）`,
                    system: "あなたはVSLで数億円を売り上げたプロのコピーライターです。"
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
        a.download = `vsl-script-${productName.slice(0, 20).replace(/\s+/g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MonitorPlay className="h-6 w-6 text-primary" />
                    VSLライティング
                </h1>
                <p className="text-muted-foreground">売れるVSL（ビデオセールスレター）の台本を作成</p>
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
                                placeholder="例: 高単価コンサル講座"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>顧客の問題 *</Label>
                            <Textarea
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                placeholder="ターゲットが抱える悩み・問題..."
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>解決策</Label>
                            <Textarea
                                value={solution}
                                onChange={(e) => setSolution(e.target.value)}
                                placeholder="商品・サービスでどう解決するか..."
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>価格</Label>
                                <Input
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="例: 298,000円"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>尺</Label>
                                <Select value={vslLength} onValueChange={setVslLength}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VSL_LENGTHS.map(l => (
                                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !productName.trim() || !problem.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "VSL台本を生成"}
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
                                    <MonitorPlay className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>VSL台本がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
