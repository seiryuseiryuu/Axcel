"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BookText, Video, Image, Cpu, ImagePlus, FileVideo,
    Twitter, Instagram, Presentation, MessageSquare, FileText,
    Mail, Layout, MonitorPlay, Package, GitBranch, Scissors,
    ChevronLeft, ChevronRight, Palette, Sparkles, Home, LogOut
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

interface ToolItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    isNew?: boolean;
}

const tools: ToolItem[] = [
    // Content Tools
    { title: "SEO記事作成", href: "/studio/seo", icon: BookText, category: "content" },
    { title: "YouTube台本", href: "/studio/script", icon: Video, category: "content" },
    { title: "ショート動画台本", href: "/studio/short-script", icon: FileVideo, category: "content" },
    { title: "動画切り抜き分析", href: "/studio/video-clip", icon: Scissors, category: "content", isNew: true },
    { title: "X・Threads投稿", href: "/studio/social-post", icon: Twitter, category: "content" },
    { title: "note文章", href: "/studio/note-writing", icon: FileText, category: "content" },
    { title: "プレゼン資料", href: "/studio/presentation", icon: Presentation, category: "content" },

    // Image Tools
    { title: "YouTubeサムネイル", href: "/studio/thumbnail", icon: Image, category: "image" },
    { title: "ブログアイキャッチ", href: "/studio/eyecatch", icon: ImagePlus, category: "image" },
    { title: "インスタストーリーズ", href: "/studio/insta-story", icon: Instagram, category: "image" },
    { title: "LINEバナー", href: "/studio/line-banner", icon: MessageSquare, category: "image" },
    { title: "note/Brain/Tips", href: "/studio/note-thumbnail", icon: FileText, category: "image" },

    // Copywriting Tools
    { title: "セールスレター", href: "/studio/sales-letter", icon: Mail, category: "copy" },
    { title: "LPライティング", href: "/studio/lp-writing", icon: Layout, category: "copy" },
    { title: "VSLライティング", href: "/studio/vsl-writing", icon: MonitorPlay, category: "copy" },

    // Strategy Tools
    { title: "商品設計", href: "/studio/product-design", icon: Package, category: "strategy" },
    { title: "ファネル設計", href: "/studio/funnel-design", icon: GitBranch, category: "strategy" },
    { title: "カリキュラム作成", href: "/studio/curriculum", icon: Cpu, category: "strategy" },
];

const categories = [
    { id: "content", label: "コンテンツ作成", icon: FileText },
    { id: "image", label: "画像作成", icon: Image },
    { id: "copy", label: "コピーライティング", icon: Mail },
    { id: "strategy", label: "戦略設計", icon: Package },
];

interface StudioToolSidebarProps {
    activeTool: string;
    onToolChange: (toolHref: string) => void;
    allowedTools?: string[];  // Optional: limit to specific tool hrefs
    isAdmin?: boolean;
}

export function StudioToolSidebar({ activeTool, onToolChange, allowedTools, isAdmin }: StudioToolSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);

    // Filter tools if allowedTools is specified
    const filteredTools = allowedTools
        ? tools.filter(t => allowedTools.includes(t.href))
        : tools;

    // Filter categories to only show those with available tools
    const activeCategories = categories.filter(c =>
        filteredTools.some(t => t.category === c.id)
    );

    return (
        <div className={cn(
            "border-r border-border/40 bg-background/95 backdrop-blur-xl flex flex-col transition-all duration-300 rounded-l-xl shadow-sm z-50",
            collapsed ? "w-16" : "w-64"
        )}>
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                            <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">AI Studio</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* Tools List */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-6">
                    {activeCategories.map((category) => (
                        <div key={category.id}>
                            {!collapsed && (
                                <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                                    <category.icon className="w-3 h-3 opacity-70" />
                                    {category.label}
                                </div>
                            )}
                            <div className="space-y-1">
                                {filteredTools.filter(t => t.category === category.id).map((tool) => {
                                    const isActive = activeTool === tool.href;
                                    return (
                                        <Button
                                            key={tool.href}
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start h-10 text-sm transition-all duration-200",
                                                collapsed && "justify-center px-0",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 font-medium"
                                                    : "hover:bg-muted text-foreground/80 hover:text-foreground"
                                            )}
                                            title={collapsed ? tool.title : undefined}
                                            onClick={() => onToolChange(tool.href)}
                                        >
                                            <tool.icon className={cn(
                                                "h-4 w-4 flex-shrink-0 transition-colors",
                                                collapsed ? "mr-0" : "mr-3",
                                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                            )} />
                                            {!collapsed && (
                                                <span className="truncate flex-1 text-left flex items-center justify-between">
                                                    {tool.title}
                                                    {tool.isNew && (
                                                        <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-sm ml-2">
                                                            NEW
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer / Admin Link */}
            <div className="p-2 border-t space-y-1">
                {isAdmin && (
                    <Link href="/admin/users" passHref>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50",
                                collapsed && "justify-center px-2"
                            )}
                            title="ユーザー管理"
                        >
                            <Home className="h-3.5 w-3.5 flex-shrink-0" />
                            {!collapsed && <span className="ml-2">ユーザー管理</span>}
                        </Button>
                    </Link>
                )}

                <form action={signOut}>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted",
                            collapsed && "justify-center px-2"
                        )}
                        title="ログアウト"
                        type="submit"
                    >
                        <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
                        {!collapsed && <span className="ml-2">ログアウト</span>}
                    </Button>
                </form>

                {!collapsed && (
                    <div className="text-[10px] text-muted-foreground text-center pt-1">
                        {filteredTools.length}個のAIツール
                    </div>
                )}
            </div>
        </div>
    );
}

export { tools };
