"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon, Download, Upload, X, ArrowRight, ArrowLeft, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeNoteThumbnail, generateNoteThumbnails, generateNotePrompt } from "@/app/actions/noteThumbnail";
import { saveCreation } from "@/app/actions/history";
import { uploadImage } from "@/app/actions/storage";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

export function NoteThumbnailWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Inputs
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("business");
    const [platform, setPlatform] = useState("note"); // New state
    const [referenceUrl, setReferenceUrl] = useState("");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // AI Data
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [promptText, setPromptText] = useState("");
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);

    // Additional images for Step 2/3 (user can upload images to add to generation)
    const [additionalImages, setAdditionalImages] = useState<{ image: string; description: string }[]>([]);
    const [refinementHistory, setRefinementHistory] = useState<string[]>([]);

    // Handle File Upload (Step 1 reference image)
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setUploadedImage(event.target.result as string);
                setReferenceUrl(""); // Clear URL if upload is used
            }
        };
        reader.readAsDataURL(file);
    };

    // Handle additional image upload (Step 2/3)
    const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setAdditionalImages(prev => [...prev, { image: event.target!.result as string, description: "" }]);
            }
        };
        reader.readAsDataURL(file);
    };

    // Step 1 -> Analysis
    const handleAnalyze = () => {
        const imageSource = uploadedImage || referenceUrl;
        if (!imageSource) {
            toast({ title: "参考画像を指定してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeNoteThumbnail(imageSource);
            if (result.success && result.data) {
                setAnalysisResult(result.data);

                // Automatically generate prompt for refinement
                const promptRes = await generateNotePrompt(result.data, title, category);
                if (promptRes.success) {
                    setPromptText(promptRes.prompt || "");
                    setStep(2);
                    toast({ title: "分析完了", description: "プロンプトを確認してください" });
                } else {
                    toast({ title: "プロンプト生成エラー", description: promptRes.error, variant: "destructive" });
                }
            } else {
                toast({ title: "分析エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // Step 2 -> Generate (with additional images and refinement history)
    const handleGenerate = () => {
        const imageSource = uploadedImage || referenceUrl;

        // Build final prompt including additional image descriptions and refinement history
        let finalPrompt = promptText;

        // Append additional image descriptions
        if (additionalImages.length > 0) {
            const imageDescs = additionalImages
                .filter(img => img.description.trim())
                .map((img, i) => `画像${i + 1}: ${img.description}`)
                .join('\n');
            if (imageDescs) {
                finalPrompt += `\n\n【追加素材の説明】\n以下の追加画像を参考にして生成してください：\n${imageDescs}`;
            }
        }

        // Append refinement history
        if (refinementHistory.length > 0) {
            finalPrompt += `\n\n【過去の修正指示（累積）】\n` + refinementHistory.map((r, i) => `${i + 1}. ${r}`).join('\n');
        }

        startTransition(async () => {
            const result = await generateNoteThumbnails(
                analysisResult,
                title,
                category,
                1, // Request 1 image explicitly
                finalPrompt,
                platform, // Pass platform
                imageSource || undefined // Pass reference image if available
            );

            if (result.success && result.images) {
                setGeneratedImages(result.images);

                // Save to History - Upload images first to prevent payload limits
                try {
                    const uploadedArtifacts = [];
                    for (const item of result.images) {
                        if (!item) continue;

                        // Check if it's base64 (likely) and upload
                        if (item.image && item.image.startsWith('data:')) {
                            const uploadRes = await uploadImage(item.image, 'thumbnails', 'note-history');
                            if (uploadRes.success && uploadRes.url) {
                                uploadedArtifacts.push({ image: uploadRes.url });
                            } else {
                                console.warn("Failed to upload image for history:", uploadRes.error);
                            }
                        } else if (item.image) {
                            // If it's already a URL (unlikely but possible), just use it
                            uploadedArtifacts.push({ image: item.image });
                        }
                    }

                    if (uploadedArtifacts.length > 0) {
                        const saveResult = await saveCreation(
                            `Noteサムネイル(${platform}): ${title}`,
                            'thumbnail',
                            uploadedArtifacts
                        );
                        if (saveResult.success) {
                            toast({ title: "生成完了", description: "履歴に保存されました" });
                        } else {
                            console.error("History save failed:", saveResult.error);
                            toast({ title: "生成完了", description: `履歴保存に失敗しました: ${saveResult.error}`, variant: "destructive" });
                        }
                    } else {
                        // Even if upload failed, show success for generation, but warn about history
                        toast({ title: "生成完了", description: "※履歴保存用の画像アップロードに失敗しました", variant: "destructive" });
                    }
                } catch (e: any) {
                    console.error("History save exception:", e);
                    toast({ title: "生成完了", description: `履歴保存中にエラーが発生しました: ${e.message}`, variant: "destructive" });
                }

                setStep(3);
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
            {/* STEP 1: Settings & Analysis */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: サムネイル設定</CardTitle>
                        <CardDescription>記事タイトルと参考画像（URLまたはアップロード）を設定してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>記事タイトル（画像に入れる文字） <span className="text-red-500">*</span></Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：月収100万達成ロードマップ" />
                            </div>

                            <div className="space-y-2">
                                <Label>掲載プラットフォーム</Label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="note">Note (1280x670)</SelectItem>
                                        <SelectItem value="brain">Brain (1280x670)</SelectItem>
                                        <SelectItem value="tips">Tips (1200x630)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>参考画像（デザインの元ネタ） <span className="text-red-500">*</span></Label>

                            {/* Upload Area */}
                            <div className="flex gap-4 items-start">
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={referenceUrl}
                                            onChange={(e) => {
                                                setReferenceUrl(e.target.value);
                                                setUploadedImage(null);
                                            }}
                                            placeholder="https://example.com/image.jpg"
                                            disabled={!!uploadedImage}
                                        />
                                        <div className="text-muted-foreground text-sm flex items-center">または</div>
                                        <Button
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            画像選択
                                        </Button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">URLを入力するか、手持ちの参考画像をアップロードしてください。設定すると生成時にも参考にされます。</p>
                                </div>
                            </div>

                            {/* Preview Uploaded */}
                            {uploadedImage && (
                                <div className="mt-2 relative w-md max-w-[200px] aspect-video rounded-md overflow-hidden border">
                                    <img src={uploadedImage} className="w-full h-full object-cover" />
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-1 right-1 h-6 w-6"
                                        onClick={() => setUploadedImage(null)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>カテゴリ</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="business">ビジネス・ノウハウ</SelectItem>
                                    <SelectItem value="essay">エッセイ・体験談</SelectItem>
                                    <SelectItem value="tech">技術・プログラミング</SelectItem>
                                    <SelectItem value="life">ライフスタイル</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button className="w-full" onClick={handleAnalyze} disabled={isPending || !title || (!referenceUrl && !uploadedImage)}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                            分析開始
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: Refinement */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: プロンプト（指示書）の調整</CardTitle>
                        <CardDescription>AIが作成した指示書を調整できます。「もっと明るく」などの要望があれば書き加えてください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Large Reference Image Preview */}
                        <div className="space-y-2">
                            <Label className="font-bold">📷 参考画像</Label>
                            <div className="w-full aspect-[1.91/1] rounded-lg border overflow-hidden bg-muted">
                                <img
                                    src={uploadedImage || referenceUrl}
                                    alt="参考画像"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                                {analysisResult && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <p>🎨 配色: {typeof analysisResult.colors === 'object'
                                            ? `${analysisResult.colors.background} / ${analysisResult.colors.text_primary}`
                                            : analysisResult.colors}</p>
                                        <p>📐 レイアウト: {analysisResult.layout?.slice(0, 50)}...</p>
                                        <p>🖋️ フォント: {analysisResult.typography?.slice(0, 50)}...</p>
                                        <p>✨ スタイル: {analysisResult.style?.slice(0, 50)}...</p>
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-muted-foreground">プラットフォーム: <span className="font-bold uppercase">{platform}</span></p>
                            </div>
                        </div>

                        {/* Additional Images Upload Section */}
                        <div className="space-y-3">
                            <Label className="font-bold flex items-center gap-2">
                                <Upload className="w-4 h-4" /> 追加素材（オプション）
                            </Label>
                            <p className="text-xs text-muted-foreground">生成に含めたい追加画像があればアップロードし、説明を入力してください。</p>

                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => document.getElementById('additional-image-input')?.click()}>
                                    <Upload className="w-4 h-4 mr-2" /> 画像を追加
                                </Button>
                                <input
                                    id="additional-image-input"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAdditionalImageUpload}
                                />
                            </div>

                            {additionalImages.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {additionalImages.map((img, idx) => (
                                        <div key={idx} className="border rounded p-2 space-y-2">
                                            <div className="relative aspect-video bg-muted rounded overflow-hidden">
                                                <img src={img.image} alt={`追加画像${idx + 1}`} className="w-full h-full object-cover" />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-1 right-1 h-6 w-6"
                                                    onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <Input
                                                value={img.description}
                                                onChange={(e) => setAdditionalImages(prev => prev.map((item, i) => i === idx ? { ...item, description: e.target.value } : item))}
                                                placeholder="この画像の説明（例：背景に使用してほしい）"
                                                className="text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Editable Prompt */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold">
                                <Sparkles className="w-4 h-4 text-primary" /> 生成プロンプト（編集可能）
                            </Label>
                            <p className="text-xs text-muted-foreground">このプロンプトに画像の全ての要素が記述されています。編集することで生成結果をコントロールできます。</p>
                            <RefinementArea
                                initialContent={promptText}
                                contextData={{
                                    tool: "note-thumbnail",
                                    toolName: "Noteサムネイル生成",
                                    analysis: analysisResult,
                                    title: title,
                                    category: category
                                }}
                                onContentUpdate={(newContent) => setPromptText(newContent)}
                                contentType="text"
                            />
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

            {/* STEP 3: Result */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>生成結果</CardTitle>
                        <CardDescription>画像を確認し、必要に応じて対話形式で修正できます。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {generatedImages.length > 0 && (
                            <div className="flex flex-col items-center space-y-6">
                                <div className="relative group rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50 max-w-4xl w-full">
                                    <div className="aspect-[1.91/1] bg-muted">
                                        <img
                                            src={generatedImages[0].image}
                                            alt="生成されたサムネイル"
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
                                        a.download = `note-thumb-${Date.now()}.png`;
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
                            <p className="text-sm font-medium">🔄 修正したい場合は下に指示を入力してください（例：「背景をもっと暗くして」「文字を大きくして」）</p>

                            {/* Show refinement history */}
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
                                    id="refinement-input"
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
                                        const inputEl = document.getElementById('refinement-input') as HTMLInputElement;
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
                            }}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                新しく作る
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
