"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Instagram, Sparkles, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STORY_TYPES = [
    { value: "promotion", label: "商品・サービス宣伝" },
    { value: "behind-scenes", label: "舞台裏・日常" },
    { value: "tips", label: "Tips・ノウハウ" },
    { value: "qa", label: "Q&A・質問回答" },
    { value: "poll", label: "投票・アンケート" },
];

const STYLES = [
    { value: "minimal", label: "ミニマル" },
    { value: "bold", label: "ボールド" },
    { value: "aesthetic", label: "エステティック" },
    { value: "playful", label: "プレイフル" },
];

interface StorySlide {
    slideNumber: number;
    content: string;
    cta?: string;
    sticker?: string;
}

export default function InstaStoryPage() {
    const [topic, setTopic] = useState("");
    const [storyType, setStoryType] = useState("promotion");
    const [style, setStyle] = useState("minimal");
    const [slideCount, setSlideCount] = useState("3");
    const [loading, setLoading] = useState(false);
    const [slides, setSlides] = useState<StorySlide[]>([]);
    const [imageUrl, setImageUrl] = useState("");

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);

        try {
            const selectedType = STORY_TYPES.find(t => t.value === storyType);
            const selectedStyle = STYLES.find(s => s.value === style);

            // Generate story content
            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `Instagramストーリーズの構成を${slideCount}枚分作成してください。

トピック: ${topic}
種類: ${selectedType?.label}
スタイル: ${selectedStyle?.label}

以下のJSON形式で出力（コードブロックなし）:
[
  {"slideNumber": 1, "content": "スライド1のテキスト内容", "cta": "スワイプして続きを見る", "sticker": "使用するスタンプ提案"},
  {"slideNumber": 2, "content": "スライド2のテキスト内容", "cta": null, "sticker": null}
]

※各スライドは短く簡潔に（30文字以内推奨）
※CTAは必要な場合のみ
※スタンプ提案（投票、質問ボックス、カウントダウン等）`,
                    system: "あなたはInstagramマーケティングのプロです。"
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
                    setSlides([{ slideNumber: 1, content: data.data }]);
                }
            }

            // Generate image for first slide
            const imageResponse = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    prompt: `Instagram Story background image for: "${topic}". Style: ${selectedStyle?.label}. Vertical format 9:16. Modern, aesthetic, suitable for Instagram stories. No text.`,
                })
            });

            const imageData = await imageResponse.json();
            if (imageData.success && imageData.data) {
                setImageUrl(imageData.data);
            } else {
                setImageUrl("https://placehold.co/1080x1920/6366f1/fff?text=Story+Background");
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!imageUrl) return;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `insta-story-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            window.open(imageUrl, "_blank");
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Instagram className="h-6 w-6 text-primary" />
                    インスタストーリーズ制作
                </h1>
                <p className="text-muted-foreground">AIでストーリーズの構成と背景画像を作成</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>ストーリーのトピック *</Label>
                            <Textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: 新商品の紹介、今日のルーティン..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>種類</Label>
                            <Select value={storyType} onValueChange={setStoryType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STORY_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>スタイル</Label>
                                <Select value={style} onValueChange={setStyle}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STYLES.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>枚数</Label>
                                <Select value={slideCount} onValueChange={setSlideCount}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1枚</SelectItem>
                                        <SelectItem value="3">3枚</SelectItem>
                                        <SelectItem value="5">5枚</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "ストーリーを生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            スライド構成
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {slides.length > 0 ? (
                            <div className="space-y-3">
                                {slides.map((slide, i) => (
                                    <div key={i} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge>スライド {slide.slideNumber}</Badge>
                                            {slide.sticker && (
                                                <Badge variant="outline" className="text-xs">{slide.sticker}</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium">{slide.content}</p>
                                        {slide.cta && (
                                            <p className="text-xs text-primary mt-2">CTA: {slide.cta}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>構成がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>背景プレビュー</CardTitle>
                        {imageUrl && (
                            <Button size="sm" onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-2" />
                                DL
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-[9/16] bg-muted rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed max-h-[400px]">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Story Background" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Instagram className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">背景画像</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
