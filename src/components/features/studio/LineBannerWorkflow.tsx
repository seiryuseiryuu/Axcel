"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, X, ArrowLeft, Wand2, Sparkles, Palette } from "lucide-react";
import Image from "next/image";
import * as LineBannerActions from "@/app/actions/lineBanner";
import { generateArrangedContent } from "@/app/actions/noteThumbnail";
import { uploadImage } from "@/app/actions/storage";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Size definitions
const BANNER_SIZES = [
    { id: 'square', name: '正方形 (1040×1040)', ratio: '1:1', desc: '標準的なリッチメッセージ・投稿用' },
    { id: 'card_small', name: '横長 小 (1040×350)', ratio: '3:1', desc: 'コンパクトなアナウンス用' },
    { id: 'card_large', name: '横長 大 (1040×700)', ratio: '3:2', desc: '標準的な横型リッチメッセージ' },
    { id: 'vertical', name: '縦長 (1040×1300)', ratio: '4:5', desc: 'スマホ画面を大きく使う縦型' },
    { id: 'vertical_full', name: '縦長 フル (1040×1850)', ratio: '9:16', desc: '画面占有率最大。インパクト重視' },
];

export function LineBannerWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Step 1: Settings
    const [sizeMode, setSizeMode] = useState("square");
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [mainColor, setMainColor] = useState("#00B900");
    const [useCustomColor, setUseCustomColor] = useState(false);

    // Step 2: Replacement Map (like Note/Brain/Tips)
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [promptData, setPromptData] = useState<{
        base_style_prompt: string;
        replacements: {
            id: number;
            element_name: string;
            type?: string;
            original_content: string;
            new_content: string;
        }[];
        design_notes?: string;
    } | null>(null);
    const [customInstruction, setCustomInstruction] = useState("");
    const [additionalMaterials, setAdditionalMaterials] = useState<{ image: string; description: string }[]>([]);
    const [arrangingIds, setArrangingIds] = useState<Set<number>>(new Set());

    // Step 3: Result & Refinement
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [refinementHistory, setRefinementHistory] = useState<string[]>([]);

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

    const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            startTransition(async () => {
                const result = await uploadImage(base64);
                if (result.success && result.url) {
                    setAdditionalMaterials(prev => [...prev, { image: result.url!, description: "" }]);
                    toast({ title: "追加素材をアップロードしました" });
                } else {
                    toast({ title: "アップロード失敗", variant: "destructive" });
                }
            });
        };
        reader.readAsDataURL(file);
    };

    // STEP 1 → STEP 2: Analyze & generate replacement map
    const handleAnalyze = () => {
        if (!referenceImage) {
            toast({ title: "参考画像をアップロードしてください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await LineBannerActions.analyzeLineBanner(referenceImage);
            if (result.success && result.data) {
                setAnalysisResult(result.data);

                // Generate replacement map (like Note tool)
                const promptRes = await LineBannerActions.generateLinePrompt(result.data, "（タイトル未定）");
                if (promptRes.success && promptRes.data) {
                    setPromptData(promptRes.data);
                    setStep(2);
                    toast({ title: "分析完了", description: "要素置換マップを確認してください" });
                } else {
                    toast({ title: "プロンプト生成エラー", description: promptRes.error, variant: "destructive" });
                }
            } else {
                toast({ title: "分析エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // Update replacement content
    const updateReplacement = (id: number, newVal: string) => {
        if (!promptData) return;
        setPromptData({
            ...promptData,
            replacements: promptData.replacements.map(r => r.id === id ? { ...r, new_content: newVal } : r)
        });
    };

    // AI Arrange handler
    const handleArrangeContent = async (id: number, elementName: string, originalContent: string) => {
        if (!promptData) return;
        setArrangingIds(prev => new Set(prev).add(id));
        try {
            const result = await generateArrangedContent(elementName, originalContent);
            if (result.success && result.arrangedContent) {
                setPromptData({
                    ...promptData,
                    replacements: promptData.replacements.map(r =>
                        r.id === id ? { ...r, new_content: result.arrangedContent! } : r
                    )
                });
                toast({ title: "アレンジ完了", description: `「${elementName}」をアレンジしました` });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        } finally {
            setArrangingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    // Build prompt from replacement map
    const buildFinalPrompt = (history: string[] = []) => {
        if (!promptData || !analysisResult) return "";

        const sizeContext = BANNER_SIZES.find(s => s.id === sizeMode)?.name || sizeMode;
        const colorInstr = useCustomColor
            ? `\n[COLOR OVERRIDE]\nPrimary Color: ${mainColor}. Adjust the entire color scheme to match. Maintain contrast and readability.`
            : "";

        let prompt = `[BASE STYLE]\n${promptData.base_style_prompt}\n\n[SIZE TARGET]\n${sizeContext}\n${colorInstr}\n\n[REPLACEMENT PLAN]\n`;

        promptData.replacements.forEach(r => {
            const content = r.new_content || "維持";
            if (r.type === 'text') {
                prompt += `- Element: ${r.element_name} (Text)\n  Original: ${r.original_content}\n  REPLACE TEXT: "${content}"\n`;
            } else {
                prompt += `- Element: ${r.element_name}\n  Original: ${r.original_content}\n  REPLACE WITH: ${content}\n`;
            }
        });

        if (customInstruction) {
            prompt += `\n[ADDITIONAL INSTRUCTIONS]\n${customInstruction}`;
        }
        if (history.length > 0) {
            prompt += `\n\n[HISTORY]\n` + history.map((r, i) => `${i + 1}. ${r}`).join('\n');
        }
        return prompt;
    };

    // STEP 2 → STEP 3: Generate
    const handleGenerate = () => {
        if (!analysisResult) return;

        const finalPrompt = buildFinalPrompt();

        startTransition(async () => {
            const result = await LineBannerActions.generateLineBanner(
                analysisResult,
                1,
                finalPrompt,
                sizeMode,
                referenceImage!,
                null,
                additionalMaterials,
                useCustomColor ? mainColor : undefined
            );

            if (result.success && result.images && result.images.length > 0) {
                const newImageUrl = result.images[0].imageUrl;
                setGeneratedImages([newImageUrl]);

                // Save to history
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `LINEバナー (${BANNER_SIZES.find(s => s.id === sizeMode)?.name || sizeMode})`,
                        'thumbnail',
                        { images: result.images }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(3);
                toast({ title: "バナーを生成しました" });
            } else {
                toast({ title: "生成エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // STEP 3: Refinement
    const handleRefinement = (instruction: string) => {
        if (!instruction.trim() || !analysisResult) return;

        const newHistory = [...refinementHistory, instruction];
        setRefinementHistory(newHistory);

        const finalPrompt = buildFinalPrompt(newHistory);

        startTransition(async () => {
            const result = await LineBannerActions.generateLineBanner(
                analysisResult,
                1,
                finalPrompt,
                sizeMode,
                referenceImage!,
                generatedImages[0] || null, // Use previous image for refinement
                additionalMaterials,
                useCustomColor ? mainColor : undefined
            );

            if (result.success && result.images && result.images.length > 0) {
                const newImageUrl = result.images[0].imageUrl;
                setGeneratedImages([newImageUrl]);
                toast({ title: "修正完了", description: "バナーが更新されました" });
            } else {
                toast({ title: "修正失敗", description: result.error, variant: "destructive" });
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
                <span className={step === 1 ? "font-bold text-primary" : ""}>Step 1: 設定・アップロード</span>
                <span>/</span>
                <span className={step === 2 ? "font-bold text-primary" : ""}>Step 2: 要素の置換設定</span>
                <span>/</span>
                <span className={step === 3 ? "font-bold text-primary" : ""}>Step 3: 生成・調整</span>
            </div>

            {/* ===== STEP 1: Configuration ===== */}
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
                            </CardContent>
                        </Card>

                        {/* Color Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">2. メインカラー設定</CardTitle>
                                <CardDescription>チェックなしの場合は参考画像と同系色で作成します。</CardDescription>
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
                                    <Label htmlFor="useCustomColor">カラーを指定する</Label>
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
                                    レイアウトや雰囲気を学習して、指定サイズに調整します。
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
                            <div className="p-6 pt-0">
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleAnalyze}
                                    disabled={!referenceImage || isPending}
                                >
                                    {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                                    画像を分析して次へ
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ===== STEP 2: Replacement Map ===== */}
            {step === 2 && promptData && (
                <Card className="animate-in fade-in slide-in-from-right-4">
                    <CardHeader>
                        <CardTitle>STEP 2: 要素の置換設定</CardTitle>
                        <CardDescription>参考画像のどの要素を変更するか指定してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Reference Image Preview */}
                        <div className="flex gap-4 items-center bg-muted/30 p-3 rounded-lg">
                            {referenceImage && <img src={referenceImage} className="h-16 w-auto rounded border" alt="参考" />}
                            <div className="text-sm text-muted-foreground">
                                <p>サイズ: {BANNER_SIZES.find(s => s.id === sizeMode)?.name}</p>
                                <p>カラー: {useCustomColor ? mainColor : "画像準拠"}</p>
                            </div>
                        </div>

                        {/* Replacement Map Table */}
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">要素名</TableHead>
                                        <TableHead className="w-[30%]">元の内容（AI分析）</TableHead>
                                        <TableHead>変更後の内容</TableHead>
                                        <TableHead className="w-[60px] text-center">AI</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {promptData.replacements.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium bg-muted/10">
                                                <div>{row.element_name}</div>
                                                {row.type && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                        row.type === 'text' ? 'bg-blue-100 text-blue-700' :
                                                        row.type === 'visual' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {row.type === 'text' ? '文字' : row.type === 'visual' ? '見た目' : row.type}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{row.original_content}</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={row.new_content}
                                                    onChange={(e) => updateReplacement(row.id, e.target.value)}
                                                    placeholder="入力するか、AIボタンでアレンジ"
                                                    className="bg-background"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                                    onClick={() => handleArrangeContent(row.id, row.element_name, row.original_content)}
                                                    disabled={arrangingIds.has(row.id)}
                                                    title="AIでアレンジ"
                                                >
                                                    {arrangingIds.has(row.id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Additional Materials */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="font-bold flex items-center gap-2">
                                <Upload className="w-4 h-4" /> 追加素材（ロゴ・写真など）
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                デザインに組み込みたい素材がある場合はここでアップロードしてください。
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => document.getElementById('line-additional-input')?.click()}>
                                    <Upload className="w-4 h-4 mr-2" /> 素材を追加
                                </Button>
                                <input
                                    id="line-additional-input"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAdditionalImageUpload}
                                />
                            </div>
                            {additionalMaterials.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {additionalMaterials.map((mat, idx) => (
                                        <div key={idx} className="flex gap-3 border rounded p-2 items-start">
                                            <div className="w-20 h-20 shrink-0 bg-muted rounded overflow-hidden">
                                                <img src={mat.image} alt={`追加画像${idx + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-xs">この素材の使い方</Label>
                                                <Input
                                                    value={mat.description}
                                                    onChange={(e) => setAdditionalMaterials(prev => prev.map((item, i) => i === idx ? { ...item, description: e.target.value } : item))}
                                                    placeholder="例：ロゴとして配置、背景として使用..."
                                                    className="text-xs"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive h-6 px-2"
                                                    onClick={() => setAdditionalMaterials(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                    <X className="w-3 h-3 mr-1" /> 削除
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom Instruction */}
                        <div className="space-y-2 pt-4 border-t">
                            <Label>その他の指示（任意）</Label>
                            <Textarea
                                value={customInstruction}
                                onChange={(e) => setCustomInstruction(e.target.value)}
                                placeholder="例：全体的にもう少し明るくして、ボタン風のデザインにして"
                                className="h-20"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={() => { setStep(1); setPromptData(null); }}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 設定に戻る
                            </Button>
                            <Button className="flex-1" onClick={handleGenerate} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                バナーを生成する
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ===== STEP 3: Result & Refinement ===== */}
            {step === 3 && (
                <Card className="animate-in fade-in slide-in-from-right-4">
                    <CardHeader>
                        <CardTitle>STEP 3: 生成結果</CardTitle>
                        <CardDescription>バナーを確認し、必要に応じて修正できます。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {generatedImages.length > 0 && (
                            <div className="flex flex-col items-center space-y-6">
                                <div className="relative group rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50 max-w-4xl w-full">
                                    <div className="bg-muted flex items-center justify-center">
                                        <img
                                            src={generatedImages[0]}
                                            alt="Generated Banner"
                                            className="max-w-full max-h-[600px] object-contain"
                                        />
                                    </div>
                                    {isPending && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-12 h-12 animate-spin text-white" />
                                                <p className="text-white font-medium">修正を反映中...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="lg"
                                        onClick={() => window.open(generatedImages[0], '_blank')}
                                    >
                                        <Download className="w-5 h-5 mr-2" /> 保存 / 確認
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Refinement Area */}
                        <div className="border-t pt-6 space-y-4">
                            <p className="text-sm font-medium">修正したい場合は下に指示を入力してください</p>

                            {refinementHistory.length > 0 && (
                                <div className="bg-muted p-3 rounded text-xs space-y-1">
                                    <p className="font-bold">過去の修正:</p>
                                    {refinementHistory.map((r, i) => (
                                        <p key={i} className="text-muted-foreground">- {r}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Input
                                    id="line-refinement-input"
                                    placeholder="例: 文字を大きくして、キラキラさせて"
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
                                    onClick={() => {
                                        const inputEl = document.getElementById('line-refinement-input') as HTMLInputElement;
                                        if (inputEl?.value.trim()) {
                                            handleRefinement(inputEl.value);
                                            inputEl.value = '';
                                        }
                                    }}
                                    disabled={isPending}
                                >
                                    再生成
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-8">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 設定に戻る
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
