"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, FileText, Image as ImageIcon } from "lucide-react";

const PLATFORMS = [
    { value: "note", label: "note", size: "1280x670", color: "#41c9b4" },
    { value: "brain", label: "Brain", size: "1280x670", color: "#ff6b6b" },
    { value: "tips", label: "Tips", size: "1280x670", color: "#ffd43b" },
];

const GENRES = [
    { value: "business", label: "ビジネス・副業" },
    { value: "lifestyle", label: "ライフスタイル" },
    { value: "tech", label: "テック・プログラミング" },
    { value: "creative", label: "クリエイティブ" },
    { value: "selfhelp", label: "自己啓発" },
];

export default function NoteThumbnailPage() {
    const [title, setTitle] = useState("");
    const [platform, setPlatform] = useState("note");
    const [genre, setGenre] = useState("business");
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const handleGenerate = async () => {
        if (!title.trim()) return;
        setLoading(true);

        try {
            const selectedPlatform = PLATFORMS.find(p => p.value === platform);
            const selectedGenre = GENRES.find(g => g.value === genre);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    prompt: `${selectedPlatform?.label}の記事サムネイル画像。タイトル: "${title}"。ジャンル: ${selectedGenre?.label}。サイズ: ${selectedPlatform?.size}。${selectedPlatform?.label}の記事に適した、クリックしたくなるプロフェッショナルなデザイン。テキストは含めない、ビジュアルのみ。`,
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                setImageUrl(data.data);
            } else {
                const p = PLATFORMS.find(p => p.value === platform);
                setImageUrl(`https://placehold.co/1280x670/${p?.color.replace("#", "")}/fff?text=${encodeURIComponent(title.slice(0, 15))}`);
            }
        } catch (error) {
            console.error("Generation error:", error);
            const p = PLATFORMS.find(p => p.value === platform);
            setImageUrl(`https://placehold.co/1280x670/${p?.color.replace("#", "")}/fff?text=${encodeURIComponent(title.slice(0, 15))}`);
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
            a.download = `${platform}-thumbnail-${title.replace(/\s+/g, "_").slice(0, 20)}.png`;
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
                    <FileText className="h-6 w-6 text-primary" />
                    note/Brain/Tipsサムネイル
                </h1>
                <p className="text-muted-foreground">コンテンツ販売プラットフォーム用のサムネイルを作成</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Tabs value={platform} onValueChange={setPlatform}>
                            <TabsList className="w-full">
                                {PLATFORMS.map(p => (
                                    <TabsTrigger
                                        key={p.value}
                                        value={p.value}
                                        className="flex-1"
                                        style={{ color: platform === p.value ? p.color : undefined }}
                                    >
                                        {p.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <div className="space-y-2">
                            <Label>記事タイトル *</Label>
                            <Textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="例: 【完全版】副業で月10万円稼ぐロードマップ"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ジャンル</Label>
                            <Select value={genre} onValueChange={setGenre}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {GENRES.map(g => (
                                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !title.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "サムネイルを生成"}
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
                        <div className="aspect-[1280/670] bg-muted rounded-md overflow-hidden flex items-center justify-center border-2 border-dashed">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Platform Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>1280 x 670 px</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
