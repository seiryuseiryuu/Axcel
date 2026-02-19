"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check, ClipboardCopy, FileText, Scissors, Clock, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { correctSubtitles, extractClipCandidates } from "@/app/actions/videoClip";

const STEPS = [
    { num: 1, title: "字幕入力", icon: PenTool },
    { num: 2, title: "字幕校正", icon: FileText },
    { num: 3, title: "尺の選択", icon: Clock },
    { num: 4, title: "切り抜き候補", icon: Scissors },
];

const CLIP_LENGTHS = [
    { value: 30, label: "30秒" },
    { value: 45, label: "45秒" },
    { value: 60, label: "60秒" },
    { value: 90, label: "90秒" },
    { value: 120, label: "120秒" },
];

export function VideoClipWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Data
    const [rawSubtitles, setRawSubtitles] = useState("");
    const [correctedSubtitles, setCorrectedSubtitles] = useState("");
    const [selectedLength, setSelectedLength] = useState<number | null>(null);
    const [clipCandidates, setClipCandidates] = useState("");

    // STEP 1 → 2: Correct subtitles
    const handleCorrectSubtitles = () => {
        if (!rawSubtitles.trim()) {
            toast({ title: "字幕を入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await correctSubtitles(rawSubtitles);
            if (result.success && result.data) {
                setCorrectedSubtitles(result.data);
                setStep(2);
                toast({ title: "校正完了", description: "誤字脱字を修正しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    // STEP 3 → 4: Extract clip candidates
    const handleExtractClips = () => {
        if (!selectedLength) {
            toast({ title: "尺を選択してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await extractClipCandidates(correctedSubtitles, selectedLength);
            if (result.success && result.data) {
                setClipCandidates(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `動画切り抜き分析: ${selectedLength}秒`,
                        'video_script',
                        { clipCandidates: result.data, selectedLength }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(4);
                toast({ title: "抽出完了", description: "切り抜き候補を抽出しました" });
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

            {/* STEP 1: Subtitle Input */}
            <div className={step === 1 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: タイムコード付き字幕の入力</CardTitle>
                        <CardDescription>
                            YouTubeの字幕（タイムスタンプ付き）または文字起こしツールで取得した字幕を貼り付けてください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>タイムコード付き字幕<span className="text-red-500">*</span></Label>
                            <Textarea
                                placeholder={`例:\n00:00:00 皆さんこんにちは、今日は副業について話していきたいと思います。\n00:00:05 まず最初に、なぜ今副業が必要なのかという話なんですけど...\n00:00:12 実は日本の平均年収というのは...\n\n※YouTubeの字幕やWhisperなどの文字起こしツールの出力をそのまま貼り付けてください。`}
                                value={rawSubtitles}
                                onChange={e => setRawSubtitles(e.target.value)}
                                className="min-h-[300px] font-mono text-sm"
                            />
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>※ YouTubeの字幕（トランスクリプト）からコピー&ペーストできます。</p>
                                <p>※ Whisper等の文字起こしツールの出力も使用できます。</p>
                                <p>※ タイムコードのフォーマットは問いません（HH:MM:SS、MM:SS、秒数など）。</p>
                            </div>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleCorrectSubtitles} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                            字幕を校正する
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 2: Corrected Subtitles */}
            <div className={step === 2 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 校正済み字幕の確認</CardTitle>
                        <CardDescription>
                            誤字脱字を修正しました。タイムコードは変更されていません。内容を確認して次へ進んでください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>校正済みタイムコード付き字幕</Label>
                            <Textarea
                                value={correctedSubtitles}
                                onChange={e => setCorrectedSubtitles(e.target.value)}
                                className="min-h-[300px] font-mono text-sm bg-background"
                            />
                            <p className="text-xs text-muted-foreground">※ 必要に応じて手動で修正も可能です。</p>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                戻る
                            </Button>
                            <Button className="flex-1" onClick={() => setStep(3)}>
                                次へ（尺の選択）
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 3: Select Clip Length */}
            <div className={step === 3 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 3: 切り抜きの希望尺を選択</CardTitle>
                        <CardDescription>
                            切り抜きたいショート動画の長さを選択してください。選択した尺±10秒程度で候補を抽出します。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-5 gap-3">
                            {CLIP_LENGTHS.map((len) => (
                                <Button
                                    key={len.value}
                                    variant={selectedLength === len.value ? "default" : "outline"}
                                    className={`h-20 text-lg font-bold flex flex-col gap-1 transition-all ${selectedLength === len.value
                                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                                            : "hover:scale-105"
                                        }`}
                                    onClick={() => setSelectedLength(len.value)}
                                >
                                    <Clock className="w-5 h-5" />
                                    {len.label}
                                </Button>
                            ))}
                        </div>

                        {selectedLength && (
                            <p className="text-sm text-center text-muted-foreground">
                                {selectedLength - 10}秒〜{selectedLength + 10}秒の範囲で切り抜き候補を検索します。
                            </p>
                        )}

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                                戻る
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleExtractClips}
                                disabled={isPending || !selectedLength}
                            >
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Scissors className="mr-2" />}
                                切り抜き候補を抽出
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 4: Clip Candidates */}
            <div className={step === 4 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 4: 切り抜き候補一覧</CardTitle>
                        <CardDescription>
                            {selectedLength}秒（±10秒）の条件に合致する切り抜き候補です。タイムコードと開始・終了セリフを確認してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={clipCandidates} />
                        </div>

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                                尺を変えて再抽出
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                最初に戻る
                            </Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(clipCandidates)}>
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
