"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, CalendarDays, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanTask, toggleTaskCompletion } from "@/app/actions/planner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DailyChecklistProps {
    planId: string;
    tasks: PlanTask[];
    date: string;
}

export function DailyChecklist({ planId, tasks: initialTasks, date }: DailyChecklistProps) {
    const [tasks, setTasks] = useState(initialTasks);

    const handleToggle = async (taskId: string) => {
        const newTasks = tasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        setTasks(newTasks);

        // Optimistic update
        try {
            await toggleTaskCompletion(planId, newTasks);
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on error could be implemented here
        }
    };

    const progress = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-primary" />
                        {date} の学習タスク
                    </h2>
                    <p className="text-muted-foreground">
                        一歩ずつ進めましょう。小さな積み重ねが大きな成果につながります。
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{progress}%</div>
                    <div className="text-sm text-muted-foreground">完了</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>

            <div className="grid gap-3">
                {tasks.map((task, index) => (
                    <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                            "group flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                            task.completed
                                ? "bg-primary/5 border-primary/20"
                                : "bg-card border-border hover:border-primary/50 hover:shadow-md"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleToggle(task.id)}
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                                    task.completed
                                        ? "bg-primary border-primary text-primary-foreground scale-110"
                                        : "border-muted-foreground/30 hover:border-primary text-transparent"
                                )}
                            >
                                <Check className="w-5 h-5" strokeWidth={3} />
                            </button>

                            <div className={cn("transition-opacity duration-200", task.completed && "opacity-50")}>
                                <div className={cn(
                                    "font-medium text-lg transition-all",
                                    task.completed && "line-through decoration-primary/30 decoration-2"
                                )}>
                                    {task.title}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {task.estimatedMinutes}分
                                </div>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>詳細を見る</DropdownMenuItem>
                                <DropdownMenuItem>後でやる（スキップ）</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </motion.div>
                ))}
            </div>

            {progress === 100 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl border border-primary/20 text-center space-y-4"
                >
                    <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-3xl">
                        🎉
                    </div>
                    <h3 className="text-2xl font-bold text-primary">素晴らしい！本日のタスク完了です！</h3>
                    <p className="text-muted-foreground">
                        この調子で続けましょう。明日もAIが最適なプランを用意して待っています。
                    </p>
                </motion.div>
            )}
        </div>
    );
}
