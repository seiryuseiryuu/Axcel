"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, MessageSquare, Image as ImageIcon } from "lucide-react";

const BANNER_TYPES = [
    { value: "promotion", label: "キャンペーン告知", size: "1200x628" },
    { value: "event", label: "イベント案内", size: "1200x628" },
    { value: "product", label: "商品紹介", size: "1200x628" },
    { value: "cta", label: "CTA・誘導", size: "1200x628" },
];

const STYLES = [
    { value: "simple", label: "シンプル" },
    { value: "colorful", label: "カラフル" },
    { value: "elegant", label: "エレガント" },
    { value: "cute", label: "かわいい" },
];

export default function LineBannerPage() {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [bannerType, setBannerType] = useState("promotion");
    const [style, setStyle] = useState("simple");
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const handleGenerate = async () => {
        if (!title.trim()) return;
        setLoading(true);

        try {
            const selectedType = BANNER_TYPES.find(t => t.value === bannerType);
            const selectedStyle = STYLES.find(s => s.value === style);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    prompt: `LINE公式アカウント用のバナー画像。タイトル: "${title}"。${subtitle ? `サブタイトル: "${subtitle}"。` : ""} 種類: ${selectedType?.label}。スタイル: ${selectedStyle?.label}。サイズ: 1200x628px。日本のLINE公式アカウントに適した、クリックしたくなるデザイン。`,
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                setImageUrl(data.data);
            } else {
                setImageUrl(`https://placehold.co/1200x628/06c755/fff?text=${encodeURIComponent(title.slice(0, 15))}`);
            }
        } catch (error) {
            console.error("Generation error:", error);
            setImageUrl(`https://placehold.co/1200x628/06c755/fff?text=${encodeURIComponent(title.slice(0, 15))}`);
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
            a.download = `line-banner-${title.replace(/\s+/g, "_").slice(0, 20)}.png`;
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
                    <MessageSquare className="h-6 w-6 text-[#06c755]" />
                    LINEバナー制作
                </h1>
                <p className="text-muted-foreground">LINE公式アカウント用のバナー画像を作成</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>メインテキスト *</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="例: 期間限定50%OFF!"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>サブテキスト</Label>
                            <Input
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="例: 12/31まで"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>バナー種類</Label>
                                <Select value={bannerType} onValueChange={setBannerType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {BANNER_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                            {loading ? "生成中..." : "バナーを生成"}
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
                        <div className="aspect-[1200/628] bg-muted rounded-md overflow-hidden flex items-center justify-center border-2 border-dashed">
                            {imageUrl ? (
                                <img src={imageUrl} alt="LINE Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>1200 x 628 px</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
