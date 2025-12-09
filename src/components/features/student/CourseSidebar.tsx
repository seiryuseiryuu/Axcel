"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckCircle, PlayCircle, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CourseSidebarProps {
    courseId: string;
    courseTitle: string;
    chapters: {
        title: string;
        contents: {
            id: string;
            title: string;
            type: "video" | "text" | "quiz";
            isCompleted: boolean;
            isLocked: boolean;
        }[];
    }[];
}

export function CourseSidebar({ courseId, courseTitle, chapters }: CourseSidebarProps) {
    const pathname = usePathname();

    return (
        <div className="h-full border-r flex flex-col bg-background">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-lg line-clamp-2">{courseTitle}</h2>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col w-full">
                    {chapters.map((chapter, i) => (
                        <div key={i}>
                            <div className="px-4 py-3 bg-muted/50 text-sm font-medium">
                                {chapter.title}
                            </div>
                            {chapter.contents.map((content) => {
                                const isActive = pathname?.includes(content.id);
                                return (
                                    <Link
                                        key={content.id}
                                        href={content.isLocked ? "#" : `/courses/${courseId}/learn/${content.id}`}
                                        className={cn(
                                            "flex items-center gap-x-2 pl-6 pr-4 py-3 text-sm transition-all hover:bg-slate-300/20",
                                            isActive && "bg-slate-200/20 text-indigo-700 h-full border-r-2 border-indigo-700",
                                            content.isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent"
                                        )}
                                    >
                                        {content.isCompleted ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        ) : content.isLocked ? (
                                            <Lock className="h-4 w-4 text-slate-500" />
                                        ) : (
                                            <PlayCircle className={cn("h-4 w-4", isActive ? "text-indigo-700" : "text-slate-500")} />
                                        )}
                                        <span className="line-clamp-1">{content.title}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
