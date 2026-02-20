"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Users, ListChecks, FileText, Check, PenTool, MessageSquare, Send, Table2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
    generateVslCampaigns,
    conductVslHearing,
    generateVslStructure,
    writeVslScript,
    type Hearing1Data,
    type CampaignProposal,
} from "@/app/actions/vslWriting";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

const STEPS = [
    { num: 1, title: "ターゲット", icon: Users },
    { num: 2, title: "企画決定", icon: Sparkles },
    { num: 3, title: "詳細ヒアリング", icon: MessageSquare },
    { num: 4, title: "構成作成", icon: Table2 },
    { num: 5, title: "執筆", icon: FileText },
];

export function VSLWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // STEP 1: Target Hearing
    const [hearing1, setHearing1] = useState<Hearing1Data>({
        worstScenario: "",
        failedMethods: "",
        desiredFuture: "",
        urgencyReason: "",
    });

    // STEP 2: Campaign Proposals
    const [referenceCopies, setReferenceCopies] = useState("");
    const [campaigns, setCampaigns] = useState<CampaignProposal[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignProposal | null>(null);

    // STEP 3: Detailed Hearing (Chat)
    const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [hearingComplete, setHearingComplete] = useState(false);
    const [gatheredInfo, setGatheredInfo] = useState<Record<string, string>>({});
    const chatEndRef = useRef<HTMLDivElement>(null);

    // STEP 4: Structure
    const [structure, setStructure] = useState("");

    // STEP 5: Final Script
    const [finalScript, setFinalScript] = useState("");

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    // --- STEP 1 → STEP 2 ---
    const handleGenerateCampaigns = () => {
        if (!hearing1.worstScenario || !hearing1.desiredFuture) {
            toast({ title: "「最悪の情景」と「欲しい未来」は必須です", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await generateVslCampaigns(hearing1, referenceCopies);
            if (result.success && result.data) {
                if (Array.isArray(result.data)) {
                    setCampaigns(result.data);
                }
                setStep(2);
                toast({ title: "企画案を3パターン作成しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // --- STEP 2 → STEP 3 ---
    const handleSelectCampaign = (campaign: CampaignProposal) => {
        setSelectedCampaign(campaign);
        // Start hearing with initial AI message
        startTransition(async () => {
            const result = await conductVslHearing(hearing1, campaign, [], "（ヒアリング開始）");
            if (result.success && result.data) {
                setChatHistory([{ role: "ai", text: result.data.message }]);
                if (result.data.gatheredInfo) {
                    setGatheredInfo(prev => {
                        const updated = { ...prev };
                        for (const [k, v] of Object.entries(result.data.gatheredInfo)) {
                            if (v && typeof v === "string" && v.trim()) updated[k] = v;
                        }
                        return updated;
                    });
                }
                setStep(3);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // --- STEP 3: Chat ---
    const handleSendChat = () => {
        if (!chatInput.trim() || !selectedCampaign) return;
        const userMsg = chatInput.trim();
        setChatInput("");
        const newHistory = [...chatHistory, { role: "user" as const, text: userMsg }];
        setChatHistory(newHistory);

        startTransition(async () => {
            const result = await conductVslHearing(hearing1, selectedCampaign, newHistory, userMsg);
            if (result.success && result.data) {
                setChatHistory(prev => [...prev, { role: "ai" as const, text: result.data.message }]);
                if (result.data.isComplete) {
                    setHearingComplete(true);
                }
                if (result.data.gatheredInfo) {
                    setGatheredInfo(prev => {
                        const updated = { ...prev };
                        for (const [k, v] of Object.entries(result.data.gatheredInfo)) {
                            if (v && typeof v === "string" && v.trim()) updated[k] = v;
                        }
                        return updated;
                    });
                }
            } else {
                setChatHistory(prev => [...prev, { role: "ai" as const, text: "通信エラーが発生しました。もう一度お試しください。" }]);
            }
        });
    };

    // --- STEP 3 → STEP 4 ---
    const handleGenerateStructure = () => {
        if (!selectedCampaign) return;
        startTransition(async () => {
            const result = await generateVslStructure(hearing1, selectedCampaign, gatheredInfo);
            if (result.success && result.data) {
                setStructure(result.data);
                setStep(4);
                toast({ title: "構成表を作成しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // --- STEP 4 → STEP 5 ---
    const handleWriteScript = () => {
        if (!selectedCampaign) return;
        startTransition(async () => {
            const result = await writeVslScript(hearing1, selectedCampaign, gatheredInfo, structure);
            if (result.success && result.data) {
                setFinalScript(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `VSL台本: ${selectedCampaign.title.slice(0, 30)}`,
                        "video_script",
                        {
                            finalScript: result.data,
                            hearingResult: gatheredInfo,
                            selectedCampaign,
                            hearing1,
                        }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(5);
                toast({ title: "台本を執筆しました", description: "履歴に保存されました" });
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

            {/* ===== STEP 1: ターゲットのヒアリング ===== */}
            <div className={step === 1 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: ターゲットのヒアリング</CardTitle>
                        <CardDescription>動画台本を作成するための最低限の情報を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>
                                ターゲットが今直面している「最悪の情景」は？
                                <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <p className="text-xs text-muted-foreground">ターゲットが一番「もう嫌だ…」と思っている瞬間を教えてください（複数記入可能）</p>
                            <Textarea
                                placeholder="例: 毎日鏡を見るたびに自分の体型に自信を失っている"
                                value={hearing1.worstScenario}
                                onChange={e => setHearing1(prev => ({ ...prev, worstScenario: e.target.value }))}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ターゲットが過去に失敗した「既存の手法」は？</Label>
                            <p className="text-xs text-muted-foreground">ターゲットが過去に試して、ダメだったことは何ですか？（複数記入可能）</p>
                            <Textarea
                                placeholder="例: ランニングをしてみても3日で挫折した"
                                value={hearing1.failedMethods}
                                onChange={e => setHearing1(prev => ({ ...prev, failedMethods: e.target.value }))}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>
                                ターゲットが喉から手が出るほど欲しい「具体的な未来」は？
                                <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <p className="text-xs text-muted-foreground">ターゲットが叶えたい理想の未来は何ですか？（複数記入可能）</p>
                            <Textarea
                                placeholder="例: 自信を持って水着を着れる"
                                value={hearing1.desiredFuture}
                                onChange={e => setHearing1(prev => ({ ...prev, desiredFuture: e.target.value }))}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ターゲットがあなたの動画を「今」見るべき理由は？</Label>
                            <p className="text-xs text-muted-foreground">なぜ今、この動画を見ないと後悔するのか、一言で教えてください</p>
                            <Textarea
                                placeholder="例: 痩せるきっかけを掴めないままズルズル時間が過ぎてしまう"
                                value={hearing1.urgencyReason}
                                onChange={e => setHearing1(prev => ({ ...prev, urgencyReason: e.target.value }))}
                                className="min-h-[60px]"
                            />
                        </div>

                        <div className="border-t pt-6 space-y-2">
                            <Label>参考コピー（任意）</Label>
                            <p className="text-xs text-muted-foreground">
                                note、Brain等の教材販売サイト・Web広告・競合のキャッチコピーをいくつか貼り付けてください。
                                これらを分析して企画案に反映します。
                            </p>
                            <Textarea
                                placeholder={"例:\n・「たった3ステップで月収100万円の仕組みを作る方法」\n・「97%の人が知らない〇〇の裏技」\n・「これを知らないと一生損する△△の真実」"}
                                value={referenceCopies}
                                onChange={e => setReferenceCopies(e.target.value)}
                                className="min-h-[120px]"
                            />
                        </div>

                        <Button className="w-full" size="lg" onClick={handleGenerateCampaigns} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                            企画案を3パターン作成
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ===== STEP 2: 企画決定 ===== */}
            <div className={step === 2 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 企画決定</CardTitle>
                        <CardDescription>3つの企画案から、最も適したものを選んでください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {campaigns.map((c) => (
                            <div
                                key={c.id}
                                className={`border rounded-lg p-5 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
                                    selectedCampaign?.id === c.id ? "border-primary bg-primary/10 ring-2 ring-primary/30" : ""
                                }`}
                                onClick={() => setSelectedCampaign(c)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg mb-1">{c.title}</h3>
                                        <p className="text-sm text-muted-foreground mb-3">{c.concept}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {c.elements.map((el, i) => (
                                                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                    {el}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{c.reasoning}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                                        selectedCampaign?.id === c.id ? "border-primary bg-primary text-primary-foreground" : "border-muted"
                                    }`}>
                                        {selectedCampaign?.id === c.id && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>戻る</Button>
                            <Button
                                className="flex-1"
                                onClick={() => selectedCampaign && handleSelectCampaign(selectedCampaign)}
                                disabled={!selectedCampaign || isPending}
                            >
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <MessageSquare className="mr-2" />}
                                この企画で詳細ヒアリングへ
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ===== STEP 3: 詳細ヒアリング（チャット） ===== */}
            <div className={step === 3 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 3: 詳細ヒアリング</CardTitle>
                        <CardDescription>
                            AIが台本に必要な情報を対話形式でヒアリングします。質問に答えてください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Chat Area */}
                        <div className="border rounded-lg bg-muted/20 p-4 h-[400px] overflow-y-auto space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background border shadow-sm"
                                    }`}>
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                    </div>
                                </div>
                            ))}
                            {isPending && (
                                <div className="flex justify-start">
                                    <div className="bg-background border shadow-sm rounded-lg px-4 py-2.5">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                            <Textarea
                                placeholder="回答を入力..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                className="min-h-[60px] max-h-[120px] resize-none"
                                onKeyDown={e => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        handleSendChat();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleSendChat}
                                disabled={isPending || !chatInput.trim()}
                                size="icon"
                                className="h-[60px] w-[60px] shrink-0"
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Ctrl+Enter で送信</p>

                        {/* Proceed to Structure */}
                        <div className="flex gap-4 pt-2">
                            <Button variant="outline" onClick={() => setStep(2)}>戻る</Button>
                            <Button
                                className="flex-1"
                                onClick={handleGenerateStructure}
                                disabled={isPending || chatHistory.length < 2}
                            >
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Table2 className="mr-2" />}
                                {hearingComplete ? "構成を作成する" : "ヒアリング途中だけど構成を作成する"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ===== STEP 4: 構成作成・最終決定 ===== */}
            <div className={step === 4 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 4: 構成作成・最終決定</CardTitle>
                        <CardDescription>
                            構成表を確認し、必要に応じて修正してから執筆に進んでください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={structure} />
                        </div>

                        <div className="space-y-2">
                            <Label>構成の手動修正（任意）</Label>
                            <p className="text-xs text-muted-foreground">
                                上の構成表をコピーして修正し、貼り付けることができます。変更がなければそのまま進んでください。
                            </p>
                            <Textarea
                                placeholder="構成を修正する場合はここに貼り付けてください（空欄の場合はAI生成のまま使用）"
                                value=""
                                onChange={e => {
                                    if (e.target.value.trim()) setStructure(e.target.value);
                                }}
                                className="min-h-[120px]"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep(3)}>戻る</Button>
                            <Button className="flex-1" onClick={handleWriteScript} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />}
                                この構成で台本を執筆する
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ===== STEP 5: 執筆完了 ===== */}
            <div className={step === 5 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 5: 執筆完了</CardTitle>
                        <CardDescription>VSL台本を確認・調整してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={finalScript} />
                        </div>

                        <RefinementArea
                            initialContent={finalScript}
                            contextData={{
                                hearing1,
                                selectedCampaign,
                                hearingResult: gatheredInfo,
                                structure,
                            }}
                            onContentUpdate={(newContent) => setFinalScript(newContent)}
                            contentType="script"
                        />

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>最初から</Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(finalScript)}>
                                コピー
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
