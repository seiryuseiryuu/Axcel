"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Presentation, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SLIDE_COUNTS = [
    { value: "5", label: "5枚（ショート）" },
    { value: "10", label: "10枚（標準）" },
    { value: "15", label: "15枚（詳細）" },
];

const PURPOSES = [
    { value: "pitch", label: "ピッチ・提案" },
    { value: "training", label: "研修・教育" },
    { value: "report", label: "報告・レポート" },
    { value: "seminar", label: "セミナー・講演" },
];

interface Slide {
    number: number;
    title: string;
    bullets: string[];
    speakerNotes?: string;
}

export default function PresentationPage() {
    const [topic, setTopic] = useState("");
    const [purpose, setPurpose] = useState("pitch");
    const [slideCount, setSlideCount] = useState("10");
    const [audience, setAudience] = useState("");
    const [loading, setLoading] = useState(false);
    const [slides, setSlides] = useState<Slide[]>([]);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);

        try {
            const selectedPurpose = PURPOSES.find(p => p.value === purpose);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `プレゼン資料の構成を${slideCount}枚分作成してください。

トピック: ${topic}
目的: ${selectedPurpose?.label}
対象: ${audience || "一般"}

以下のJSON形式で出力（コードブロックなし）:
[
  {"number": 1, "title": "タイトルスライド", "bullets": ["サブタイトル", "発表者名"], "speakerNotes": "挨拶から入る"},
  {"number": 2, "title": "アジェンダ", "bullets": ["項目1", "項目2", "項目3"], "speakerNotes": "全体の流れを説明"}
]

※1スライドあたり3-5個の箇条書き
※スピーカーノート（話す内容のメモ）も含める
※最後にまとめ・CTAスライドを入れる`,
                    system: "あなたはプレゼン資料作成のプロです。"
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                try {
                    const jsonMatch = data.data.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setSlides(parsed);
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

    const exportToMarkdown = () => {
        const md = slides.map(s =>
            `## スライド ${s.number}: ${s.title}\n\n${s.bullets.map(b => `- ${b}`).join("\n")}\n\n> スピーカーノート: ${s.speakerNotes || ""}\n`
        ).join("\n---\n\n");

        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `presentation-${topic.slice(0, 20).replace(/\s+/g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Presentation className="h-6 w-6 text-primary" />
                    プレゼン資料制作
                </h1>
                <p className="text-muted-foreground">AIでスライド構成とスピーカーノートを作成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>プレゼンのトピック *</Label>
                            <Textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: 新規事業の提案、四半期売上報告..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>対象者</Label>
                            <Input
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                                placeholder="例: 経営層、新入社員..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>目的</Label>
                                <Select value={purpose} onValueChange={setPurpose}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PURPOSES.map(p => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>枚数</Label>
                                <Select value={slideCount} onValueChange={setSlideCount}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SLIDE_COUNTS.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "構成を生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>スライド構成</CardTitle>
                        {slides.length > 0 && (
                            <Button size="sm" onClick={exportToMarkdown}>
                                <Download className="h-4 w-4 mr-2" />
                                Markdown出力
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {slides.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {slides.map((slide, i) => (
                                    <div key={i} className="p-4 border rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge>{slide.number}</Badge>
                                            <span className="font-bold">{slide.title}</span>
                                        </div>
                                        <ul className="list-disc list-inside text-sm space-y-1 mb-2">
                                            {slide.bullets.map((b, j) => (
                                                <li key={j}>{b}</li>
                                            ))}
                                        </ul>
                                        {slide.speakerNotes && (
                                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                                💬 {slide.speakerNotes}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Presentation className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>スライド構成がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
