"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createStudyPlan } from "@/app/actions/planner";
import { useToast } from "@/components/ui/use-toast"; // Assuming this exists or using simple alert

export function GoalInput() {
    const [goal, setGoal] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    // const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal.trim()) return;

        setIsSubmitting(true);
        try {
            await createStudyPlan(goal);
        } catch (error) {
            console.error(error);
            alert("プラン作成に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
            >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-foreground">
                    あなたの学習ゴールは何ですか？
                </h2>
                <p className="text-xl text-muted-foreground">
                    達成したい目標を教えてください。<br />
                    AIが最適な学習ロードマップと、今日やるべきタスクを生成します。
                </p>
            </motion.div>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                onSubmit={handleSubmit}
                className="w-full relative group"
            >
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex gap-2">
                    <Input
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="例: 3ヶ月でPythonを使ってデータ分析ができるようになる"
                        className="h-16 text-lg px-6 rounded-xl shadow-lg border-2 border-transparent focus:border-primary/50 transition-all bg-card/80 backdrop-blur-sm"
                        disabled={isSubmitting}
                    />
                    <Button
                        type="submit"
                        size="lg"
                        className="h-16 px-8 rounded-xl text-lg font-semibold shadow-xl shadow-primary/20"
                        disabled={isSubmitting || !goal.trim()}
                    >
                        {isSubmitting ? (
                            <Sparkles className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                AIプラン生成 <ArrowRight className="ml-2 w-5 h-5" />
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                    ※ 既存のカリキュラムや動画教材もゴールに合わせて自動で組み込まれます
                </p>
            </motion.form>
        </div>
    );
}
