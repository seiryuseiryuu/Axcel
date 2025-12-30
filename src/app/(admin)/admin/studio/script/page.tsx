"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, Video, Download, RefreshCw, Sparkles, Clock, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const VIDEO_TYPES = [
    { value: "tutorial", label: "チュートリアル・解説" },
    { value: "vlog", label: "Vlog・日常" },
    { value: "review", label: "レビュー・比較" },
    { value: "list", label: "ランキング・まとめ" },
    { value: "story", label: "ストーリー・体験談" },
    { value: "interview", label: "対談・インタビュー" },
];

const DURATIONS = [
    { value: "5", label: "5分（ショート）" },
    { value: "10", label: "10分（標準）" },
    { value: "15", label: "15分（ミドル）" },
    { value: "20", label: "20分（ロング）" },
    { value: "30", label: "30分+（詳細解説）" },
];

const TONES = [
    { value: "energetic", label: "エネルギッシュ" },
    { value: "calm", label: "落ち着いた" },
    { value: "friendly", label: "フレンドリー" },
    { value: "professional", label: "プロフェッショナル" },
    { value: "humorous", label: "ユーモア" },
];

interface ScriptSection {
    name: string;
    duration: string;
    content: string;
    notes?: string;
}

interface GeneratedScript {
    title: string;
    description: string;
    tags: string[];
    hook: string;
    sections: ScriptSection[];
    cta: string;
    totalDuration: string;
}

export default function YouTubeScriptPage() {
    const [topic, setTopic] = useState("");
    const [videoType, setVideoType] = useState("tutorial");
    const [duration, setDuration] = useState("10");
    const [tone, setTone] = useState("friendly");
    const [targetAudience, setTargetAudience] = useState("");
    const [keyPoints, setKeyPoints] = useState("");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [script, setScript] = useState<GeneratedScript | null>(null);
    const [activeTab, setActiveTab] = useState("script");

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 400);

            const selectedType = VIDEO_TYPES.find(t => t.value === videoType);
            const selectedTone = TONES.find(t => t.value === tone);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `YouTube動画の完全な台本を作成してください。

【動画情報】
トピック: ${topic}
動画タイプ: ${selectedType?.label}
目標尺: ${duration}分
トーン: ${selectedTone?.label}
ターゲット: ${targetAudience || "一般視聴者"}
${keyPoints ? `含めたいポイント: ${keyPoints}` : ""}

以下のJSON形式で出力（コードブロックなし）:
{
  "title": "【】付きのYouTube用タイトル（50文字以内）",
  "description": "動画説明文（500文字程度、リンク用のプレースホルダー含む）",
  "tags": ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5"],
  "hook": "冒頭15秒で視聴者を引き込むフック（そのまま読める文章）",
  "sections": [
    {
      "name": "オープニング",
      "duration": "0:00-0:30",
      "content": "セクションの台本（そのまま読める形式）",
      "notes": "演出メモ（表情、BGM、テロップなど）"
    }
  ],
  "cta": "チャンネル登録・高評価のお願い文",
  "totalDuration": "${duration}分"
}

【重要】
- 各セクションのcontentはそのまま読める台本形式で
- 視聴維持率を意識した構成（飽きさせない）
- フックは最初の3秒で興味を引く
- CTAは自然な流れで
- 適切なセクション数（5-10個程度）`,
                    system: "あなたは登録者100万人超のYouTuberの専属脚本家です。視聴維持率95%以上を達成する台本を書きます。"
                })
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await response.json();
            if (data.success && data.data) {
                try {
                    const jsonMatch = data.data.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setScript(parsed);
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

    const handleCopySection = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const handleCopyAll = () => {
        if (!script) return;
        const fullScript = `【${script.title}】

${script.hook}

${script.sections.map(s => `=== ${s.name} (${s.duration}) ===
${s.content}
${s.notes ? `\n[演出メモ] ${s.notes}` : ""}`).join("\n\n")}

${script.cta}`;
        navigator.clipboard.writeText(fullScript);
    };

    const handleDownload = () => {
        if (!script) return;
        const content = `# ${script.title}

## 動画説明文
${script.description}

## タグ
${script.tags.join(", ")}

---

## 台本

### フック（冒頭）
${script.hook}

${script.sections.map(s => `### ${s.name} (${s.duration})
${s.content}
${s.notes ? `\n> 演出メモ: ${s.notes}` : ""}`).join("\n\n")}

### CTA
${script.cta}`;

        const blob = new Blob([content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `youtube-script-${topic.slice(0, 20).replace(/\s+/g, "_")}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Video className="h-6 w-6 text-red-500" />
                    YouTube動画台本作成
                </h1>
                <p className="text-muted-foreground">視聴維持率の高いYouTube動画の完全台本を生成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>動画設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>動画のトピック *</Label>
                            <Textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: プログラミング初心者が最初に学ぶべき3つの言語"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>動画タイプ</Label>
                                <Select value={videoType} onValueChange={setVideoType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VIDEO_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>目標尺</Label>
                                <Select value={duration} onValueChange={setDuration}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DURATIONS.map(d => (
                                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
                        <div className="space-y-2">
                            <Label>ターゲット視聴者</Label>
                            <Input
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="例: プログラミング初心者、大学生"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>含めたいポイント（任意）</Label>
                            <Textarea
                                value={keyPoints}
                                onChange={(e) => setKeyPoints(e.target.value)}
                                placeholder="絶対に入れたい内容やキーワード..."
                                rows={2}
                            />
                        </div>

                        {loading && progress > 0 && (
                            <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                                <p className="text-sm text-muted-foreground text-center">
                                    高品質な台本を生成中...
                                </p>
                            </div>
                        )}

                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "台本を生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            生成結果
                        </CardTitle>
                        {script && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleCopyAll}>
                                    <Copy className="h-4 w-4 mr-2" />全体コピー
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />MD
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {script ? (
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="mb-4">
                                    <TabsTrigger value="script">台本</TabsTrigger>
                                    <TabsTrigger value="meta">メタ情報</TabsTrigger>
                                </TabsList>

                                <TabsContent value="script" className="space-y-4">
                                    {/* Hook */}
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-red-500">フック（冒頭15秒）</Badge>
                                            <Button size="sm" variant="ghost" onClick={() => handleCopySection(script.hook)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="text-sm font-medium">{script.hook}</p>
                                    </div>

                                    {/* Sections */}
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                        {script.sections.map((section, i) => (
                                            <div key={i} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">{i + 1}</Badge>
                                                        <span className="font-medium">{section.name}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            {section.duration}
                                                        </span>
                                                    </div>
                                                    <Button size="sm" variant="ghost" onClick={() => handleCopySection(section.content)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                                                {section.notes && (
                                                    <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                                                        🎬 {section.notes}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                        <Badge className="mb-2">CTA</Badge>
                                        <p className="text-sm">{script.cta}</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="meta" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>タイトル</Label>
                                        <div className="p-3 bg-muted rounded-lg font-medium">{script.title}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>説明文</Label>
                                        <Textarea value={script.description} readOnly className="min-h-[150px]" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>タグ</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {script.tags.map((tag, i) => (
                                                <Badge key={i} variant="secondary">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="h-[500px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>台本がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
