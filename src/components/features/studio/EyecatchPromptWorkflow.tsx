"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2, Copy, ArrowLeft, ArrowRight, Check, Image as ImageIcon,
    FileText, Palette, Sparkles, ClipboardPaste
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveCreation } from "@/app/actions/history";
import {
    EyecatchPromptState,
    ExtractedEyecatch,
    GeneratedPrompt,
    ImageStyle,
    AspectRatio,
    IMAGE_STYLE_OPTIONS,
    ASPECT_RATIO_OPTIONS,
    initialEyecatchPromptState,
    StyleOption,
} from "@/types/eyecatch-prompt-types";

const STEPS = [
    { num: 1, label: "HTML入力", icon: ClipboardPaste },
    { num: 2, label: "スタイル選択", icon: Palette },
    { num: 3, label: "プロンプト生成", icon: Sparkles },
];

interface EyecatchPromptWorkflowProps {
    onError?: (message: string) => void;
}

export function EyecatchPromptWorkflow({ onError }: EyecatchPromptWorkflowProps) {
    const [state, setState] = useState<EyecatchPromptState>(initialEyecatchPromptState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const { toast } = useToast();

    const updateState = (updates: Partial<EyecatchPromptState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const setErrorMessage = (msg: string) => {
        setError(msg);
        onError?.(msg);
    };

    // Step 1: Extract eyecatches from HTML and optionally analyze media
    const handleExtract = async () => {
        if (!state.htmlInput.trim()) {
            setErrorMessage("HTMLを入力してください");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/eyecatch-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "extract",
                    html: state.htmlInput,
                    mediaUrl: state.mediaUrl, // Include media URL for analysis
                }),
            });

            const data = await response.json();

            if (data.success) {
                const extracted = data.data as ExtractedEyecatch[];
                updateState({
                    step: 2,
                    extractedEyecatches: extracted,
                    analyzedMedia: data.analyzedMedia, // Store analysis result with styleOptions
                });
                // Select all by default
                setSelectedIndices(extracted.map(e => e.index));

                // Auto-select first style option if available
                if (data.analyzedMedia?.styleOptions?.length > 0) {
                    updateState({ selectedStyleDescription: data.analyzedMedia.styleOptions[0].description });
                }
            } else {
                setErrorMessage(data.error || "抽出に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "抽出に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Generate prompts
    const handleGenerate = async () => {
        const selectedEyecatches = state.extractedEyecatches.filter(e => selectedIndices.includes(e.index));

        if (selectedEyecatches.length === 0) {
            setErrorMessage("少なくとも1つの画像説明を選択してください");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/eyecatch-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    eyecatches: selectedEyecatches,
                    style: state.selectedStyle,
                    aspectRatio: state.selectedAspectRatio,
                    mediaUrl: state.mediaUrl,
                    selectedStyleDescription: state.selectedStyleDescription, // Send selected style from analysis
                }),
            });

            const data = await response.json();

            if (data.success) {
                const prompts = data.data as GeneratedPrompt[];
                updateState({
                    step: 3,
                    generatedPrompts: prompts,
                });

                // Save to history
                try {
                    await saveCreation(
                        `アイキャッチプロンプト (${prompts.length}件)`,
                        'eyecatch_prompt',
                        { prompts, style: state.selectedStyleDescription || state.selectedStyle }
                    );
                } catch (err) {
                    console.error("Failed to save history:", err);
                }
            } else {
                setErrorMessage(data.error || "生成に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPrompt = async (prompt: string) => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(prompt);
                toast({
                    title: "コピーしました",
                    description: "プロンプトをクリップボードにコピーしました",
                });
            } else {
                throw new Error("Clipboard API not available");
            }
        } catch (err) {
            console.error("Copy failed:", err);
            toast({
                variant: "destructive",
                title: "コピーに失敗しました",
                description: "手動で選択してコピーしてください。",
            });
        }
    };

    const handleCopyAll = async () => {
        const allPrompts = state.generatedPrompts
            .map((p, i) => `--- プロンプト ${i + 1} ---\n${p.detailedPrompt}`)
            .join("\n\n");

        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(allPrompts);
                toast({
                    title: "すべてコピーしました",
                    description: `${state.generatedPrompts.length}件のプロンプトをコピーしました`,
                });
            } else {
                throw new Error("Clipboard API not available");
            }
        } catch (err) {
            console.error("Copy failed:", err);
            toast({
                variant: "destructive",
                title: "コピーに失敗しました",
                description: "セキュリティ制限によりコピーできませんでした。手動で選択してコピーしてください。",
            });
        }
    };

    const handleReset = () => {
        setState(initialEyecatchPromptState);
        setSelectedIndices([]);
        setError(null);
    };

    const toggleSelection = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const progress = (state.step / 3) * 100;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">アイキャッチプロンプト作成</h1>
                    <p className="text-muted-foreground text-sm">SEO記事のHTMLから画像生成AIプロンプトを作成</p>
                </div>
                {state.step > 1 && (
                    <Button variant="outline" size="sm" onClick={handleReset} className="w-full md:w-auto">
                        やり直す
                    </Button>
                )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    {STEPS.map((s) => (
                        <div
                            key={s.num}
                            className={`flex flex-col items-center gap-1 ${state.step >= s.num ? "text-primary" : "text-muted-foreground"}`}
                        >
                            <s.icon className="h-4 w-4" />
                            <span className="hidden md:inline">{s.label}</span>
                        </div>
                    ))}
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                    {error}
                </div>
            )}

            {/* Step 1: HTML Input */}
            {state.step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardPaste className="h-5 w-5" />
                            Step 1: HTMLを貼り付け
                        </CardTitle>
                        <CardDescription>
                            SEOツールで生成した記事HTMLを貼り付けてください。[EYECATCH: ...]形式の画像説明を自動で抽出します。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>記事HTML</Label>
                            <Textarea
                                value={state.htmlInput}
                                onChange={(e) => updateState({ htmlInput: e.target.value })}
                                placeholder="SEOツールで生成したHTMLをここに貼り付けてください..."
                                rows={8}
                                className="font-mono text-base md:text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>参考メディアURL（任意）</Label>
                            <Input
                                value={state.mediaUrl || ''}
                                onChange={(e) => updateState({ mediaUrl: e.target.value })}
                                placeholder="https://example.com/article/..."
                            />
                            <p className="text-xs text-muted-foreground">
                                指定したURLの記事からスタイルを分析し、3パターンのスタイル案を生成します。
                            </p>
                        </div>

                        <Button
                            onClick={handleExtract}
                            disabled={loading || !state.htmlInput.trim()}
                            className="w-full md:w-auto"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <ImageIcon className="mr-2 h-4 w-4" />
                            {state.mediaUrl ? "抽出＆スタイル分析" : "画像説明を抽出"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Style Selection & Eyecatch Confirmation */}
            {state.step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Step 2: スタイル選択と確認
                        </CardTitle>
                        <CardDescription>
                            {state.extractedEyecatches.length}件の画像説明が見つかりました。スタイルを選択してプロンプトを生成します。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Analyzed Style Options (from media analysis) */}
                        {state.analyzedMedia?.styleOptions && state.analyzedMedia.styleOptions.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex flex-col md:flex-row gap-3 mb-2">
                                    {state.analyzedMedia.imageUrl && (
                                        <img
                                            src={state.analyzedMedia.imageUrl}
                                            alt="Reference"
                                            className="h-20 w-auto object-cover rounded-md border"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    )}
                                    <div>
                                        <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                                            <Sparkles className="h-3 w-3" />
                                            参照メディアから抽出されたスタイル
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {state.analyzedMedia.styleDescription}
                                        </p>
                                    </div>
                                </div>
                                <Label>スタイルを選択</Label>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {state.analyzedMedia.styleOptions.map((opt) => (
                                        <div
                                            key={opt.id}
                                            className={`p-4 border rounded-lg cursor-pointer transition-all ${state.selectedStyleDescription === opt.description
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'hover:border-primary/50 hover:bg-muted/50'
                                                }`}
                                            onClick={() => updateState({ selectedStyleDescription: opt.description })}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${state.selectedStyleDescription === opt.description
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground'
                                                    }`}>
                                                    {state.selectedStyleDescription === opt.description && (
                                                        <Check className="h-3 w-3 text-primary-foreground" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-sm">{opt.label}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-3">{opt.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Manual Style Selection (fallback or override) */}
                        <div className="space-y-2">
                            <Label>{state.analyzedMedia?.styleOptions?.length ? "または手動でスタイルを選択" : "画像スタイル"}</Label>
                            <Select
                                value={state.selectedStyle}
                                onValueChange={(v) => {
                                    updateState({ selectedStyle: v as ImageStyle, selectedStyleDescription: undefined });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {IMAGE_STYLE_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex flex-col">
                                                <span>{opt.label}</span>
                                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Aspect Ratio Selection */}
                        <div className="space-y-2">
                            <Label>アスペクト比</Label>
                            <Select
                                value={state.selectedAspectRatio}
                                onValueChange={(v) => updateState({ selectedAspectRatio: v as AspectRatio })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASPECT_RATIO_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex flex-col">
                                                <span>{opt.label}</span>
                                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Extracted Eyecatches */}
                        <div className="space-y-2">
                            <Label>抽出された画像説明（{selectedIndices.length}/{state.extractedEyecatches.length}件選択中）</Label>
                            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                                {state.extractedEyecatches.map((eyecatch) => (
                                    <div
                                        key={eyecatch.index}
                                        className={`p-4 hover:bg-muted/50 cursor-pointer ${selectedIndices.includes(eyecatch.index) ? 'bg-primary/5' : ''}`}
                                        onClick={() => toggleSelection(eyecatch.index)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={selectedIndices.includes(eyecatch.index)}
                                                onCheckedChange={() => toggleSelection(eyecatch.index)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">#{eyecatch.index + 1}</Badge>
                                                    {eyecatch.sectionTitle && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {eyecatch.sectionTitle}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium">{eyecatch.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => updateState({ step: 1 })}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                戻る
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={loading || selectedIndices.length === 0}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Sparkles className="mr-2 h-4 w-4" />
                                プロンプトを生成（{selectedIndices.length}件）
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Generated Prompts */}
            {state.step === 3 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-green-500" />
                                    Step 3: プロンプト完成！
                                </CardTitle>
                                <CardDescription>
                                    {state.generatedPrompts.length}件の画像生成AIプロンプトを作成しました
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleCopyAll}>
                                <Copy className="h-4 w-4 mr-1" />
                                すべてコピー
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Reference Image Analysis Result */}
                        {state.analyzedMedia && (
                            <div className="bg-muted/50 border rounded-lg p-4 flex flex-col md:flex-row gap-4">
                                <div className="shrink-0">
                                    <img
                                        src={state.analyzedMedia.imageUrl}
                                        alt="Reference"
                                        className="h-24 w-auto object-cover rounded-md border"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" />
                                        参照メディアのスタイル分析
                                    </Label>
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                        {state.analyzedMedia.styleDescription}
                                    </p>
                                </div>
                            </div>
                        )}

                        {state.generatedPrompts.map((prompt, idx) => (
                            <div key={prompt.index} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge>#{idx + 1}</Badge>
                                        <Badge variant="secondary">
                                            {IMAGE_STYLE_OPTIONS.find(s => s.value === prompt.style)?.label}
                                        </Badge>
                                        <Badge variant="outline">
                                            {prompt.aspectRatio || '16:9'}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyPrompt(prompt.detailedPrompt)}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        コピー
                                    </Button>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">元の説明</Label>
                                    <p className="text-sm text-muted-foreground">{prompt.originalDescription}</p>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">生成されたプロンプト</Label>
                                    <div className="bg-muted p-3 rounded-md">
                                        <p className="text-sm font-mono whitespace-pre-wrap">{prompt.detailedPrompt}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => updateState({ step: 2 })}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                スタイル選択に戻る
                            </Button>
                            <Button variant="outline" onClick={handleReset}>
                                新しいHTMLで作成
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
