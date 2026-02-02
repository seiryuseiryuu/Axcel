"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon, ScanEye, Download, Upload, X, ArrowRight, ArrowLeft, Wand2, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveCreation } from "@/app/actions/history";
import { analyzeInstaStory, generateInstaStories, generateInstaStoryPrompt, type InstaStoryInfo } from "@/app/actions/instaStory";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

export function InstaStoryWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Inputs
    const [storyInfo, setStoryInfo] = useState<InstaStoryInfo>({
        theme: "",
        target: "",
        style: "photo",
        textOverlay: "",
        referenceImage: "" // URL for now
    });
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // Results
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [promptText, setPromptText] = useState("");
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);

    // Refinement history
    const [refinementHistory, setRefinementHistory] = useState<string[]>([]);

    // Handle File Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setUploadedImage(event.target.result as string);
                setStoryInfo(prev => ({ ...prev, referenceImage: "" })); // Clear URL
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = () => {
        const imageSource = uploadedImage || storyInfo.referenceImage;
        if (!imageSource) {
            toast({ title: "参考画像を指定してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeInstaStory(imageSource);
            if (result.success && result.data) {
                setAnalysisResult(result.data);

                // Prompt Generation
                const promptRes = await generateInstaStoryPrompt(result.data, storyInfo);
                if (promptRes.success) {
                    setPromptText(promptRes.prompt || "");
                    setStep(2);
                    toast({ title: "分析完了", description: "プロンプトを確認してください" });
                } else {
                    toast({ title: "プロンプト生成エラー", description: promptRes.error, variant: "destructive" });
                }
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleGenerate = () => {
        if (!analysisResult) return;
        const imageSource = uploadedImage || storyInfo.referenceImage;
        const finalInfo = {
            ...storyInfo,
            referenceImage: imageSource || undefined
        };

        // Build final prompt with refinement history
        let finalPrompt = promptText;

        if (refinementHistory.length > 0) {
            finalPrompt += `\n\n【過去の修正指示（累積）】\n` + refinementHistory.map((r, i) => `${i + 1}. ${r}`).join('\n');
        }

        startTransition(async () => {
            const result = await generateInstaStories(
                analysisResult,
                finalInfo,
                1,
                finalPrompt
            );

            if (result.success && result.images) {
                setGeneratedImages(result.images);

                // Save to History
                try {
                    const saveResult = await saveCreation(
                        `Instaストーリー: ${storyInfo.theme.slice(0, 15)}...`,
                        'image',
                        result.images
                    );
                    if (saveResult.success) {
                        toast({ title: "生成完了", description: "履歴に保存されました" });
                    } else {
                        console.error("History save failed:", saveResult.error);
                    }
                } catch (e: any) {
                    console.error("History save exception:", e);
                }

                setStep(3);
            } else {
                toast({ title: "生成失敗", description: "画像の生成に失敗しました", variant: "destructive" });
            }
        });
    };

    // Add refinement and regenerate
    const handleRefinement = (instruction: string) => {
        if (!instruction.trim()) return;
        setRefinementHistory(prev => [...prev, instruction]);
        handleGenerate();
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* STEP 1: Input */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Instagram className="w-5 h-5 text-pink-500" />
                            STEP 1: ストーリーズ要件定義
                        </CardTitle>
                        <CardDescription>作成したいストーリーズのテーマと、参考にしたい画像を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>デザインスタイル</Label>
                                <Select
                                    value={storyInfo.style}
                                    onValueChange={(v: any) => setStoryInfo({ ...storyInfo, style: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="photo">写真中心 (Photo-centric)</SelectItem>
                                        <SelectItem value="illustration">イラスト (Illustration)</SelectItem>
                                        <SelectItem value="typography">文字デザイン (Typography)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Upload Area */}
                            <div className="space-y-2">
                                <Label>参考画像 <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={storyInfo.referenceImage || ""}
                                        onChange={(e) => {
                                            setStoryInfo({ ...storyInfo, referenceImage: e.target.value });
                                            setUploadedImage(null);
                                        }}
                                        placeholder="https://example.com/story.jpg"
                                        disabled={!!uploadedImage}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline" size="icon"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-4 h-4" />
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {uploadedImage && (
                                    <div className="mt-2 relative w-20 h-auto aspect-[9/16] rounded-md overflow-hidden border bg-muted mx-auto">
                                        <img src={uploadedImage} className="w-full h-full object-cover" />
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute top-1 right-1 h-5 w-5"
                                            onClick={() => setUploadedImage(null)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>投稿テーマ <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="例：新商品の発売開始、Q&A募集"
                                value={storyInfo.theme}
                                onChange={(e) => setStoryInfo({ ...storyInfo, theme: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ターゲット層（オプション）</Label>
                            <Input
                                placeholder="例：20代女性、美容に関心がある人"
                                value={storyInfo.target}
                                onChange={(e) => setStoryInfo({ ...storyInfo, target: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>画像に入れる文字（オプション）</Label>
                            <Input
                                placeholder="例：NEW ARRIVAL"
                                value={storyInfo.textOverlay}
                                onChange={(e) => setStoryInfo({ ...storyInfo, textOverlay: e.target.value })}
                            />
                        </div>

                        <Button className="w-full" size="lg" onClick={handleAnalyze} disabled={isPending || !storyInfo.theme || (!storyInfo.referenceImage && !uploadedImage)}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <ScanEye className="mr-2" />}
                            参考画像を分析する
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: Refinement */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: デザイン指示の調整</CardTitle>
                        <CardDescription>生成AIに送る指示書（プロンプト）を調整できます。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Reference Image Preview */}
                        <div className="flex gap-4 items-start">
                            <div className="w-24 h-40 rounded border overflow-hidden bg-muted flex-shrink-0 mx-auto md:mx-0">
                                <img
                                    src={uploadedImage || storyInfo.referenceImage}
                                    alt="参考画像"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm flex-1">
                                <p className="font-bold border-b pb-2 mb-2">抽出されたデザインルール</p>
                                {analysisResult && (
                                    <>
                                        <p>📐 レイアウト: {analysisResult.layout?.slice(0, 50)}...</p>
                                        <p>🎨 配色: {analysisResult.colors?.background} / {analysisResult.colors?.text_primary}</p>
                                        <p>✨ スタイル: {analysisResult.visual_style?.slice(0, 50)}...</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" /> 生成プロンプト（編集可能）
                            </Label>
                            <RefinementArea
                                initialContent={promptText}
                                contextData={{
                                    tool: "insta-story",
                                    toolName: "Instaストーリーズ生成",
                                    analysis: analysisResult,
                                    storyInfo: storyInfo
                                }}
                                onContentUpdate={(newContent) => setPromptText(newContent)}
                                contentType="text"
                            />
                            <p className="text-xs text-muted-foreground">※ここを詳しく書き換えることで、生成される画像のデザインを細かく制御できます。</p>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={() => setStep(1)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                            </Button>
                            <Button className="flex-1" onClick={handleGenerate} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                画像を生成する（1枚）
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: Generation Result */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>生成結果</CardTitle>
                        <CardDescription>生成されたストーリーズ画像です。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {generatedImages.length > 0 && (
                            <div className="flex flex-col items-center space-y-6">
                                <div className="relative group rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50 max-w-sm w-full mx-auto">
                                    <div className="aspect-[9/16] bg-muted">
                                        <img
                                            src={generatedImages[0].image}
                                            alt="生成されたストーリーズ"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                </div>

                                <Button
                                    size="lg"
                                    className="w-full max-w-xs shadow-lg text-base"
                                    onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = generatedImages[0].image;
                                        a.download = `insta-story-${Date.now()}.png`;
                                        a.click();
                                        toast({ title: "ダウンロード開始", description: "間もなく保存されます" });
                                    }}
                                >
                                    <Download className="w-5 h-5 mr-2" />
                                    画像を保存する
                                </Button>
                            </div>
                        )}

                        {/* Interactive Refinement Section */}
                        <div className="border-t pt-6 space-y-4">
                            <p className="text-sm font-medium">🔄 修正したい場合は下に指示を入力してください</p>

                            {refinementHistory.length > 0 && (
                                <div className="bg-muted p-3 rounded text-xs space-y-1">
                                    <p className="font-bold">📝 過去の修正指示:</p>
                                    {refinementHistory.map((r, i) => (
                                        <p key={i} className="text-muted-foreground">• {r}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Input
                                    id="refinement-input-story"
                                    placeholder="例: 背景をもっと明るくして"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget.value;
                                            if (!input.trim()) return;
                                            e.currentTarget.value = '';
                                            handleRefinement(input);
                                        }
                                    }}
                                />
                                <Button
                                    variant="default"
                                    disabled={isPending}
                                    onClick={() => {
                                        const inputEl = document.getElementById('refinement-input-story') as HTMLInputElement;
                                        const input = inputEl?.value || '';
                                        if (!input.trim()) {
                                            toast({ title: "修正指示を入力してください", variant: "destructive" });
                                            return;
                                        }
                                        inputEl.value = '';
                                        handleRefinement(input);
                                    }}
                                >
                                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                                    <span className="ml-2">再生成</span>
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-8">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> プロンプト全体を編集
                            </Button>
                            <Button variant="ghost" onClick={() => {
                                setStep(1);
                                setGeneratedImages([]);
                                setPromptText("");
                                setRefinementHistory([]);
                            }}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                新しく作る
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div >
    );
}
