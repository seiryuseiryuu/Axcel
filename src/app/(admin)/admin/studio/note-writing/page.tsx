"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, FileText, Download } from "lucide-react";

const ARTICLE_TYPES = [
    { value: "howto", label: "ハウツー・解説" },
    { value: "essay", label: "エッセイ・日記" },
    { value: "review", label: "レビュー・感想" },
    { value: "column", label: "コラム・考察" },
];

const TONES = [
    { value: "casual", label: "カジュアル" },
    { value: "professional", label: "丁寧・プロ" },
    { value: "friendly", label: "フレンドリー" },
    { value: "academic", label: "論理的" },
];

export default function NoteWritingPage() {
    const [topic, setTopic] = useState("");
    const [articleType, setArticleType] = useState("howto");
    const [tone, setTone] = useState("casual");
    const [wordCount, setWordCount] = useState("2000");
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);

        try {
            const selectedType = ARTICLE_TYPES.find(t => t.value === articleType);
            const selectedTone = TONES.find(t => t.value === tone);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `note用の記事を作成してください。

トピック: ${topic}
種類: ${selectedType?.label}
トーン: ${selectedTone?.label}
目標文字数: 約${wordCount}文字

構成:
1. 導入（読者の興味を引く）
2. 本論（3-5セクション）
3. まとめ

※noteの読者に刺さる、読みやすい文章で
※適切な見出しを入れる
※Markdown形式で出力`,
                    system: "あなたはnoteで人気のライターです。"
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

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `note-${topic.slice(0, 20).replace(/\s+/g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6" style={{ color: "#41c9b4" }} />
                    note文章ライティング
                </h1>
                <p className="text-muted-foreground">noteの記事をAIで作成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>記事のトピック *</Label>
                            <Textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: フリーランスになって1年、学んだこと"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>種類</Label>
                                <Select value={articleType} onValueChange={setArticleType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ARTICLE_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>トーン</Label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TONES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>文字数</Label>
                            <Select value={wordCount} onValueChange={setWordCount}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1000">約1000文字</SelectItem>
                                    <SelectItem value="2000">約2000文字</SelectItem>
                                    <SelectItem value="3000">約3000文字</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "記事を生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>生成結果</CardTitle>
                        {content && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleCopy}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    コピー
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />
                                    MD
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {content ? (
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[500px] font-mono text-sm"
                            />
                        ) : (
                            <div className="h-[500px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>記事がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
