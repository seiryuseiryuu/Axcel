"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon, ScanEye, Download, Upload, X, ArrowRight, ArrowLeft, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveCreation } from "@/app/actions/history";
import { analyzeLineBanner, generateLineBanners, generateLinePrompt, type LineBannerInfo } from "@/app/actions/lineBanner";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

export function LineBannerWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Inputs
    const [bannerInfo, setBannerInfo] = useState<LineBannerInfo>({
        message: "",
        campaignDetail: "",
        size: "rich_message",
        buttonText: "詳細を見る",
        referenceImage: "" // URL for now
    });
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // Results
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [promptText, setPromptText] = useState("");
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);

    // Text block replacements and refinement history (matching Note workflow)
    const [textBlockReplacements, setTextBlockReplacements] = useState<Record<string, string>>({});
    const [refinementHistory, setRefinementHistory] = useState<string[]>([]);

    // Handle File Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setUploadedImage(event.target.result as string);
                setBannerInfo(prev => ({ ...prev, referenceImage: "" })); // Clear URL
            }
        };
        reader.readAsDataURL(file);
    };

    // Initialize text block replacements
    const initializeTextBlocks = (blocks: any[]) => {
        if (!blocks) return;
        const initial: Record<string, string> = {};
        blocks.forEach((block: any) => {
            initial[block.id] = "";
        });
        setTextBlockReplacements(initial);
    };

    const handleAnalyze = () => {
        const imageSource = uploadedImage || bannerInfo.referenceImage;
        if (!imageSource) {
            toast({ title: "参考画像を指定してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeLineBanner(imageSource);
            if (result.success && result.data) {
                setAnalysisResult(result.data);

                // Initialize text block replacements
                if (result.data.text_blocks) {
                    initializeTextBlocks(result.data.text_blocks);
                }

                // Prompt Generation
                const promptRes = await generateLinePrompt(result.data, bannerInfo);
                if (promptRes.success) {
                    setPromptText(promptRes.prompt);
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
        const imageSource = uploadedImage || bannerInfo.referenceImage;
        const finalInfo = {
            ...bannerInfo,
            referenceImage: imageSource || undefined
        };

        // Build final prompt with text block replacements and refinement history
        let finalPrompt = promptText;

        const blockInstructions = Object.entries(textBlockReplacements)
            .filter(([_, text]) => text.trim())
            .map(([id, text]) => `- ${id}: 「${text}」`)
            .join('\n');
        if (blockInstructions) {
            finalPrompt += `\n\n【重要：テキストブロック置換（厳守）】\n以下のテキストは**必ず**画像内に表示してください。\n${blockInstructions}`;
        }

        if (refinementHistory.length > 0) {
            finalPrompt += `\n\n【過去の修正指示（累積）】\n` + refinementHistory.map((r, i) => `${i + 1}. ${r}`).join('\n');
        }

        startTransition(async () => {
            const result = await generateLineBanners(
                analysisResult,
                finalInfo,
                1,
                finalPrompt
            );

            if (result.success && result.images) {
                setGeneratedImages(result.images);

                // Save to History - await properly
                try {
                    const saveResult = await saveCreation(
                        `LINEバナー: ${bannerInfo.message.slice(0, 15)}...`,
                        'image',
                        result.images
                    );
                    if (saveResult.success) {
                        toast({ title: "生成完了", description: "履歴に保存されました" });
                    } else {
                        console.error("History save failed:", saveResult.error);
                        toast({ title: "生成完了", description: `履歴保存エラー: ${saveResult.error}`, variant: "destructive" });
                    }
                } catch (e: any) {
                    console.error("History save exception:", e);
                    toast({ title: "生成完了", description: `履歴保存例外: ${e.message}`, variant: "destructive" });
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
                        <CardTitle>STEP 1: バナー要件定義</CardTitle>
                        <CardDescription>作成したいバナーの情報と、参考にしたいバナー画像を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>バナーサイズ</Label>
                                <Select
                                    value={bannerInfo.size}
                                    onValueChange={(v: any) => setBannerInfo({ ...bannerInfo, size: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rich_message">リッチメッセージ (1040x1040)</SelectItem>
                                        <SelectItem value="rich_menu">リッチメニュー (2500x1686)</SelectItem>
                                        <SelectItem value="card">カードタイプ (1024x520)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Upload Area */}
                            <div className="space-y-2">
                                <Label>参考バナー画像 <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={bannerInfo.referenceImage || ""}
                                        onChange={(e) => {
                                            setBannerInfo({ ...bannerInfo, referenceImage: e.target.value });
                                            setUploadedImage(null);
                                        }}
                                        placeholder="https://example.com/banner.jpg"
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
                                    <div className="mt-2 relative w-full h-20 rounded-md overflow-hidden border bg-muted">
                                        <img src={uploadedImage} className="w-full h-full object-contain" />
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
                            <Label>メインコピー（キャッチコピー） <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="例：期間限定50%OFF！"
                                value={bannerInfo.message}
                                onChange={(e) => setBannerInfo({ ...bannerInfo, message: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>サブテキスト（キャンペーン詳細）</Label>
                            <Textarea
                                placeholder="詳細な条件や期間など"
                                value={bannerInfo.campaignDetail}
                                onChange={(e) => setBannerInfo({ ...bannerInfo, campaignDetail: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ボタンテキスト</Label>
                            <Input
                                value={bannerInfo.buttonText}
                                onChange={(e) => setBannerInfo({ ...bannerInfo, buttonText: e.target.value })}
                            />
                        </div>

                        <Button className="w-full" size="lg" onClick={handleAnalyze} disabled={isPending || !bannerInfo.message || (!bannerInfo.referenceImage && !uploadedImage)}>
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
                            <div className="w-32 h-32 rounded border overflow-hidden bg-muted flex-shrink-0">
                                <img
                                    src={uploadedImage || bannerInfo.referenceImage}
                                    alt="参考画像"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm flex-1">
                                <p className="font-bold border-b pb-2 mb-2">抽出されたデザインルール</p>
                                {analysisResult && (
                                    <>
                                        <p>📐 レイアウト: {analysisResult.layout}</p>
                                        <p>🎨 配色: {analysisResult.colors?.main} / {analysisResult.colors?.accent}</p>
                                        <p>🖋️ タイポグラフィ: {analysisResult.typography}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Text Block Replacement Section */}
                        {analysisResult?.text_blocks && analysisResult.text_blocks.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded border border-blue-200 dark:border-blue-800 space-y-4">
                                <div>
                                    <p className="font-bold text-sm">📝 テキストブロック置換</p>
                                    <p className="text-xs text-muted-foreground">参考画像で検出されたテキストを、あなたのテキストに置き換えます。</p>
                                </div>
                                <div className="space-y-3">
                                    {analysisResult.text_blocks.map((block: any) => (
                                        <div key={block.id} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs font-medium">{block.id}</Label>
                                                <span className="text-xs text-muted-foreground">({block.size}, {block.position})</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground italic mb-1">元のテキスト: 「{block.original_text}」</p>
                                            <Input
                                                value={textBlockReplacements[block.id] || ''}
                                                onChange={(e) => setTextBlockReplacements(prev => ({ ...prev, [block.id]: e.target.value }))}
                                                placeholder="置換するテキストを入力..."
                                                className="w-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" /> 生成プロンプト（編集可能）
                            </Label>
                            <RefinementArea
                                initialContent={promptText}
                                contextData={{
                                    tool: "line-banner",
                                    toolName: "LINEバナー生成",
                                    analysis: analysisResult,
                                    bannerInfo: bannerInfo
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
                                バナーを生成する（1枚）
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )
            }

            {/* STEP 3: Generation Result */}
            {
                step === 3 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>生成結果</CardTitle>
                            <CardDescription>生成されたバナーデザイン案です。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {generatedImages.length > 0 && (
                                <div className="flex flex-col items-center space-y-6">
                                    <div className="relative group rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50 max-w-4xl w-full">
                                        <div className="aspect-square bg-muted">
                                            <img
                                                src={generatedImages[0].image}
                                                alt="生成されたバナー"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full max-w-sm shadow-lg text-base"
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = generatedImages[0].image;
                                            a.download = `banner-${Date.now()}.png`;
                                            a.click();
                                            toast({ title: "ダウンロード開始", description: "間もなく保存されます" });
                                        }}
                                    >
                                        <Download className="w-5 h-5 mr-2" />
                                        画像を保存する
                                    </Button>
                                    <p className="text-sm text-muted-foreground">{generatedImages[0].description}</p>
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
                                        id="refinement-input-line"
                                        placeholder="例: 背景をもう少しシンプルにして"
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
                                            const inputEl = document.getElementById('refinement-input-line') as HTMLInputElement;
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
                )
            }
        </div >
    );
}
