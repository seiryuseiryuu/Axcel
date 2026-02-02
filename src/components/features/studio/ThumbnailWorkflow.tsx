"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChannelSelector } from "@/components/features/studio/ChannelSelector";
import { ChannelInput, ChannelThumbnail } from "@/types/thumbnail";
import { analyzePatterns, generateModelImages, generateFinalThumbnails, generateThumbnailPrompt, PatternCategory, ModelImageInfo, PatternAnalysisResult } from "@/app/actions/thumbnail";
import {
    ArrowRight, ArrowLeft, Check, Loader2, Sparkles, RefreshCw,
    Download, Type, Camera, Eye, Wand2, Youtube, Code, ChevronDown, ChevronUp, Package,
    Upload, Image as ImageIcon, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveCreation } from "@/app/actions/history";
import { uploadImage } from "@/app/actions/storage";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

interface ThumbnailWorkflowProps {
    onPromptGenerated: (prompt: string) => void;
    onError: (msg: string) => void;
}

interface WorkflowState {
    step: number;
    videoTitle: string;
    videoDescription: string;
    selectedThumbnails: ChannelThumbnail[];
    patternAnalysis: PatternAnalysisResult | null;
    modelImages: ModelImageInfo[];
    selectedModelIndex: number | null;
    text: string;
    generatedImages: string[];
    logs: string[];
    generatedPrompt: string; // New state for prompt
    isPromptEditing: boolean; // New state for visibility
}

const STEPS = [
    { num: 1, title: "タイトル入力", icon: Type },
    { num: 2, title: "チャンネル選択", icon: Youtube },
    { num: 3, title: "パターン分析", icon: Eye },
    { num: 4, title: "モデル選択", icon: Sparkles },
    { num: 5, title: "素材・文言", icon: Camera },
    { num: 6, title: "AI生成", icon: Wand2 },
];

export function ThumbnailWorkflow({ onPromptGenerated, onError }: ThumbnailWorkflowProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Workflow State
    const [workflow, setWorkflow] = useState<WorkflowState>({
        step: 1,
        videoTitle: "",
        videoDescription: "",
        selectedThumbnails: [],
        patternAnalysis: null,
        modelImages: [],
        selectedModelIndex: null,
        text: "",
        generatedImages: [],
        logs: [],
        generatedPrompt: "",
        isPromptEditing: false,
    });

    // Channel State
    const [ownChannel, setOwnChannel] = useState<ChannelInput>({
        id: 'own', url: '', name: '', type: 'own', thumbnails: [], isLoading: false
    });
    const [competitors, setCompetitors] = useState<ChannelInput[]>([
        { id: 'comp-1', url: '', name: '', type: 'competitor', thumbnails: [], isLoading: false }
    ]);
    const [uploadedImages, setUploadedImages] = useState<ChannelThumbnail[]>([]);

    // Actions
    const goToStep = (step: number) => setWorkflow(prev => ({ ...prev, step }));

    const handleThumbnailSelect = (thumb: ChannelThumbnail) => {
        setWorkflow(prev => {
            const exists = prev.selectedThumbnails.find(t => t.id === thumb.id);
            if (exists) return { ...prev, selectedThumbnails: prev.selectedThumbnails.filter(t => t.id !== thumb.id) };
            if (prev.selectedThumbnails.length >= 10) return prev;
            return { ...prev, selectedThumbnails: [...prev.selectedThumbnails, thumb] };
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const newImage: ChannelThumbnail = {
                    id: `upload-${Date.now()}`,
                    video_id: `upload-${Date.now()}`,
                    thumbnail_url: event.target.result as string,
                    video_title: file.name,
                };
                setUploadedImages(prev => [...prev, newImage]);
                // Automatically select uploaded image
                handleThumbnailSelect(newImage);
            }
        };
        reader.readAsDataURL(file);
    };

    const runAnalysis = () => {
        if (workflow.selectedThumbnails.length < 3) {
            toast({ title: "エラー", description: "少なくとも3枚選択してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            setWorkflow(prev => ({ ...prev, logs: ["開始: 分析プロセスを起動中..."] }));
            const urls = workflow.selectedThumbnails.map(t => t.thumbnail_url);
            const titles = workflow.selectedThumbnails.map(t => t.video_title);

            const res = await analyzePatterns(urls, titles);

            if (res.logs) setWorkflow(prev => ({ ...prev, logs: [...prev.logs, ...res.logs!] }));

            if (res.error) {
                onError(res.error);
                toast({ title: "分析失敗", description: res.error, variant: "destructive" });
            } else if (res.data) {
                setWorkflow(prev => ({ ...prev, patternAnalysis: res.data!, step: 4 }));

                // Auto-generate model images with reference thumbnails
                const modelRes = await generateModelImages(
                    res.data.patterns,
                    workflow.videoTitle,
                    workflow.videoDescription,
                    urls, // Pass all selected thumbnail URLs for reference
                    workflow.text // Pass input text for model generation
                );

                if (modelRes.logs) setWorkflow(prev => ({ ...prev, logs: [...prev.logs, ...modelRes.logs!] }));

                if (modelRes.error) {
                    toast({ title: "画像生成警告", description: "一部のモデル画像生成に失敗しました: " + modelRes.error, variant: "destructive" });
                } else if (modelRes.data) {
                    setWorkflow(prev => ({ ...prev, modelImages: modelRes.data! }));
                }

                toast({ title: "分析完了", description: `${res.data.patterns.length}パターンを検出` });
            }
        });
    };

    const selectModel = (index: number) => {
        setWorkflow(prev => ({ ...prev, selectedModelIndex: index }));
    };

    // Phase 1: Generate Prompt Only
    const generatePrompt = () => {
        if (!workflow.text.trim()) {
            toast({ title: "エラー", description: "サムネイルに表示する文言（テロップ）を入力してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const selectedModel = workflow.selectedModelIndex !== null
                ? workflow.modelImages[workflow.selectedModelIndex]
                : null;

            const patternData = workflow.selectedModelIndex !== null && workflow.patternAnalysis
                ? workflow.patternAnalysis.patterns[workflow.selectedModelIndex]
                : undefined;

            const res = await generateThumbnailPrompt(
                workflow.text,
                patternData?.characteristics?.textStyle,
                patternData?.characteristics?.colorScheme,
                patternData?.characteristics?.subjectType
            );

            if (res.error) {
                onError(res.error);
                toast({ title: "エラー", description: res.error, variant: "destructive" });
            } else if (res.data) {
                setWorkflow(prev => ({
                    ...prev,
                    generatedPrompt: res.data!,
                    isPromptEditing: true
                }));
                onPromptGenerated(res.data!); // Notify parent if needed
                toast({ title: "プロンプト生成完了", description: "内容を確認・編集してください" });
            }
        });
    };

    // Phase 2: Generate Final Image using the (possibly edited) prompt
    const generateFinalImage = () => {
        startTransition(async () => {
            const selectedModel = workflow.selectedModelIndex !== null
                ? workflow.modelImages[workflow.selectedModelIndex]
                : null;

            // Get pattern data for details
            const patternData = workflow.selectedModelIndex !== null && workflow.patternAnalysis
                ? workflow.patternAnalysis.patterns[workflow.selectedModelIndex]
                : undefined;

            // Get reference URLs from selected pattern's example images
            const exampleIndices = patternData?.exampleImageIndices || [];
            const referenceUrls = exampleIndices
                .map(idx => workflow.selectedThumbnails[idx - 1]?.thumbnail_url)
                .filter(Boolean)
                .slice(0, 2);

            // Determine if we should preserve the model person (Edit Mode)
            // If we have a selected model and NO user uploaded materials, we assume we want to keep the model exactly as is.
            const shouldPreservePerson = selectedModel !== null && uploadedImages.length === 0;

            const res = await generateFinalThumbnails(
                selectedModel,
                workflow.text,
                workflow.videoTitle,
                1, // Only 1 image requested
                patternData,
                referenceUrls,
                workflow.generatedPrompt, // Use custom prompt
                shouldPreservePerson
            );

            if (res.error) {
                onError(res.error);
                toast({ title: "生成エラー", description: res.error, variant: "destructive" });
            } else if (res.data) {
                setWorkflow(prev => ({ ...prev, generatedImages: res.data!, step: 6, isPromptEditing: false }));

                // Save to History - Upload images first then save URLs
                try {
                    const uploadedArtifacts = [];
                    for (const base64Image of res.data!) {
                        // Upload to 'thumbnails' bucket, folder 'history'
                        const uploadRes = await uploadImage(base64Image, 'thumbnails', 'history');
                        if (uploadRes.success && uploadRes.url) {
                            uploadedArtifacts.push({ image: uploadRes.url });
                        } else {
                            console.warn("History upload failed:", uploadRes.error);
                            // Fallback: If upload fails, we probably shouldn't save the huge base64
                            // or maybe save it but it might fail. Let's skip for now or try.
                        }
                    }

                    if (uploadedArtifacts.length > 0) {
                        const saveResult = await saveCreation(
                            `サムネイル: ${workflow.videoTitle}`,
                            'thumbnail',
                            uploadedArtifacts
                        );
                        if (!saveResult.success) {
                            console.error("History save failed:", saveResult.error);
                        }
                    } else {
                        console.warn("No images uploaded successfully for history.");
                        toast({ title: "保存警告", description: "画像のアップロードに失敗したため、履歴には保存されませんでした。", variant: "destructive" });
                    }
                } catch (e) {
                    console.error("History save exception:", e);
                }

                toast({ title: "生成完了", description: "サムネイルが完成しました" });
            }
        });
    };

    const reset = () => {
        setWorkflow({
            step: 1,
            videoTitle: "",
            videoDescription: "",
            selectedThumbnails: [],
            patternAnalysis: null,
            modelImages: [],
            selectedModelIndex: null,
            text: "",
            generatedImages: [],
            logs: [],
            generatedPrompt: "",
            isPromptEditing: false,
        });
        setOwnChannel({ id: 'own', url: '', name: '', type: 'own', thumbnails: [], isLoading: false });
        setCompetitors([{ id: 'comp-1', url: '', name: '', type: 'competitor', thumbnails: [], isLoading: false }]);
        setUploadedImages([]);
    };

    const selectedModel = workflow.selectedModelIndex !== null
        ? workflow.modelImages[workflow.selectedModelIndex]
        : null;

    return (
        <div className="space-y-6">
            {/* Logic Logs Section */}
            {workflow.logs.length > 0 && (
                <Card className="mb-4 bg-muted/50">
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setIsLogsOpen(!isLogsOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <Code className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">AI思考ロジック・生成ログ</span>
                            <Badge variant="outline" className="text-xs">{workflow.logs.length}件</Badge>
                        </div>
                        {isLogsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {isLogsOpen && (
                        <CardContent className="pt-0 pb-4 px-4">
                            <div className="bg-black/90 rounded-md p-4 font-mono text-xs text-green-400 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                                {workflow.logs.map((log, i) => (
                                    <div key={i} className="mb-1 border-b border-green-900/30 pb-1 last:border-0">
                                        <span className="opacity-50 select-none mr-2">[{i + 1}]</span>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Progress Bar */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4 overflow-x-auto">
                {STEPS.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <button
                            onClick={() => goToStep(s.num)}
                            disabled={s.num > workflow.step && !workflow.generatedImages.length}
                            className={`flex flex-col items-center gap-1 transition-all ${workflow.step === s.num
                                ? "text-primary"
                                : workflow.step > s.num
                                    ? "text-green-500"
                                    : "text-muted-foreground"
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${workflow.step === s.num
                                ? "border-primary bg-primary text-white"
                                : workflow.step > s.num
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-muted-foreground"
                                }`}>
                                {workflow.step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap">{s.title}</span>
                        </button>
                        {i < STEPS.length - 1 && (
                            <div className={`w-8 h-0.5 mx-1 ${workflow.step > s.num ? "bg-green-500" : "bg-muted"}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Video Title & Text */}
            {workflow.step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Type className="w-5 h-5" />
                            Step 1: 動画タイトル・サムネイル文言を入力
                        </CardTitle>
                        <CardDescription>サムネイルを作成したい動画の情報と、サムネイルに入れたい文言を入力してください</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">動画タイトル <span className="text-red-500">*</span></label>
                            <Input
                                value={workflow.videoTitle}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, videoTitle: e.target.value }))}
                                placeholder="例：【衝撃】〇〇を試したら驚きの結果に..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">サムネイル文言（テロップ） <span className="text-red-500">*</span></label>
                            <Textarea
                                value={workflow.text}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, text: e.target.value }))}
                                placeholder="例：衝撃、必見、〇〇の結果...（画像生成時に使用されます）"
                                className="min-h-[80px] resize-none"
                            />
                            <p className="text-xs text-muted-foreground">※ここで入力した文言がStep 3のモデル画像生成時に反映されます</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">動画の概要（任意）</label>
                            <Textarea
                                value={workflow.videoDescription}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, videoDescription: e.target.value }))}
                                placeholder="動画の内容を簡単に説明..."
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => goToStep(2)}
                                disabled={!workflow.videoTitle.trim() || !workflow.text.trim()}
                            >
                                次へ <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Channel Selection */}
            {workflow.step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Youtube className="w-5 h-5" />
                            Step 2: チャンネル選択 & サムネイル選択
                        </CardTitle>
                        <CardDescription>参考にしたいチャンネルのサムネイルを3枚以上選択してください</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ChannelSelector
                            channels={[ownChannel, ...competitors]}
                            onAddChannel={() => setCompetitors(p => [...p, {
                                id: `comp-${p.length + 1}`, url: '', name: '', type: 'competitor', thumbnails: [], isLoading: false
                            }])}
                            onRemoveChannel={(id) => setCompetitors(p => p.filter(c => c.id !== id))}
                            onUpdateChannel={(id, data) => {
                                if (id === 'own') setOwnChannel(p => ({ ...p, ...data }));
                                else setCompetitors(p => p.map(c => c.id === id ? { ...c, ...data } : c));
                            }}
                            onSelectThumbnail={handleThumbnailSelect}
                            selectedThumbnails={workflow.selectedThumbnails}
                        />

                        {/* Image Upload Section Removed from here */}

                        <div className="pt-6 border-t flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                選択中: <Badge variant="secondary" className="ml-2 font-bold">{workflow.selectedThumbnails.length}枚</Badge>
                            </p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => goToStep(1)}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                                </Button>
                                <Button
                                    onClick={runAnalysis}
                                    disabled={isPending || workflow.selectedThumbnails.length < 3}
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                    パターン分析
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Analysis (Skipped in code view but logic handles it) */}

            {/* Step 4: Model Selection */}
            {workflow.step === 4 && workflow.patternAnalysis && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Step 4: モデル画像を選択
                        </CardTitle>
                        <CardDescription className="text-base">
                            {workflow.patternAnalysis.summary}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isPending && workflow.modelImages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground font-medium">AIが最適な構図を生成中...</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {workflow.modelImages.map((model, i) => (
                                <Card
                                    key={i}
                                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 overflow-hidden ${workflow.selectedModelIndex === i
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-transparent hover:border-border/80 bg-muted/40'
                                        }`}
                                    onClick={() => selectModel(i)}
                                >
                                    <div className="relative aspect-video bg-muted/30">
                                        <img
                                            src={model.imageUrl}
                                            alt={model.patternName}
                                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="secondary" className="backdrop-blur-md bg-white/80 dark:bg-black/50 shadow-sm border-0">
                                                {model.patternName}
                                            </Badge>
                                        </div>
                                        {workflow.selectedModelIndex === i && (
                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg animate-in zoom-in">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                            {model.description}
                                        </p>

                                        {/* Suggested Texts */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {model.suggestedTexts.slice(0, 3).map((s, j) => (
                                                <Badge
                                                    key={j}
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-muted transition-colors py-0.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setWorkflow(prev => ({ ...prev, text: s.text }));
                                                    }}
                                                >
                                                    {s.text}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="pt-6 border-t flex items-center justify-between">
                            <Button variant="ghost" onClick={() => goToStep(2)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                            </Button>
                            <Button
                                onClick={() => goToStep(5)}
                                disabled={workflow.selectedModelIndex === null}
                            >
                                次へ <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Text & Materials */}
            {workflow.step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Step 5: テキスト・素材を指定
                        </CardTitle>
                        <CardDescription>生成のための最終調整を行います。「プロンプト生成」でAIへの指示を作成します</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Selected Model Preview */}
                        {selectedModel && (
                            <div className="flex gap-4 p-4 bg-muted/30 rounded-xl border">
                                <div className="w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted">
                                    <img src={selectedModel.imageUrl} className="w-full h-full object-cover opacity-80" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground">選択パターン: {selectedModel.patternName}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{selectedModel.description}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground">サムネイル文言（テロップ）</label>
                            <Textarea
                                value={workflow.text}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, text: e.target.value }))}
                                placeholder="例：衝撃、必見、〇〇を試したら驚きの結果に... など自由に入力"
                                className="min-h-[120px] text-lg font-medium resize-y"
                            />
                        </div>

                        {/* Image Upload Section - Moved to Step 5 */}
                        <div className="border-t pt-4 mt-4">
                            <Label className="text-sm font-medium mb-2 block">自前の素材を追加（任意）</Label>
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    画像をアップロード
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                {uploadedImages.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {uploadedImages.map((img) => (
                                            <div key={img.id} className="relative w-16 h-9 rounded overflow-hidden border">
                                                <img src={img.thumbnail_url} className="w-full h-full object-cover" />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-0 right-0 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setUploadedImages(prev => prev.filter(imgItem => imgItem.id !== img.id));
                                                    }}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">※ここで追加した画像は、最終的な画像生成の参考素材として使用されます。</p>
                        </div>

                        {/* Prompt Editing Area */}
                        {workflow.isPromptEditing && (
                            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                                <Label className="text-base font-bold flex items-center gap-2 text-primary">
                                    <Sparkles className="w-4 h-4" />
                                    AIへの指示書（プロンプト）
                                </Label>
                                <div className="relative border-2 border-primary/20 rounded-xl overflow-hidden shadow-sm">
                                    <RefinementArea
                                        initialContent={workflow.generatedPrompt}
                                        contextData={{
                                            tool: "thumbnail",
                                            toolName: "サムネイル生成",
                                            title: workflow.videoTitle,
                                            description: workflow.videoDescription,
                                            pattern: selectedModel?.patternName
                                        }}
                                        onContentUpdate={(newContent) => setWorkflow(prev => ({ ...prev, generatedPrompt: newContent }))}
                                        contentType="text"
                                    />
                                    <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur rounded-lg p-2 text-xs text-muted-foreground border shadow-sm">
                                        ※ここを書き換えると生成結果が変わります
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t flex items-center justify-between">
                            <Button variant="ghost" onClick={() => goToStep(4)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                            </Button>

                            {!workflow.isPromptEditing ? (
                                <Button
                                    onClick={generatePrompt}
                                    disabled={isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Code className="w-4 h-4 mr-2" />}
                                    プロンプトを生成・編集する
                                </Button>
                            ) : (
                                <Button
                                    onClick={generateFinalImage}
                                    disabled={isPending}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-8"
                                    size="lg"
                                >
                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                                    画像を生成する（1枚）
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 6: Results */}
            {workflow.step === 6 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5" />
                                生成結果
                            </CardTitle>
                            <CardDescription>完成したサムネイルを確認してください</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={reset}>
                            <RefreshCw className="w-4 h-4 mr-2" /> 新規作成
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {/* Single Large Image Display */}
                        {workflow.generatedImages.length > 0 && (
                            <div className="flex flex-col items-center space-y-6">
                                <div className="relative group rounded-xl overflow-hidden shadow-2xl ring-1 ring-border/50 max-w-4xl w-full">
                                    <div className="aspect-video bg-muted">
                                        <img
                                            src={workflow.generatedImages[0]}
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
                                        a.href = workflow.generatedImages[0];
                                        a.download = `thumbnail-${Date.now()}.png`;
                                        a.click();
                                        toast({ title: "ダウンロード開始", description: "間もなく保存されます" });
                                    }}
                                >
                                    <Download className="w-5 h-5 mr-2" />
                                    画像を保存する
                                </Button>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-border/40">
                            <div className="flex items-center justify-center p-6 bg-muted/20 rounded-xl border border-dashed border-border">
                                <div className="text-center space-y-2">
                                    <h3 className="font-semibold text-foreground">修正が必要ですか？</h3>
                                    <p className="text-sm text-muted-foreground">
                                        プロンプトやテキストを調整して、もう一度生成できます
                                    </p>
                                    <Button variant="outline" onClick={() => goToStep(5)} className="mt-2">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> プロンプトを調整して再生成
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
