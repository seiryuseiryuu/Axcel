"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Video, Sparkles, RefreshCw } from "lucide-react";

const PLATFORMS = [
    { value: "tiktok", label: "TikTok", maxLength: 60, format: "縦型 9:16" },
    { value: "youtube-shorts", label: "YouTube Shorts", maxLength: 60, format: "縦型 9:16" },
    { value: "instagram-reels", label: "Instagram Reels", maxLength: 90, format: "縦型 9:16" },
];

const TONES = [
    { value: "entertaining", label: "エンタメ系" },
    { value: "educational", label: "教育・解説系" },
    { value: "lifestyle", label: "ライフスタイル" },
    { value: "business", label: "ビジネス・ノウハウ" },
];

export default function ShortScriptPage() {
    const [topic, setTopic] = useState("");
    const [platform, setPlatform] = useState("tiktok");
    const [tone, setTone] = useState("entertaining");
    const [duration, setDuration] = useState("30");
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState("");
    const [hook, setHook] = useState("");

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);

        try {
            const selectedPlatform = PLATFORMS.find(p => p.value === platform);
            const selectedTone = TONES.find(t => t.value === tone);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `${selectedPlatform?.label}用のショート動画台本を作成してください。

トピック: ${topic}
尺: ${duration}秒
トーン: ${selectedTone?.label}

以下の形式で出力してください：

【フック（冒頭3秒）】
（視聴者の注意を引く一言）

【本編】
（メインコンテンツ、テンポよく）

【CTA（締め）】
（行動喚起、フォロー促進など）

※縦型動画を意識した構成で
※テンポよく、飽きさせない構成で
※${duration}秒に収まる分量で`,
                    system: "あなたはバズるショート動画の台本作成のプロです。"
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                setScript(data.data);
                // Extract hook from the generated script
                const hookMatch = data.data.match(/【フック[^】]*】\n([^\n]+)/);
                if (hookMatch) {
                    setHook(hookMatch[1]);
                }
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(script);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Video className="h-6 w-6 text-primary" />
                    ショート動画台本作成
                </h1>
                <p className="text-muted-foreground">TikTok/Shorts/Reels用のバズる台本を生成</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>動画のトピック *</Label>
                            <Textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: 朝5時起きを1ヶ月続けた結果..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>プラットフォーム</Label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PLATFORMS.map(p => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
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
                            <Label>動画の尺（秒）</Label>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15秒</SelectItem>
                                    <SelectItem value="30">30秒</SelectItem>
                                    <SelectItem value="60">60秒</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "台本を生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>生成結果</CardTitle>
                        {script && (
                            <Button size="sm" variant="outline" onClick={handleCopy}>
                                <Copy className="h-4 w-4 mr-2" />
                                コピー
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {script ? (
                            <div className="space-y-4">
                                {hook && (
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <Label className="text-xs text-primary">フック（冒頭3秒）</Label>
                                        <p className="font-bold text-lg">{hook}</p>
                                    </div>
                                )}
                                <Textarea
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    className="min-h-[400px] font-mono text-sm"
                                />
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
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
