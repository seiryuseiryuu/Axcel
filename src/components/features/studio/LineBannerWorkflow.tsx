"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon, RefreshCw, Wand2, Download, History, Palette } from "lucide-react";
import Image from "next/image";
import * as LineBannerActions from "@/app/actions/lineBanner";
import { uploadImage } from "@/app/actions/storage";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Size definitions for UI
const BANNER_SIZES = [
    { id: 'square', name: '正方形 (1040x1040)', ratio: '1:1', desc: '標準的なリッチメッセージ・投稿用' },
    { id: 'card_small', name: '横長 小 (1040x350)', ratio: '3:1', desc: 'コンパクトなアナウンス用' },
    { id: 'card_large', name: '横長 大 (1040x700)', ratio: '3:2', desc: '標準的な横型リッチメッセージ' },
    { id: 'vertical', name: '縦長 (1040x1300)', ratio: '4:5', desc: 'スマホ画面を大きく使う縦型' },
    { id: 'vertical_full', name: '縦長 フル (1040x1850)', ratio: '9:16', desc: '画面占有率最大。インパクト重視' },
];

export function LineBannerWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Step 1: Settings
    const [sizeMode, setSizeMode] = useState("square");
    const [referenceImage, setReferenceImage] = useState<string | null>(null); // URL or Base64 (from upload)
    const [mainColor, setMainColor] = useState("#00B900"); // Default LINE Green
    const [useCustomColor, setUseCustomColor] = useState(false);

    // Step 2: Generation
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [customPrompt, setCustomPrompt] = useState("");

    // Additional Materials
    const [additionalMaterials, setAdditionalMaterials] = useState<{ image: string; description: string }[]>([]);

    // History
    const [history, setHistory] = useState<string[]>([]);

    // Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            startTransition(async () => {
                const result = await uploadImage(base64);
                if (result.success && result.url) {
                    setReferenceImage(result.url);
                    toast({ title: "画像をアップロードしました" });
                } else {
                    toast({ title: "アップロード失敗", variant: "destructive" });
                }
            });
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = () => {
        if (!referenceImage) {
            toast({ title: "参考画像を選択してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await LineBannerActions.analyzeLineBanner(referenceImage);
            if (result.success && result.data) {
                setAnalysisResult(result.data);
                setStep(2);
                // Auto generate first batch? Or let user describe first?
                // Let's go to step 2 and let user click generate.
            } else {
                toast({ title: "分析エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleGenerate = () => {
        if (!analysisResult) return;

        startTransition(async () => {
            const result = await LineBannerActions.generateLineBanner(
                analysisResult,
                1,
                customPrompt,
                sizeMode,
                referenceImage!,
                generatedImages.length > 0 ? generatedImages[0] : null,
                additionalMaterials,
                useCustomColor ? mainColor : undefined
            );

            if (result.success && result.images && result.images.length > 0) {
                const newImageUrl = result.images[0].imageUrl;
                setGeneratedImages([newImageUrl, ...generatedImages]);
                setHistory(prev => [newImageUrl, ...prev]);
                toast({ title: "バナーを生成しました" });
            } else {
                toast({ title: "生成エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">LINE Banner Creator</h2>
                <p className="text-muted-foreground">公式LINE用のリッチメッセージ・バナーを作成します。</p>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <span className={step === 1 ? "font-bold text-primary" : ""}>Step 1: 設定</span>
                <span>/</span>
                <span className={step === 2 ? "font-bold text-primary" : ""}>Step 2: 生成・調整</span>
            </div>

            {/* STEP 1: Configuration */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Left: Settings */}
                    <div className="space-y-6">
                        {/* Size Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">1. バナーサイズを選択</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <RadioGroup value={sizeMode} onValueChange={setSizeMode}>
                                        {BANNER_SIZES.map((size) => (
                                            <div key={size.id} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                                <RadioGroupItem value={size.id} id={size.id} />
                                                <Label htmlFor={size.id} className="flex-1 cursor-pointer">
                                                    <div className="font-medium">{size.name}</div>
                                                    <div className="text-xs text-muted-foreground">{size.desc}</div>
                                                </Label>
                                                <div className="text-xs font-mono bg-muted px-2 py-1 rounded">{size.ratio}</div>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Color Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">2. メインカラー設定</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="useCustomColor"
                                        checked={useCustomColor}
                                        onChange={(e) => setUseCustomColor(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="useCustomColor">カラーを指定する（チェックなしはお任せ）</Label>
                                </div>
                                {useCustomColor && (
                                    <div className="flex items-center gap-4 animate-in fade-in">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200">
                                            <input
                                                type="color"
                                                value={mainColor}
                                                onChange={(e) => setMainColor(e.target.value)}
                                                className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label>カラーコード</Label>
                                            <Input
                                                value={mainColor}
                                                onChange={(e) => setMainColor(e.target.value)}
                                                className="font-mono mt-1"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Upload */}
                    <div className="space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base">3. 参考画像をアップロード</CardTitle>
                                <CardDescription>
                                    作成したいイメージに近いバナー画像をアップロードしてください。<br />
                                    レイアウトや雰囲気を学習して、指定サイズにリサイズ・調整します。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-center items-center gap-4 p-8 border-dashed border-2 rounded-lg m-6 mt-0 bg-slate-50 dark:bg-slate-900/50">
                                {referenceImage ? (
                                    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center">
                                        <Image
                                            src={referenceImage}
                                            alt="Reference"
                                            fill
                                            className="object-contain rounded-lg"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={() => setReferenceImage(null)}
                                        >
                                            削除
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <Button variant="outline" className="relative">
                                                ファイルを選択
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP (Max 10MB)</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleAnalyze}
                                    disabled={!referenceImage || isPending}
                                >
                                    {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                    画像を分析して次へ
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}

            {/* STEP 2: Generate & Refine */}
            {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4">
                    {/* Left Column: Controls */}
                    <div className="space-y-6 lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">生成設定</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm border p-2 rounded bg-muted/50">
                                    <div className="font-semibold mb-1">現在の設定:</div>
                                    <div>サイズ: {BANNER_SIZES.find(s => s.id === sizeMode)?.name}</div>
                                    <div>カラー: {useCustomColor ? mainColor : "画像準拠"}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label>指示・修正リクエスト</Label>
                                    <Textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="例：もっと文字を大きくして、キラキラさせて"
                                        className="h-24 resize-none"
                                    />
                                </div>
                                <Button onClick={handleGenerate} className="w-full" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCw className="mr-2" />}
                                    バナーを生成
                                </Button>
                                <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
                                    設定に戻る
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Additional Materials (Simplified) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">追加素材（ロゴ・写真など）</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {additionalMaterials.map((mat, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                                            <ImageIcon className="w-4 h-4" />
                                            <span className="truncate flex-1">{mat.description || `素材 ${i + 1}`}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setAdditionalMaterials(prev => prev.filter((_, idx) => idx !== i))}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="relative">
                                        <Button variant="outline" size="sm" className="w-full text-xs">
                                            素材を追加 (+ Upload)
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        const reader = new FileReader();
                                                        reader.onload = async () => {
                                                            const base64 = reader.result as string;
                                                            const res = await uploadImage(base64);
                                                            if (res.success) {
                                                                setAdditionalMaterials([...additionalMaterials, { image: res.url!, description: f.name }]);
                                                            }
                                                        };
                                                        reader.readAsDataURL(f);
                                                    }
                                                }}
                                            />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="min-h-[500px] border-2 border-dashed rounded-lg flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 relative">
                            {generatedImages.length > 0 ? (
                                <div className="relative w-full h-full flex flex-col items-center">
                                    <div className="relative shadow-lg rounded-lg overflow-hidden border" style={{
                                        // Dynamic aspect ratio calculation for preview inline style if needed, 
                                        // but simple max-width/height is safer.
                                        maxWidth: '100%',
                                        maxHeight: '600px'
                                    }}>
                                        <img
                                            src={generatedImages[0]}
                                            alt="Generated Banner"
                                            className="max-w-full max-h-[600px] object-contain"
                                        />
                                    </div>
                                    <div className="mt-4 flex gap-4">
                                        <Button variant="outline" onClick={() => window.open(generatedImages[0], '_blank')}>
                                            <Download className="mr-2 w-4 h-4" /> 保存 / 確認
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Palette className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>「バナーを生成」ボタンを押してデザインを作成します</p>
                                </div>
                            )}
                            {isPending && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm z-10">
                                    <div className="text-center">
                                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
                                        <p>AIがデザインを作成中...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* History */}
                        {history.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <History className="w-4 h-4" /> 生成履歴
                                </h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                                    {history.map((img, i) => (
                                        <div
                                            key={i}
                                            className="relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:ring-2 ring-primary transition-all"
                                            onClick={() => {
                                                // Move to top
                                                const newHistory = history.filter((_, idx) => idx !== i);
                                                setGeneratedImages([img, ...newHistory]);
                                            }}
                                        >
                                            <Image src={img} alt={`History ${i}`} fill className="object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
