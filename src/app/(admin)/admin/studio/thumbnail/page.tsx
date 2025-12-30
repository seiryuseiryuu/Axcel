"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Image as ImageIcon, Sparkles, RefreshCw, FileImage, Layers, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GeneratedThumbnail {
    id: string;
    url: string;
    title: string;
    style: string;
    createdAt: Date;
}

const STYLE_PRESETS = [
    { value: "clickbait", label: "YouTube Clickbait", description: "大きなテキスト、驚き表情、派手な色" },
    { value: "minimal", label: "Minimalist", description: "シンプル、余白を活かす、洗練" },
    { value: "corporate", label: "Corporate", description: "ビジネス向け、信頼感、プロフェッショナル" },
    { value: "tutorial", label: "Tutorial", description: "手順表示、番号付き、教育的" },
    { value: "vlog", label: "Vlog Style", description: "個人的、親しみやすい、日常感" },
];

export default function ThumbnailGeneratorPage() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [style, setStyle] = useState("clickbait");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([]);
    const [selectedThumbnail, setSelectedThumbnail] = useState<GeneratedThumbnail | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleGenerate = async () => {
        if (!title.trim()) return;

        setLoading(true);
        setProgress(0);

        try {
            // Progress simulation for better UX
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "image",
                    prompt: `YouTube thumbnail for video titled "${title}". ${description ? `Video description: ${description}.` : ""} Style: ${STYLE_PRESETS.find(s => s.value === style)?.description || style}. Make it eye-catching, high contrast, suitable for YouTube. Aspect ratio 16:9.`,
                    system: "You are an expert YouTube thumbnail designer."
                })
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await response.json();

            if (data.success && data.data) {
                const newThumbnail: GeneratedThumbnail = {
                    id: crypto.randomUUID(),
                    url: data.data,
                    title: title,
                    style: style,
                    createdAt: new Date(),
                };
                setThumbnails(prev => [newThumbnail, ...prev]);
                setSelectedThumbnail(newThumbnail);
            } else {
                // Mock fallback for demo
                const mockUrl = `https://placehold.co/1280x720/1a1a2e/eee?text=${encodeURIComponent(title.slice(0, 20))}`;
                const newThumbnail: GeneratedThumbnail = {
                    id: crypto.randomUUID(),
                    url: mockUrl,
                    title: title,
                    style: style,
                    createdAt: new Date(),
                };
                setThumbnails(prev => [newThumbnail, ...prev]);
                setSelectedThumbnail(newThumbnail);
            }
        } catch (error) {
            console.error("Generation error:", error);
            // Mock fallback
            const mockUrl = `https://placehold.co/1280x720/1a1a2e/eee?text=${encodeURIComponent(title.slice(0, 20))}`;
            const newThumbnail: GeneratedThumbnail = {
                id: crypto.randomUUID(),
                url: mockUrl,
                title: title,
                style: style,
                createdAt: new Date(),
            };
            setThumbnails(prev => [newThumbnail, ...prev]);
            setSelectedThumbnail(newThumbnail);
        } finally {
            setLoading(false);
            setTimeout(() => setProgress(0), 500);
        }
    };

    // Download as JPEG
    const downloadAsJpeg = useCallback(async (thumbnail: GeneratedThumbnail) => {
        try {
            const response = await fetch(thumbnail.url);
            const blob = await response.blob();

            // Convert to JPEG using canvas
            const img = new Image();
            img.crossOrigin = "anonymous";

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = thumbnail.url;
            });

            const canvas = document.createElement("canvas");
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext("2d");

            if (ctx) {
                ctx.drawImage(img, 0, 0, 1280, 720);
                canvas.toBlob((jpegBlob) => {
                    if (jpegBlob) {
                        const url = URL.createObjectURL(jpegBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `thumbnail-${thumbnail.title.replace(/\s+/g, "_").slice(0, 30)}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                }, "image/jpeg", 0.95);
            }
        } catch (error) {
            console.error("JPEG download error:", error);
            // Fallback: direct download
            window.open(thumbnail.url, "_blank");
        }
    }, []);

    // Download as PSD - Enhanced with multiple layers
    const downloadAsPsd = useCallback(async (thumbnail: GeneratedThumbnail) => {
        try {
            // Dynamic import ag-psd
            const { writePsd } = await import("ag-psd");

            // Load image
            const img = new Image();
            img.crossOrigin = "anonymous";

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = thumbnail.url;
            });

            // Create background canvas
            const bgCanvas = document.createElement("canvas");
            bgCanvas.width = 1280;
            bgCanvas.height = 720;
            const bgCtx = bgCanvas.getContext("2d");
            if (!bgCtx) throw new Error("Canvas context not available");
            bgCtx.drawImage(img, 0, 0, 1280, 720);

            // Create overlay layer (gradient for text readability)
            const overlayCanvas = document.createElement("canvas");
            overlayCanvas.width = 1280;
            overlayCanvas.height = 720;
            const overlayCtx = overlayCanvas.getContext("2d");
            if (overlayCtx) {
                const gradient = overlayCtx.createLinearGradient(0, 0, 0, 720);
                gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
                gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.1)");
                gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");
                overlayCtx.fillStyle = gradient;
                overlayCtx.fillRect(0, 0, 1280, 720);
            }

            // Create main title layer with improved styling
            const titleCanvas = document.createElement("canvas");
            titleCanvas.width = 1280;
            titleCanvas.height = 720;
            const titleCtx = titleCanvas.getContext("2d");
            if (titleCtx) {
                const titleText = thumbnail.title.slice(0, 25);

                // Use web-safe fonts with fallbacks
                titleCtx.font = "bold 80px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', Arial, sans-serif";
                titleCtx.textAlign = "center";
                titleCtx.textBaseline = "middle";

                // Multiple shadow layers for depth
                titleCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
                titleCtx.shadowBlur = 15;
                titleCtx.shadowOffsetX = 4;
                titleCtx.shadowOffsetY = 4;

                // Black outline
                titleCtx.strokeStyle = "#000000";
                titleCtx.lineWidth = 8;
                titleCtx.lineJoin = "round";
                titleCtx.strokeText(titleText, 640, 360);

                // White fill
                titleCtx.fillStyle = "#FFFFFF";
                titleCtx.fillText(titleText, 640, 360);
            }

            // Create subtitle layer
            const subtitleCanvas = document.createElement("canvas");
            subtitleCanvas.width = 1280;
            subtitleCanvas.height = 720;
            const subtitleCtx = subtitleCanvas.getContext("2d");
            if (subtitleCtx) {
                subtitleCtx.font = "bold 36px 'Hiragino Sans', 'Yu Gothic', 'Meiryo', Arial, sans-serif";
                subtitleCtx.textAlign = "center";
                subtitleCtx.textBaseline = "middle";
                subtitleCtx.shadowColor = "rgba(0, 0, 0, 0.6)";
                subtitleCtx.shadowBlur = 8;
                subtitleCtx.shadowOffsetX = 2;
                subtitleCtx.shadowOffsetY = 2;
                subtitleCtx.strokeStyle = "#000000";
                subtitleCtx.lineWidth = 4;
                subtitleCtx.strokeText("ここにサブタイトルを入力", 640, 450);
                subtitleCtx.fillStyle = "#FFD700";
                subtitleCtx.fillText("ここにサブタイトルを入力", 640, 450);
            }

            // Create accent layer (for badges/icons)
            const accentCanvas = document.createElement("canvas");
            accentCanvas.width = 1280;
            accentCanvas.height = 720;
            const accentCtx = accentCanvas.getContext("2d");
            if (accentCtx) {
                // Corner badge
                accentCtx.fillStyle = "#FF0000";
                accentCtx.beginPath();
                accentCtx.moveTo(0, 0);
                accentCtx.lineTo(200, 0);
                accentCtx.lineTo(0, 100);
                accentCtx.closePath();
                accentCtx.fill();

                accentCtx.font = "bold 24px Arial";
                accentCtx.fillStyle = "#FFFFFF";
                accentCtx.save();
                accentCtx.translate(50, 30);
                accentCtx.rotate(-Math.PI / 4);
                accentCtx.fillText("NEW", 0, 0);
                accentCtx.restore();
            }

            // Create PSD structure with multiple editable layers
            const psd = {
                width: 1280,
                height: 720,
                children: [
                    {
                        name: "Background (編集用)",
                        canvas: bgCanvas,
                    },
                    {
                        name: "Overlay (グラデーション)",
                        canvas: overlayCanvas,
                        blendMode: "multiply" as const,
                        opacity: 0.5,
                    },
                    {
                        name: "Title Layer (メインタイトル)",
                        canvas: titleCanvas,
                    },
                    {
                        name: "Subtitle Layer (サブタイトル)",
                        canvas: subtitleCanvas,
                    },
                    {
                        name: "Accent Layer (バッジ・装飾)",
                        canvas: accentCanvas,
                        hidden: true, // Hidden by default, user can enable
                    },
                ],
            };

            // Generate PSD buffer
            const buffer = writePsd(psd);

            // Download
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `thumbnail-${thumbnail.title.replace(/\s+/g, "_").slice(0, 30)}.psd`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("PSD download error:", error);
            alert("PSDファイルの生成に失敗しました。JPEGでダウンロードしてください。");
        }
    }, []);

    // Download as PNG
    const downloadAsPng = useCallback(async (thumbnail: GeneratedThumbnail) => {
        try {
            const response = await fetch(thumbnail.url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `thumbnail-${thumbnail.title.replace(/\s+/g, "_").slice(0, 30)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("PNG download error:", error);
            window.open(thumbnail.url, "_blank");
        }
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    サムネイル作成エージェント
                </h1>
                <p className="text-muted-foreground">AIでYouTubeサムネイルを作成。JPEG/PNG/PSD形式でダウンロード可能</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Input Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                        <CardDescription>動画の情報とスタイルを設定</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>動画タイトル *</Label>
                            <Input
                                placeholder="例: 【衝撃】Next.jsの新機能10選"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>動画の概要（任意）</Label>
                            <Textarea
                                placeholder="動画の内容を簡単に説明..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>スタイルプリセット</Label>
                            <Select value={style} onValueChange={setStyle}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STYLE_PRESETS.map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value}>
                                            <div>
                                                <div className="font-medium">{preset.label}</div>
                                                <div className="text-xs text-muted-foreground">{preset.description}</div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {loading && progress > 0 && (
                            <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                                <p className="text-sm text-muted-foreground text-center">
                                    {progress < 100 ? "生成中..." : "完了！"}
                                </p>
                            </div>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleGenerate}
                            disabled={loading || !title.trim()}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "サムネイルを生成"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Preview Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            プレビュー
                            {selectedThumbnail && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm">
                                            <Download className="h-4 w-4 mr-2" />
                                            ダウンロード
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => downloadAsJpeg(selectedThumbnail)}>
                                            <FileImage className="h-4 w-4 mr-2" />
                                            JPEG形式
                                            <Badge variant="secondary" className="ml-2">推奨</Badge>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => downloadAsPng(selectedThumbnail)}>
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            PNG形式
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => downloadAsPsd(selectedThumbnail)}>
                                            <Layers className="h-4 w-4 mr-2" />
                                            PSD形式
                                            <Badge variant="outline" className="ml-2">編集用</Badge>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center border-2 border-dashed">
                            {selectedThumbnail ? (
                                <img
                                    src={selectedThumbnail.url}
                                    alt="Generated Thumbnail"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>プレビューエリア</p>
                                    <p className="text-sm">サムネイルを生成してください</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History */}
            {thumbnails.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            生成履歴
                        </CardTitle>
                        <CardDescription>クリックで選択、ダウンロードできます</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {thumbnails.map((thumb) => (
                                <div
                                    key={thumb.id}
                                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedThumbnail?.id === thumb.id
                                        ? "border-primary ring-2 ring-primary/20"
                                        : "border-transparent hover:border-muted-foreground/50"
                                        }`}
                                    onClick={() => setSelectedThumbnail(thumb)}
                                >
                                    <div className="aspect-video">
                                        <img
                                            src={thumb.url}
                                            alt={thumb.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {selectedThumbnail?.id === thumb.id && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-primary">
                                                <Check className="h-3 w-3" />
                                            </Badge>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => { e.stopPropagation(); downloadAsJpeg(thumb); }}
                                        >
                                            JPEG
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => { e.stopPropagation(); downloadAsPsd(thumb); }}
                                        >
                                            PSD
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" width={1280} height={720} />
        </div>
    );
}
