"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Users, ListChecks, FileText, Check, Scissors, ClipboardCopy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
    analyzeVideoTranscript,
    extractHighlights,
    proposeClips,
    generateEditInstructions
} from "@/app/actions/videoClip";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

const STEPS = [
    { num: 1, title: "動画入力", icon: Video },
    { num: 2, title: "目的設定", icon: Users },
    { num: 3, title: "ハイライト抽出", icon: Sparkles },
    { num: 4, title: "クリップ提案", icon: Scissors },
    { num: 5, title: "編集指示書", icon: FileText },
];

export function VideoClipWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Inputs
    const [videoUrl, setVideoUrl] = useState("");
    const [platform, setPlatform] = useState("shorts");
    const [purpose, setPurpose] = useState("バイラル狙い");
    const [targetAudience, setTargetAudience] = useState("");
    const [clipCount, setClipCount] = useState(5);
    const [maxLength, setMaxLength] = useState(60);

    // Results
    const [videoTitle, setVideoTitle] = useState("");
    const [transcript, setTranscript] = useState("");
    const [highlights, setHighlights] = useState("");
    const [clipProposals, setClipProposals] = useState("");
    const [editInstructions, setEditInstructions] = useState("");

    const handleFetchTranscript = () => {
        if (!videoUrl) {
            toast({ title: "動画URLを入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeVideoTranscript(videoUrl);
            if (result.success && result.data) {
                setVideoTitle(result.data.title);
                setTranscript(result.data.transcript);
                setStep(2);
                toast({ title: "取得完了", description: `「${result.data.title}」の字幕を取得しました` });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleExtractHighlights = () => {
        startTransition(async () => {
            const result = await extractHighlights(
                transcript, videoTitle, purpose, targetAudience, maxLength, clipCount
            );
            if (result.success && result.data) {
                setHighlights(result.data);
                setStep(3);
                toast({ title: "分析完了", description: "ハイライトポイントを抽出しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleProposeClips = () => {
        startTransition(async () => {
            const result = await proposeClips(
                highlights, videoTitle, platform, purpose, targetAudience, maxLength, clipCount
            );
            if (result.success && result.data) {
                setClipProposals(result.data);
                setStep(4);
                toast({ title: "提案完了", description: `${clipCount}本のクリップを提案しました` });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleGenerateEditInstructions = () => {
        startTransition(async () => {
            const result = await generateEditInstructions(clipProposals, videoTitle, platform);
            if (result.success && result.data) {
                setEditInstructions(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `動画切り抜き: ${videoTitle.slice(0, 30)}...`,
                        'video_script',
                        { editInstructions: result.data, videoTitle, platform }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(5);
                toast({ title: "完了", description: "編集指示書を作成しました。履歴に保存されました。" });
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

            {/* STEP 1: Video Input */}
            <div className={step === 1 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: 動画の入力</CardTitle>
                        <CardDescription>切り抜きたい長尺動画のYouTube URLを入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>YouTube動画URL<span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">※字幕（トランスクリプト）が取得可能な動画を指定してください。</p>
                        </div>

                        <div className="space-y-2">
                            <Label>投稿先プラットフォーム</Label>
                            <Select value={platform} onValueChange={setPlatform}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tiktok">TikTok（15〜60秒）</SelectItem>
                                    <SelectItem value="shorts">YouTube Shorts（60秒以内）</SelectItem>
                                    <SelectItem value="reels">Instagram Reels（15〜90秒）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleFetchTranscript} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Video className="mr-2" />}
                            動画を取得・分析開始
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 2: Purpose & Target */}
            <div className={step === 2 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 切り抜き目的の設定</CardTitle>
                        <CardDescription>「{videoTitle}」の字幕を取得しました。切り抜きの目的を設定してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-3 bg-muted/30 rounded-lg border text-sm">
                            <p className="font-medium mb-1">取得した字幕:</p>
                            <p className="text-muted-foreground line-clamp-3">{transcript.slice(0, 200)}...</p>
                            <p className="text-xs text-muted-foreground mt-1">（{transcript.length.toLocaleString()}文字）</p>
                        </div>

                        <div className="space-y-2">
                            <Label>切り抜きの目的</Label>
                            <Select value={purpose} onValueChange={setPurpose}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="チャンネル認知拡大">チャンネル認知拡大</SelectItem>
                                    <SelectItem value="バイラル狙い">バイラル狙い</SelectItem>
                                    <SelectItem value="教育・学びのシェア">教育・学びのシェア</SelectItem>
                                    <SelectItem value="エンタメ・笑い">エンタメ・笑い</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>ターゲット層（任意）</Label>
                            <Input
                                placeholder="例：20代の副業に興味がある会社員"
                                value={targetAudience}
                                onChange={e => setTargetAudience(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>希望クリップ数</Label>
                                <Select value={String(clipCount)} onValueChange={v => setClipCount(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">3本</SelectItem>
                                        <SelectItem value="5">5本</SelectItem>
                                        <SelectItem value="7">7本</SelectItem>
                                        <SelectItem value="10">10本</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>最大長さ（秒）</Label>
                                <Select value={String(maxLength)} onValueChange={v => setMaxLength(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15秒</SelectItem>
                                        <SelectItem value="30">30秒</SelectItem>
                                        <SelectItem value="60">60秒</SelectItem>
                                        <SelectItem value="90">90秒</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleExtractHighlights} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                            ハイライトを抽出
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 3: Highlights */}
            <div className={step === 3 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 3: ハイライト分析結果</CardTitle>
                        <CardDescription>バズる可能性の高いポイントを抽出しました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={highlights} />
                        </div>
                        <Button className="w-full" onClick={handleProposeClips} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Scissors className="mr-2" />}
                            次へ（クリップ提案）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 4: Clip Proposals */}
            <div className={step === 4 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 4: 切り抜きクリップ提案</CardTitle>
                        <CardDescription>{clipCount}本のクリップを提案しました。確認して編集指示書を作成してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[600px] overflow-y-auto">
                            <MarkdownRenderer content={clipProposals} />
                        </div>
                        <Button className="w-full" onClick={handleGenerateEditInstructions} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />}
                            編集指示書を作成
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 5: Edit Instructions */}
            <div className={step === 5 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>編集指示書完成</CardTitle>
                        <CardDescription>編集指示書をもとに動画を編集してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={editInstructions} />
                        </div>

                        <RefinementArea
                            initialContent={editInstructions}
                            contextData={{
                                videoTitle,
                                platform,
                                purpose,
                                highlights,
                                clips: clipProposals
                            }}
                            onContentUpdate={(newContent) => setEditInstructions(newContent)}
                            contentType="script"
                        />

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>トップへ戻る</Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(editInstructions)}>
                                <ClipboardCopy className="mr-2 w-4 h-4" />
                                コピー
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
