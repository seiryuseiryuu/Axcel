"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Image as ImageIcon, Sparkles } from "lucide-react";

const ASPECT_RATIOS = [
    { value: "16:9", label: "16:9（横長・標準）", width: 1200, height: 675 },
    { value: "1:1", label: "1:1（正方形）", width: 1200, height: 1200 },
    { value: "4:3", label: "4:3（旧標準）", width: 1200, height: 900 },
];

const STYLES = [
    { value: "modern", label: "モダン", description: "グラデーション、シンプル" },
    { value: "professional", label: "ビジネス", description: "落ち着いた配色、信頼感" },
    { value: "pop", label: "ポップ", description: "明るい色、親しみやすい" },
    { value: "minimal", label: "ミニマル", description: "シンプル、余白を活かす" },
];

export default function BlogEyecatchPage() {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [style, setStyle] = useState("modern");
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const handleGenerate = async () => {
        if (!title.trim()) return;
        setLoading(true);

        try {
            const selectedRatio = ASPECT_RATIOS.find(r => r.value === aspectRatio);
            const selectedStyle = STYLES.find(s => s.value === style);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    prompt: `Blog eyecatch image for article titled "${title}". ${subtitle ? `Subtitle: ${subtitle}.` : ""} Style: ${selectedStyle?.description}. Clean, professional blog header image. Aspect ratio ${aspectRatio}. No text in the image, just visual elements. Modern blog aesthetic.`,
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                setImageUrl(data.data);
            } else {
                // Mock fallback
                setImageUrl(`https://placehold.co/${selectedRatio?.width}x${selectedRatio?.height}/4a90d9/fff?text=${encodeURIComponent(title.slice(0, 15))}`);
            }
        } catch (error) {
            console.error("Generation error:", error);
            const selectedRatio = ASPECT_RATIOS.find(r => r.value === aspectRatio);
            setImageUrl(`https://placehold.co/${selectedRatio?.width}x${selectedRatio?.height}/4a90d9/fff?text=${encodeURIComponent(title.slice(0, 15))}`);
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
            a.download = `eyecatch-${title.replace(/\s+/g, "_").slice(0, 20)}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            window.open(imageUrl, "_blank");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    ブログアイキャッチ作成
                </h1>
                <p className="text-muted-foreground">AIでブログ記事のアイキャッチ画像を作成</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>記事タイトル *</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="例: 初心者向けReact入門ガイド"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>サブタイトル（任意）</Label>
                            <Input
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="例: 2024年最新版"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>アスペクト比</Label>
                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ASPECT_RATIOS.map(r => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !title.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "アイキャッチを生成"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>プレビュー</CardTitle>
                        {imageUrl && (
                            <Button size="sm" onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-2" />
                                ダウンロード
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`bg-muted rounded-md overflow-hidden flex items-center justify-center border-2 border-dashed ${aspectRatio === "1:1" ? "aspect-square" : aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"}`}>
                            {imageUrl ? (
                                <img src={imageUrl} alt="Generated Eyecatch" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>プレビューエリア</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
