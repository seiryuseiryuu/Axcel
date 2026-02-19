"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Link, ListChecks, Users, MessageSquare, FileEdit, FileText, Check, Send, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, Wand2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { RefinementArea } from "./RefinementArea";
import * as LpWritingActions from "@/app/actions/lpWriting";

const STEPS = [
    { num: 1, title: "情報入力", icon: Link },
    { num: 2, title: "構成・訴求分析", icon: ListChecks },
    { num: 3, title: "感情分析", icon: Users },
    { num: 4, title: "ヒアリング", icon: MessageSquare },
    { num: 5, title: "詳細定義", icon: FileEdit },
    { num: 6, title: "執筆", icon: FileText },
];

type OutlineSection = {
    id: string;
    section: string;
    title: string;
    content: string;
    emotion: string;
};

export function LPWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Data State
    // Data State
    const [referenceUrl, setReferenceUrl] = useState("");

    // Analysis Results
    const [structureAnalysis, setStructureAnalysis] = useState("");
    const [customerAnalysis, setCustomerAnalysis] = useState("");

    // Step 4: Hearing & Profile
    const [hearingResult, setHearingResult] = useState(""); // Raw hearing conversation text
    const [productProfile, setProductProfile] = useState(""); // User-editable profile
    const [isProfileEditing, setIsProfileEditing] = useState(false);

    // Step 5: Outline Editor State
    const [outline, setOutline] = useState<OutlineSection[]>([]);

    // Final Result
    const [finalCopy, setFinalCopy] = useState("");

    // Hearing State
    const [hearingHistory, setHearingHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [hearingStatus, setHearingStatus] = useState<'idle' | 'asking' | 'completed'>('idle');
    const MAX_QUESTIONS = 5;
    const questionCount = hearingHistory.filter(h => h.role === 'user').length;

    // --- Actions ---

    // STEP 1 -> 2: Analyze Structure
    const handleAnalyzeStructure = () => {
        if (!referenceUrl) {
            toast({ title: "URLを入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            // STEP 2: FV, Appeals, Structure (Screenshot based)
            // Note: This might take longer now due to screenshot
            const result = await LpWritingActions.analyzeLpStructure(referenceUrl);
            if (result.success && result.data) {
                setStructureAnalysis(result.data);
                toast({ title: "分析完了", description: "構成と訴求要素を分析しました" });
                setStep(2);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // STEP 2 -> 3: Analyze Customer & Emotion
    const handleAnalyzeCustomer = () => {
        startTransition(async () => {
            // STEP 3: Emotional Curve
            const result = await LpWritingActions.analyzeLpCustomer(structureAnalysis);
            if (result.success && result.data) {
                setCustomerAnalysis(result.data);
                toast({ title: "分析完了", description: "ターゲットの感情曲線を分析しました" });
                setStep(3);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // STEP 3 -> 4: Start Hearing
    const startHearing = () => {
        setStep(4);
        if (hearingHistory.length === 0) {
            handleHearingSubmit(true);
        }
    };

    // STEP 4: Hearing Logic
    const handleHearingSubmit = (isFirst: boolean = false) => {
        if (!isFirst && !currentAnswer.trim()) return;

        const newHistory = isFirst ? [] : [...hearingHistory, { role: 'user' as const, text: currentAnswer }];
        setHearingHistory(newHistory);
        setCurrentAnswer("");
        setHearingStatus('asking');

        startTransition(async () => {
            // Context: Only current conversation (clean slate per requirements)
            // But we pass empty "currentInfo" initially
            const currentInfo = ""; // We ignore previous context now

            const result = await LpWritingActions.generateHearingQuestion(currentInfo, newHistory);

            if (result.success && result.data) {
                const aiResponse = result.data;
                setHearingHistory(prev => [...prev, { role: 'model' as const, text: aiResponse }]);

                if (aiResponse.includes("[完了]") || newHistory.filter(h => h.role === 'user').length >= 5) {
                    setHearingStatus('completed');

                    // Generate Product Profile automatically
                    const historyText = [...newHistory, { role: 'model' as const, text: aiResponse }].map(h => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.text}`).join('\n');
                    setHearingResult(historyText);

                    // Call generateProductProfile
                    const profileRes = await LpWritingActions.generateProductProfile(historyText);
                    if (profileRes.success && profileRes.data) {
                        setProductProfile(profileRes.data);
                        setIsProfileEditing(true); // Show editor
                    }
                } else {
                    setHearingStatus('idle');
                }
            } else {
                toast({ title: "エラー", description: "質問の生成に失敗しました", variant: "destructive" });
                setHearingStatus('idle');
            }
        });
    };

    // STEP 4 -> 5: Go to Outline Editor (Auto-propose initially?)
    const goToOutlineStep = () => {
        setStep(5);
        // Automatically propose outline if empty?
        if (outline.length === 0) {
            handleProposeOutline();
        }
    };

    // STEP 5 Action: Propose Outline
    const handleProposeOutline = () => {
        startTransition(async () => {
            // Use the edited Product Profile
            const result = await LpWritingActions.proposeLpOutline(structureAnalysis, customerAnalysis, productProfile);
            if (result.success && result.data) {
                try {
                    const parsed = JSON.parse(result.data);
                    setOutline(parsed);
                    toast({ title: "構成案を作成しました", description: "内容を確認・修正してください" });
                } catch (e) {
                    console.error("JSON Parse Error", e);
                    toast({ title: "エラー", description: "構成案の解析に失敗しました", variant: "destructive" });
                }
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // Outline Editor Helpers
    const updateSection = (index: number, field: keyof OutlineSection, value: string) => {
        const newOutline = [...outline];
        newOutline[index] = { ...newOutline[index], [field]: value };
        setOutline(newOutline);
    };

    const addSection = (index: number) => {
        const newOutline = [...outline];
        newOutline.splice(index + 1, 0, { id: Date.now().toString(), section: "新規セクション", title: "", content: "", emotion: "" });
        setOutline(newOutline);
    };

    const removeSection = (index: number) => {
        const newOutline = [...outline];
        newOutline.splice(index, 1);
        setOutline(newOutline);
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === outline.length - 1) return;

        const newOutline = [...outline];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newOutline[index];
        newOutline[index] = newOutline[targetIndex];
        newOutline[targetIndex] = temp;
        setOutline(newOutline);
    };

    // STEP 5 -> 6: Write Copy
    const handleGenerateCopy = () => {
        startTransition(async () => {
            // Convert outline to JSON string for the action
            const outlineJson = JSON.stringify(outline, null, 2);

            // Use Product Profile
            const result = await LpWritingActions.writeLpCopy(outlineJson, productProfile);
            if (result.success && result.data) {
                setFinalCopy(result.data);

                // Save History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `LP: ${referenceUrl}`,
                        'lp_writing', // Correct tool ID
                        { finalScript: result.data, finalOutline: outline, productProfile: productProfile }
                    ).catch(e => console.error(e));
                });

                setStep(6);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Progress Bar */}
            <div className="flex justify-between items-center relative px-4 overflow-x-auto pb-4">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10 translate-y-[-50%]" />
                {STEPS.map((s) => (
                    <div key={s.num} className={`bg-background px-4 flex flex-col items-center gap-2 min-w-[80px] ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${step >= s.num ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background"}`}>
                            {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold whitespace-nowrap">{s.title}</span>
                    </div>
                ))}
            </div>

            {/* STEP 1: Input */}
            <div className={step === 1 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: 参考LP入力</CardTitle>
                        <CardDescription>分析したいLPのURLを入力してください（商品のジャンルは問いません）。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>参考URL</Label>
                            <Input
                                placeholder="https://example.com/..."
                                value={referenceUrl}
                                onChange={(e) => setReferenceUrl(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" size="lg" onClick={handleAnalyzeStructure} disabled={isPending || !referenceUrl}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <ListChecks className="mr-2" />}
                            分析開始
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 2: Structure Analysis */}
            <div className={step === 2 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 構成・訴求分析</CardTitle>
                        <CardDescription>参考LPの「FV」「構成」「訴求軸」を分析しました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={structureAnalysis} />
                        </div>
                        <Button className="w-full" onClick={handleAnalyzeCustomer} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Users className="mr-2" />}
                            次へ（感情分析）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 3: Emotional Analysis */}
            <div className={step === 3 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 3: 感情曲線分析</CardTitle>
                        <CardDescription>ターゲットの感情変化（Emotional Curve）を可視化しました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={customerAnalysis} />
                        </div>
                        <Button className="w-full" onClick={startHearing} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <MessageSquare className="mr-2" />}
                            次へ（商品ヒアリング）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 4: Hearing */}
            <div className={step === 4 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
                    {/* Chat Column */}
                    <Card className="flex flex-col h-full">
                        <CardHeader className="py-4">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>商品ヒアリングチャット</span>
                                {hearingStatus !== 'completed' && questionCount > 0 && (
                                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                        {questionCount}/{MAX_QUESTIONS}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col overflow-hidden gap-4 p-4 pt-0">
                            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
                                {hearingHistory.length === 0 && isPending && (
                                    <div className="text-center text-muted-foreground py-10">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        AIが質問を準備しています...
                                    </div>
                                )}
                                {hearingHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white dark:bg-slate-800 border shadow-sm'}`}>
                                            <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {isPending && hearingHistory.length > 0 && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-lg p-3">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hearingStatus !== 'completed' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={currentAnswer}
                                            onChange={e => setCurrentAnswer(e.target.value)}
                                            placeholder="回答を入力..."
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleHearingSubmit()}
                                        />
                                        <Button onClick={() => handleHearingSubmit()} disabled={!currentAnswer.trim() || hearingStatus === 'asking'}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    {questionCount >= 2 && (
                                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => {
                                            setHearingStatus('completed');
                                            // Manual finish trigger if needed
                                        }}>
                                            ヒアリングを終了する
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Profile Editor Column */}
                    <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
                        <CardHeader className="py-4">
                            <CardTitle className="text-base">ターゲット・商品定義（AI作成）</CardTitle>
                            <CardDescription className="text-xs">ヒアリング結果からAIが自動作成します。**必ず内容を確認・修正してください。**</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-4 pt-0 gap-4">
                            {hearingStatus === 'completed' ? (
                                <>
                                    <div className="flex-1 relative">
                                        <Textarea
                                            value={productProfile}
                                            onChange={(e) => setProductProfile(e.target.value)}
                                            className="h-full resize-none font-mono text-sm leading-relaxed"
                                            placeholder="ヒアリング完了後にここに定義書が生成されます..."
                                        />
                                        {isPending && !productProfile && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                                <Loader2 className="w-8 h-8 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs flex items-center gap-2">
                                            <FileEdit className="w-4 h-4 shrink-0" />
                                            この内容を元に構成案が作成されます。不足や間違いがあれば自由に書き換えてください。
                                        </div>
                                        <Button className="w-full" size="lg" onClick={goToOutlineStep} disabled={isPending || !productProfile}>
                                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <FileEdit className="mr-2" />}
                                            定義を確定して構成作成へ
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm flex-col gap-3">
                                    <MessageSquare className="w-10 h-10 opacity-20" />
                                    <p>ヒアリングを完了すると<br />ここに編集画面が表示されます</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* STEP 5: Outline Editor */}
            <div className={step === 5 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>STEP 5: 詳細定義（構成エディタ）</span>
                            <Button variant="outline" size="sm" onClick={handleProposeOutline} disabled={isPending}>
                                <Wand2 className="w-4 h-4 mr-2" />
                                {outline.length > 0 ? "AI再提案" : "AI構成案作成"}
                            </Button>
                        </CardTitle>
                        <CardDescription>
                            参考LPの構造とヒアリング結果を元に、今回のLPの構成を定義します。<br />
                            AIが提案した内容を自由に修正・追加・並べ替えできます。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isPending && outline.length === 0 ? (
                            <div className="py-20 text-center">
                                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
                                <p>AIが最強の構成案を作成中...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {outline.map((section, index) => (
                                    <div key={section.id} className="border rounded-lg p-4 bg-background shadow-sm hover:shadow-md transition-shadow group relative">
                                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSection(index, 'up')} disabled={index === 0}><ChevronUp className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSection(index, 'down')} disabled={index === outline.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeSection(index)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>

                                        <div className="grid gap-4 pr-10">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">セクション名</Label>
                                                    <Input
                                                        value={section.section}
                                                        onChange={(e) => updateSection(index, 'section', e.target.value)}
                                                        className="font-bold bg-muted/20"
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label className="text-xs text-muted-foreground">見出し・キャッチコピー案</Label>
                                                    <Input
                                                        value={section.title}
                                                        onChange={(e) => updateSection(index, 'title', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">内容・コンテンツ指示</Label>
                                                <Textarea
                                                    value={section.content}
                                                    onChange={(e) => updateSection(index, 'content', e.target.value)}
                                                    rows={3}
                                                    className="resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">読者の感情（狙い）</Label>
                                                <Input
                                                    value={section.emotion}
                                                    onChange={(e) => updateSection(index, 'emotion', e.target.value)}
                                                    className="text-muted-foreground text-sm italic"
                                                />
                                            </div>
                                        </div>

                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="secondary" size="sm" className="h-6 w-6 rounded-full p-0 border shadow-sm" onClick={() => addSection(index)}>
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {outline.length > 0 && (
                                    <Button variant="outline" className="w-full border-dashed" onClick={() => addSection(outline.length - 1)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        セクションを追加
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <Button className="w-full" size="lg" onClick={handleGenerateCopy} disabled={isPending || outline.length === 0}>
                                {isPending ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />}
                                この構成で執筆開始
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 6: Final Copy */}
            <div className={step === 6 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>完成したLP原稿</CardTitle>
                        <CardDescription>確定した構成を元にAIが執筆しました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={finalCopy} />
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                最初からやり直す
                            </Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(finalCopy)}>
                                <Check className="w-4 h-4 mr-2" />
                                コピーする
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Refinement Area */}
                <RefinementArea
                    initialContent={finalCopy}
                    contextData={{
                        tool: "lp-writing",
                        productInfo: hearingResult,
                        outline: outline
                    }}
                    onContentUpdate={(newContent) => setFinalCopy(newContent)}
                />
            </div>
        </div>
    );
}
