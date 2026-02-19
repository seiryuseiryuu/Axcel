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
import { analyzeNoteThumbnail, generateNoteThumbnails, generateNotePrompt, generateArrangedContent } from "@/app/actions/noteThumbnail";
import { saveCreation } from "@/app/actions/history";
import { uploadImage } from "@/app/actions/storage";
import { RefinementArea } from "@/components/features/studio/RefinementArea";
import { Checkbox } from "@/components/ui/checkbox";

// ... imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Need to import this
// ...

export function NoteThumbnailWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Inputs
    // REMOVED: title, category inputs from user in Step 1
    const [platform, setPlatform] = useState("note"); // New state
    const [referenceUrl, setReferenceUrl] = useState("");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // AI Data
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [promptData, setPromptData] = useState<{
        base_style_prompt: string;
        replacements: {
            id: number;
            element_name: string;
            type?: 'text' | 'visual' | 'style' | 'color'; // Added type
            original_content: string;
            new_content: string;
            is_omakase?: boolean
        }[];
        design_notes?: string;
    } | null>(null);

    // Legacy promptText (still used for custom tweaks if needed, or constructed from table)
    const [customInstruction, setCustomInstruction] = useState("");

    const [generatedImages, setGeneratedImages] = useState<any[]>([]);

    // Additional images for Step 2/3 (user can upload images to add to generation)
    const [additionalImages, setAdditionalImages] = useState<{ image: string; description: string }[]>([]);
    const [refinementHistory, setRefinementHistory] = useState<string[]>([]);
    const [arrangingIds, setArrangingIds] = useState<Set<number>>(new Set());

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            startTransition(async () => {
                const result = await uploadImage(base64);
                if (result.success && result.url) {
                    setUploadedImage(result.url);
                    toast({ title: "画像をアップロードしました" });
                } else {
                    toast({ title: "アップロード失敗", description: result.error, variant: "destructive" });
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
                    setAdditionalImages(prev => [...prev, { image: result.url!, description: "" }]);
                    toast({ title: "追加素材をアップロードしました" });
                } else {
                    toast({ title: "アップロード失敗", description: result.error, variant: "destructive" });
                }
            });
        };
        reader.readAsDataURL(file);
    };

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

                // Automatically generate prompt plan
                const promptRes = await generateNotePrompt(result.data, "（タイトル未定）", "（カテゴリ未指定）");
                if (promptRes.success && promptRes.data) {
                    // Initialize with is_omakase: false
                    const dataWithOmakase = {
                        ...promptRes.data,
                        replacements: promptRes.data.replacements.map((r: any) => ({ ...r, is_omakase: false }))
                    };
                    setPromptData(dataWithOmakase);
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

    const handleGenerate = () => {
        const imageSource = uploadedImage || referenceUrl;
        if (!promptData) return;

        let finalPrompt = `[BASE STYLE]\n${promptData.base_style_prompt}\n\n[REPLACEMENT PLAN]\n`;
        const isAnyOmakase = promptData.replacements.some(r => r.is_omakase);

        promptData.replacements.forEach(r => {
            let content = r.new_content;

            // "お任せ" logic - Updated for Checkbox and stronger Text/Font handling
            if (r.is_omakase || content.match(/(お任せ|おまかせ|任せ|任せる)/)) {
                content = `[ACTION: PROFESSIONAL UPGRADE] 
- TEXT: IGNORE original. WRITE NEW, POWERFUL Japanese Copywriting.
- FONT: Must use ULTRA-BOLD/IMPACT fonts.
- STYLE: Commercial Quality, 3D Effects.`;

                // Hide original content specifically for Omakase to prevent inheritance
                finalPrompt += `- Element: ${r.element_name}\n  INSTRUCTION: ${content}\n`;
            } else if (content.includes("アップロード") || content.includes("画像") || content.includes("写真")) {
                // Simplified Material instruction to let backend handle the rest
                content = "ACTION: USE PROVIDED ADDITIONAL MATERIAL IMAGE.";
                finalPrompt += `- Element: ${r.element_name}\n  Original: ${r.original_content}\n  REPLACE WITH: ${content}\n`;
            } else {
                // NEW: Type-based instruction
                if (r.type === 'visual' || r.type === 'style' || r.type === 'color') {
                    finalPrompt += `- Element: ${r.element_name} (Type: ${r.type})\n  Original: ${r.original_content}\n  INSTRUCTION: [COMPLETELY REPLACE] Delete the original element. Insert "${content}" instead. Do NOT blend with original. This is a full substitution.\n`;
                } else if (r.type === 'text') {
                    finalPrompt += `- Element: ${r.element_name} (Type: Text)\n  Original: ${r.original_content}\n  INSTRUCTION: REPLACE TEXT CONTENT. New Text: "${content}"\n`;
                } else {
                    // Fallback for untyped or legacy
                    finalPrompt += `- Element: ${r.element_name}\n  Original: ${r.original_content}\n  REPLACE WITH: ${content}\n`;
                }
            }
        });

        if (customInstruction) {
            finalPrompt += `\n[ADDITIONAL INSTRUCTIONS]\n${customInstruction}`;
        }

        if (refinementHistory.length > 0) {
            finalPrompt += `\n\n[HISTORY]\n` + refinementHistory.map((r, i) => `${i + 1}. ${r}`).join('\n');
        }

        startTransition(async () => {
            const result = await generateNoteThumbnails(
                analysisResult,
                "（指定なし）",
                "business",
                1,
                finalPrompt,
                platform,
                imageSource || undefined,
                undefined,
                additionalImages
            );

            if (result.success && result.images) {
                setGeneratedImages(result.images);

                // Save Creation History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `Note Thumbnail (${platform})`,
                        'thumbnail',
                        { images: result.images }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(3);
            }
        });
    };

    const handleRefinement = (instruction: string) => {
        if (!instruction.trim()) return;

        // Update history immediately for UI
        const newHistory = [...refinementHistory, instruction];
        setRefinementHistory(newHistory);

        const imageSource = uploadedImage || referenceUrl;
        if (!promptData) return;

        // Reconstruct prompt with new history
        let finalPrompt = `[BASE STYLE]\n${promptData.base_style_prompt}\n\n[REPLACEMENT PLAN]\n`;
        promptData.replacements.forEach(r => {
            let content = r.new_content;

            if (r.is_omakase || content.match(/(お任せ|おまかせ|任せ|任せる)/)) {
                content = `[ACTION: PROFESSIONAL UPGRADE] 
- TEXT: IGNORE original. WRITE NEW, POWERFUL Japanese Copywriter Copy.
- FONT: Must use ULTRA-BOLD/IMPACT fonts.
- STYLE: Commercial Quality, 3D Effects.`;
                finalPrompt += `- Element: ${r.element_name}\n  INSTRUCTION: ${content}\n`;
            } else if (content.includes("アップロード") || content.includes("画像") || content.includes("写真")) {
                content = "ACTION: USE PROVIDED ADDITIONAL MATERIAL IMAGE.";
                finalPrompt += `- Element: ${r.element_name}\n  Original: ${r.original_content}\n  REPLACE WITH: ${content}\n`;
            } else {
                // NEW: Type-based instruction for Refinement too
                if (r.type === 'visual' || r.type === 'style' || r.type === 'color') {
                    finalPrompt += `- Element: ${r.element_name} (Type: ${r.type})\n  Original: ${r.original_content}\n  INSTRUCTION: [COMPLETELY REPLACE] Delete the original element. Insert "${content}" instead. Do NOT blend with original. This is a full substitution.\n`;
                } else if (r.type === 'text') {
                    finalPrompt += `- Element: ${r.element_name} (Type: Text)\n  Original: ${r.original_content}\n  INSTRUCTION: REPLACE TEXT CONTENT. New Text: "${content}"\n`;
                } else {
                    finalPrompt += `- Element: ${r.element_name}\n  Original: ${r.original_content}\n  REPLACE WITH: ${content}\n`;
                }
            }
        });

        if (customInstruction) {
            finalPrompt += `\n[ADDITIONAL INSTRUCTIONS]\n${customInstruction}`;
        }

        finalPrompt += `\n\n[HISTORY]\n` + newHistory.map((r, i) => `${i + 1}. ${r}`).join('\n');

        startTransition(async () => {
            const result = await generateNoteThumbnails(
                analysisResult,
                "（指定なし）",
                "business",
                1,
                finalPrompt,
                platform,
                imageSource || undefined,
                generatedImages[0]?.image || undefined, // Refinement uses previous image
                additionalImages
            );

            if (result.success && result.images) {
                setGeneratedImages(result.images);
                toast({ title: "修正完了", description: "画像が更新されました" });
            } else {
                // @ts-ignore
                toast({ title: "修正失敗", description: result.error || "生成エラー", variant: "destructive" });
            }
        });
    };

    // Update Replacement Content
    const updateReplacement = (id: number, newVal: string) => {
        if (!promptData) return;
        setPromptData({
            ...promptData,
            replacements: promptData.replacements.map(r => r.id === id ? { ...r, new_content: newVal } : r)
        });
    };

    // Handler for sparkle button - generates AI-arranged content
    const handleArrangeContent = async (id: number, elementName: string, originalContent: string) => {
        if (!promptData) return;

        // Mark as loading
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
                toast({
                    title: "アレンジ完了",
                    description: `「${elementName}」を魅力的にアレンジしました`,
                });
            } else {
                toast({
                    title: "エラー",
                    description: result.error || "アレンジに失敗しました",
                    variant: "destructive",
                });
            }
        } catch (e) {
            toast({
                title: "エラー",
                description: "予期しないエラーが発生しました",
                variant: "destructive",
            });
        } finally {
            setArrangingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* STEP 1: Settings & Analysis */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: 参考画像を選択</CardTitle>
                        <CardDescription>デザインの元となる参考画像を設定してください。AIがその構成要素を分析します。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Platform Selection */}
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

                        <div className="space-y-2">
                            <Label>参考画像（デザインの元ネタ） <span className="text-red-500">*</span></Label>

                            {/* Upload Area (Keep same) */}
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
                                    <p className="text-xs text-muted-foreground">URLを入力するか、手持ちの参考画像をアップロードしてください。</p>
                                </div>
                            </div>

                            {/* Preview Uploaded (Keep same) */}
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

                        <Button className="w-full" onClick={handleAnalyze} disabled={isPending || (!referenceUrl && !uploadedImage)}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                            画像を分析して構成マップを作成
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: Replacement Map & Additional Materials */}
            {step === 2 && promptData && (
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 要素の置換設定 (v2.3)</CardTitle>
                        <CardDescription>参考画像のどの要素を変更するか指定してください。タイトルなどはここで入力します。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Reference Image Preview (Small) */}
                        <div className="flex gap-4 items-center bg-muted/30 p-3 rounded-lg">
                            <img src={uploadedImage || referenceUrl} className="h-16 w-auto rounded border" />
                            <div className="text-sm text-muted-foreground">
                                <p>ベースデザイン: {platform}</p>
                                <p>この画像のスタイルを維持しながら、以下の要素を変更します。</p>
                            </div>
                        </div>

                        {/* Replacement Map (TABLE UI) */}
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
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${row.type === 'text' ? 'bg-blue-100 text-blue-700' :
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
                                                    title="AIでいい感じにアレンジ"
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

                        {/* Additional Images Upload Section */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="font-bold flex items-center gap-2">
                                <Upload className="w-4 h-4" /> 追加素材（自分のアイコン・写真）
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                顔写真やロゴなど、デザインに組み込みたい素材がある場合はここでアップロードしてください。<br />
                                <span className="text-red-500 font-bold">※アップロードした画像は必ず生成に使用されます。</span>
                            </p>

                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => document.getElementById('additional-image-input')?.click()}>
                                    <Upload className="w-4 h-4 mr-2" /> 素材を追加
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {additionalImages.map((img, idx) => (
                                        <div key={idx} className="flex gap-3 border rounded p-2 items-start">
                                            <div className="w-20 h-20 shrink-0 bg-muted rounded overflow-hidden">
                                                <img src={img.image} alt={`追加画像${idx + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-xs">この素材の使い方</Label>
                                                <Input
                                                    value={img.description}
                                                    onChange={(e) => setAdditionalImages(prev => prev.map((item, i) => i === idx ? { ...item, description: e.target.value } : item))}
                                                    placeholder="例：中央の人物の顔として使用、右上のロゴとして配置..."
                                                    className="text-xs"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive h-6 px-2"
                                                    onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                    <X className="w-3 h-3 mr-1" /> 削除
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Free Text Instruction (Optional) */}
                        <div className="space-y-2 pt-4 border-t">
                            <Label>その他の指示（任意）</Label>
                            <Textarea
                                value={customInstruction}
                                onChange={(e) => setCustomInstruction(e.target.value)}
                                placeholder="例：全体的にもう少し明るくして、文字を大きく目立たせて"
                                className="h-20"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button variant="ghost" onClick={() => {
                                setStep(1);
                                setPromptData(null);
                            }}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 画像を選び直す
                            </Button>
                            <Button className="flex-1" onClick={handleGenerate} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                画像を生成する（1枚）
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: Result (Keep mostly same but ensure correct regenerate logic) */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>生成結果</CardTitle>
                        <CardDescription>画像を確認し、必要に応じて修正できます。</CardDescription>
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
                                    {/* Loading Overlay during refinement */}
                                    {isPending && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-12 h-12 animate-spin text-white" />
                                                <p className="text-white font-medium">修正を反映中...</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="lg"
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = generatedImages[0].image;
                                            a.download = `note-thumb-${Date.now()}.png`;
                                            a.click();
                                        }}
                                    >
                                        <Download className="w-5 h-5 mr-2" />
                                        保存
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Refinement Area */}
                        <div className="border-t pt-6 space-y-4">
                            <p className="text-sm font-medium">🔄 修正したい場合は下に指示を入力してください</p>

                            {/* History Display */}
                            {refinementHistory.length > 0 && (
                                <div className="bg-muted p-3 rounded text-xs space-y-1">
                                    <p className="font-bold">📝 過去の修正:</p>
                                    {refinementHistory.map((r, i) => (
                                        <p key={i} className="text-muted-foreground">• {r}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Input
                                    id="refinement-input"
                                    placeholder="例: 文字の色を赤にして"
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
                                        const inputEl = document.getElementById('refinement-input') as HTMLInputElement;
                                        handleRefinement(inputEl?.value || '');
                                        if (inputEl) inputEl.value = '';
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
            )
            }
        </div >
    );
}
