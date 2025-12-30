"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Scissors, Download, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ClipSuggestion {
    startTime: string;
    endTime: string;
    duration: string;
    title: string;
    hook: string;
    viralPotential: "high" | "medium" | "low";
    reason: string;
    hashtags: string[];
}

const PLATFORMS = [
    { value: "tiktok", label: "TikTok", maxDuration: 60, recommended: 30 },
    { value: "youtube-shorts", label: "YouTube Shorts", maxDuration: 60, recommended: 45 },
    { value: "instagram-reels", label: "Instagram Reels", maxDuration: 90, recommended: 30 },
];

export default function VideoClipPage() {
    const [videoTitle, setVideoTitle] = useState("");
    const [transcript, setTranscript] = useState("");
    const [platform, setPlatform] = useState("tiktok");
    const [clipCount, setClipCount] = useState("5");
    const [loading, setLoading] = useState(false);
    const [clips, setClips] = useState<ClipSuggestion[]>([]);
    const [progress, setProgress] = useState(0);

    const handleGenerate = async () => {
        if (!transcript.trim()) return;
        setLoading(true);
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 15, 90));
            }, 500);

            const selectedPlatform = PLATFORMS.find(p => p.value === platform);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `長尺動画からショート動画の切り抜きポイントを${clipCount}個提案してください。

動画タイトル: ${videoTitle || "未指定"}
プラットフォーム: ${selectedPlatform?.label}（最大${selectedPlatform?.maxDuration}秒、推奨${selectedPlatform?.recommended}秒）

【動画のトランスクリプト/台本】
${transcript}

以下のJSON形式で出力（コードブロックなし）:
[
  {
    "startTime": "0:00",
    "endTime": "0:45",
    "duration": "45秒",
    "title": "【衝撃】ショート用タイトル",
    "hook": "冒頭3秒の掴み文言",
    "viralPotential": "high",
    "reason": "なぜこの部分がバズりやすいか",
    "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
  }
]

【選定基準】
- 冒頭で興味を引ける（フック力）
- 完結した内容（途中で切れない）
- 感情を動かす（驚き、共感、笑いなど）
- 単体で価値がある
- ${selectedPlatform?.recommended}秒前後が理想`,
                    system: "あなたはバズるショート動画の編集ディレクターです。長尺コンテンツから最もバイラルしやすい部分を見抜くプロです。"
                })
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await response.json();
            if (data.success && data.data) {
                try {
                    const jsonMatch = data.data.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setClips(parsed);
                    }
                } catch {
                    console.error("Parse error");
                }
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setLoading(false);
            setTimeout(() => setProgress(0), 500);
        }
    };

    const handleCopyClip = (clip: ClipSuggestion) => {
        const text = `【${clip.title}】
開始: ${clip.startTime} → 終了: ${clip.endTime}（${clip.duration}）

フック: ${clip.hook}

${clip.hashtags.map(h => `#${h}`).join(" ")}`;
        navigator.clipboard.writeText(text);
    };

    const handleExportAll = () => {
        const csv = [
            ["タイトル", "開始", "終了", "尺", "フック", "バイラル度", "理由", "ハッシュタグ"].join(","),
            ...clips.map(c => [
                `"${c.title}"`,
                c.startTime,
                c.endTime,
                c.duration,
                `"${c.hook}"`,
                c.viralPotential,
                `"${c.reason}"`,
                `"${c.hashtags.join(", ")}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clip-suggestions-${videoTitle.slice(0, 20).replace(/\s+/g, "_") || "video"}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getViralBadgeColor = (potential: string) => {
        switch (potential) {
            case "high": return "bg-green-500";
            case "medium": return "bg-yellow-500";
            case "low": return "bg-gray-500";
            default: return "bg-gray-500";
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Scissors className="h-6 w-6 text-primary" />
                    長尺動画→ショート切り抜き
                </h1>
                <p className="text-muted-foreground">AIが長尺動画からバズりやすい切り抜きポイントを自動提案</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>動画情報</CardTitle>
                        <CardDescription>トランスクリプトまたは台本を入力</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>動画タイトル</Label>
                            <Input
                                value={videoTitle}
                                onChange={(e) => setVideoTitle(e.target.value)}
                                placeholder="例: 【完全版】プログラミング入門講座"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>トランスクリプト/台本 *</Label>
                            <Textarea
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                placeholder="動画の文字起こしまたは台本を貼り付けてください...

例:
0:00 - こんにちは！今日は驚きの方法をお伝えします
0:30 - まず最初に、基本的な考え方から...
1:00 - ここが最も重要なポイントです！..."
                                className="min-h-[250px] font-mono text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>プラットフォーム</Label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PLATFORMS.map(p => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {p.label}（〜{p.maxDuration}秒）
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>提案数</Label>
                                <Select value={clipCount} onValueChange={setClipCount}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">3個</SelectItem>
                                        <SelectItem value="5">5個</SelectItem>
                                        <SelectItem value="10">10個</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading && progress > 0 && (
                            <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                                <p className="text-sm text-muted-foreground text-center">
                                    AIが最適な切り抜きポイントを分析中...
                                </p>
                            </div>
                        )}

                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !transcript.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "分析中..." : "切り抜きポイントを分析"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                切り抜き提案
                            </CardTitle>
                            <CardDescription>
                                {clips.length > 0 && `${clips.length}個の切り抜きポイントを発見`}
                            </CardDescription>
                        </div>
                        {clips.length > 0 && (
                            <Button size="sm" variant="outline" onClick={handleExportAll}>
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {clips.length > 0 ? (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {clips.map((clip, i) => (
                                    <div
                                        key={i}
                                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => handleCopyClip(clip)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{i + 1}</Badge>
                                                <Badge className={getViralBadgeColor(clip.viralPotential)}>
                                                    {clip.viralPotential === "high" ? "🔥 高" :
                                                        clip.viralPotential === "medium" ? "⭐ 中" : "低"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {clip.startTime} → {clip.endTime}（{clip.duration}）
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-sm mb-1">{clip.title}</h4>
                                        <p className="text-xs text-primary mb-2">フック: {clip.hook}</p>
                                        <p className="text-xs text-muted-foreground mb-2">{clip.reason}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {clip.hashtags.map((tag, j) => (
                                                <Badge key={j} variant="secondary" className="text-xs">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Scissors className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>切り抜き提案がここに表示されます</p>
                                    <p className="text-sm">クリックでコピー</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
