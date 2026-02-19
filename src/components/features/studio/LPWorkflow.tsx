"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Link, ListChecks, Users, MessageSquare, FileEdit, FileText, Check, Send, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { RefinementArea } from "./RefinementArea";
import * as LpWritingActions from "@/app/actions/lpWriting";

const STEPS = [
    { num: 1, title: "情報入力", icon: Link },
    { num: 2, title: "構成分解", icon: ListChecks },
    { num: 3, title: "感情分析", icon: Users },
    { num: 4, title: "ヒアリング", icon: MessageSquare }, // New
    { num: 5, title: "詳細定義", icon: FileEdit },       // New
    { num: 6, title: "執筆", icon: FileText },
];

export function LPWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Data State
    const [referenceUrl, setReferenceUrl] = useState("");
    const [productInfo, setProductInfo] = useState(""); // Initially empty or minimal

    // Analysis Results
    const [structureAnalysis, setStructureAnalysis] = useState("");
    const [customerAnalysis, setCustomerAnalysis] = useState("");
    const [deepAnalysis, setDeepAnalysis] = useState(""); // Generated after hearing
    const [finalCopy, setFinalCopy] = useState("");

    // Hearing State
    const [hearingHistory, setHearingHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [hearingStatus, setHearingStatus] = useState<'idle' | 'asking' | 'completed'>('idle');

    // --- Actions ---

    const handleAnalyzeStructure = () => {
        if (!referenceUrl) {
            toast({ title: "URLを入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            // Product info is minimal at this stage, mostly just URL analysis
            const result = await LpWritingActions.analyzeLpStructure(referenceUrl, productInfo || "（ヒアリング前につき未定）");
            if (result.success && result.data) {
                setStructureAnalysis(result.data);
                toast({ title: "構成分解完了", description: "次のステップへ進んでください" });
                setStep(2);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeCustomer = () => {
        startTransition(async () => {
            const result = await LpWritingActions.analyzeLpCustomer(structureAnalysis);
            if (result.success && result.data) {
                setCustomerAnalysis(result.data);
                toast({ title: "感情分析完了", description: "ターゲットの感情曲線を分析しました" });
                setStep(3);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const startHearing = () => {
        setStep(4);
        if (hearingHistory.length === 0) {
            handleHearingSubmit(true); // Trigger first question
        }
    };

    const handleHearingSubmit = (isFirst: boolean = false) => {
        if (!isFirst && !currentAnswer.trim()) return;

        const newHistory = isFirst ? [] : [...hearingHistory, { role: 'user' as const, text: currentAnswer }];
        setHearingHistory(newHistory);
        setCurrentAnswer("");
        setHearingStatus('asking');

        startTransition(async () => {
            // Combine all context for the AI
            const currentContext = `
【参考LP構造】
${structureAnalysis}

【顧客・感情分析】
${customerAnalysis}

【ユーザー入力済みの商品情報】
${productInfo}
`;
            const result = await LpWritingActions.generateHearingQuestion(currentContext, newHistory);

            if (result.success && result.data) {
                const aiResponse = result.data;
                setHearingHistory(prev => [...prev, { role: 'model' as const, text: aiResponse }]);

                if (aiResponse.includes("[完了]")) {
                    setHearingStatus('completed');
                    // Automatically consolidate product info based on hearing? 
                    // For now, we just append conversation to product info for the next step logic
                    setProductInfo(prev => prev + "\n\n【ヒアリング結果】\n" + newHistory.map(h => `${h.role}: ${h.text}`).join('\n'));
                } else {
                    setHearingStatus('idle');
                }
            } else {
                toast({ title: "エラー", description: "質問の生成に失敗しました", variant: "destructive" });
                setHearingStatus('idle');
            }
        });
    };

    const handleAnalyzeDeep = () => {
        startTransition(async () => {
            const result = await LpWritingActions.analyzeLpDeep(structureAnalysis, customerAnalysis);
            if (result.success && result.data) {
                setDeepAnalysis(result.data);
                setStep(5);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleGenerateCopy = () => {
        startTransition(async () => {
            const result = await LpWritingActions.writeLpCopy(structureAnalysis, customerAnalysis, deepAnalysis, productInfo);
            if (result.success && result.data) {
                setFinalCopy(result.data);

                // Save to History (Async)
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `LP: ${referenceUrl}`,
                        'seo_article',
                        { finalScript: result.data, structure: structureAnalysis }
                    ).catch(e => console.error(e));
                });

                setStep(6);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
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
                        <CardDescription>分析したいLPのURLを入力してください。商品情報は後でヒアリングします。</CardDescription>
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
                        <CardTitle>STEP 2: 構成分解結果</CardTitle>
                        <CardDescription>参考LPの構造を分析しました。</CardDescription>
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
                        <CardDescription>ターゲットの感情変化（Emotional Curve）を分析しました。</CardDescription>
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

            {/* STEP 4: Product Hearing (Chat) */}
            <div className={step === 4 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card className="h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle>STEP 4: 商品詳細ヒアリング</CardTitle>
                        <CardDescription>AIからの質問に答えて、商品の詳細を明確にしていきましょう。</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col overflow-hidden gap-4">
                        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
                            {hearingHistory.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    AIが質問を準備しています...
                                </div>
                            )}
                            {hearingHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white dark:bg-slate-800 border shadow-sm'}`}>
                                        <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {hearingStatus === 'asking' && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-lg p-3">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {hearingStatus === 'completed' ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
                                    <Check className="w-4 h-4" /> ヒアリングが完了しました。「次へ」を押して分析に進んでください。
                                </div>
                                <Button className="w-full" onClick={handleAnalyzeDeep} disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 animate-spin" /> : <FileEdit className="mr-2" />}
                                    次へ（詳細定義・分析）
                                </Button>
                            </div>
                        ) : (
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
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* STEP 5: Detailed Definition */}
            <div className={step === 5 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 5: 詳細定義・戦略策定</CardTitle>
                        <CardDescription>ヒアリング結果に基づく戦略案です。内容を確認・修正して執筆に進んでください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                            <div className="space-y-2 flex flex-col">
                                <Label>戦略・訴求ポイント分析</Label>
                                <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-muted/30">
                                    <MarkdownRenderer content={deepAnalysis} />
                                </div>
                            </div>
                            <div className="space-y-2 flex flex-col">
                                <Label>商品情報まとめ（AIヒアリング結果含む）</Label>
                                <Textarea
                                    className="flex-1 font-mono text-sm resize-none"
                                    value={productInfo}
                                    onChange={e => setProductInfo(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="w-full" size="lg" onClick={handleGenerateCopy} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />}
                            LP執筆開始
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 6: Final Copy */}
            <div className={step === 6 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>完成したLP原稿</CardTitle>
                        <CardDescription>AIが執筆したLPの原稿です。</CardDescription>
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
                        productInfo,
                        structure: structureAnalysis,
                        customer: customerAnalysis,
                        deep: deepAnalysis
                    }}
                    onContentUpdate={(newContent) => setFinalCopy(newContent)}
                />
            </div>
        </div>
    );
}
