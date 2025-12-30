"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createMetaCurriculum } from "@/app/actions/planner";
import { Rocket, Target, Sparkles } from "lucide-react";

export default function OnboardingPage() {
    const [goal, setGoal] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal.trim()) return;

        startTransition(async () => {
            try {
                await createMetaCurriculum(goal);
                // Redirect will be handled by the action or client-side after success
                router.push("/dashboard");
            } catch (error) {
                console.error("Onboarding failed", error);
                // Show error toast
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="max-w-xl w-full border-border/50 shadow-xl bg-white/80 backdrop-blur">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Rocket className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">あなたの学習目標を教えてください</CardTitle>
                    <CardDescription className="text-base">
                        AIがあなただけの専用カリキュラムと、<br />毎日の学習プランを自動で生成します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Target className="w-4 h-4 text-muted-foreground" />
                                目標を入力 (例: 3ヶ月でPythonを使ってデータ分析ができるようになる)
                            </label>
                            <Input
                                placeholder="目標を入力してください..."
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className="h-12 text-lg"
                                autoFocus
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 animate-spin" />
                                    カリキュラム生成中...
                                </span>
                            ) : (
                                "学習をスタートする"
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            ※ 目標は後からいつでも変更できます。
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
