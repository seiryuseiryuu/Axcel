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
    ChevronLeft, ChevronRight, Palette, Sparkles, Home, LogOut, Clock, Menu
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useToast } from "@/hooks/use-toast";

import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

interface ToolItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    isNew?: boolean;
    comingSoon?: boolean;
    isHistory?: boolean;
}

const tools: ToolItem[] = [
    // Content Tools
    { title: "SEO記事作成", href: "/studio/seo", icon: BookText, category: "content" },
    { title: "YouTube台本", href: "/studio/script", icon: Video, category: "content" },
    { title: "ショート動画台本", href: "/studio/short-script", icon: FileVideo, category: "content" },
    { title: "VSLライティング", href: "/studio/vsl-writing", icon: MonitorPlay, category: "content" },
    { title: "動画切り抜き分析", href: "/studio/video-clip", icon: Scissors, category: "content" },
    { title: "X・Threads投稿", href: "/studio/social-post", icon: Twitter, category: "content" },
    { title: "note文章", href: "/studio/note-writing", icon: FileText, category: "content" },
    { title: "セールスレター", href: "/studio/sales-letter", icon: Mail, category: "content" },
    { title: "LPライティング", href: "/studio/lp-writing", icon: Layout, category: "content" },

    // Image Tools
    { title: "YouTubeサムネイル", href: "/studio/thumbnail", icon: Image, category: "image" },
    { title: "アイキャッチプロンプト", href: "/studio/eyecatch-prompt", icon: Sparkles, category: "image" },
    { title: "インスタストーリーズ", href: "/studio/insta-story", icon: Instagram, category: "image" },
    { title: "LINEバナー", href: "/studio/line-banner", icon: MessageSquare, category: "image" },
    { title: "note/Brain/Tips", href: "/studio/note-thumbnail", icon: FileText, category: "image" },

    // Copywriting Tools
    // Strategy Tools
];

const categories = [
    { id: "content", label: "コンテンツ作成", icon: FileText },
    { id: "image", label: "画像作成", icon: Image },
];

interface StudioToolSidebarProps {
    activeTool: string;
    onToolChange: (toolHref: string) => void;
    allowedTools?: string[];  // Optional: limit to specific tool hrefs
    isAdmin?: boolean;
}

export function StudioToolSidebar({ activeTool, onToolChange, allowedTools, isAdmin }: StudioToolSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    // Show all tools, but mark non-allowed ones as "coming soon" for non-admins
    const displayTools = tools.map(t => ({
        ...t,
        // Mark as coming soon if not in allowed list and not already marked
        comingSoon: !isAdmin && allowedTools && !allowedTools.includes(t.href) ? true : t.comingSoon
    }));

    // Filter categories to only show those with available tools
    const activeCategories = categories.filter(c =>
        displayTools.some(t => t.category === c.id)
    );

    // Common Sidebar Content
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
                {(!collapsed || isMobile) && (
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                            <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Accel</span>
                    </div>
                )}
                {!isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                )}
            </div>

            {/* Tools List */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-6">
                    {activeCategories.map((category) => (
                        <div key={category.id}>
                            {(!collapsed || isMobile) && (
                                <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                                    <category.icon className="w-3 h-3 opacity-70" />
                                    {category.label}
                                </div>
                            )}
                            <div className="space-y-1">
                                {displayTools.filter((t: typeof tools[number]) => t.category === category.id).map((tool: typeof tools[number]) => {
                                    const isActive = activeTool === tool.href;

                                    if (tool.comingSoon) {
                                        return (
                                            <Button
                                                key={tool.href}
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start h-10 text-sm transition-all duration-200 text-muted-foreground hover:text-foreground",
                                                    (collapsed && !isMobile) && "justify-center px-0"
                                                )}
                                                title={(collapsed && !isMobile) ? tool.title : undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    toast({
                                                        title: "準備中",
                                                        description: `${tool.title}機能は現在開発中です。`,
                                                    });
                                                }}
                                            >
                                                <tool.icon className={cn(
                                                    "h-4 w-4 flex-shrink-0 transition-colors mr-3 opacity-70",
                                                    (collapsed && !isMobile) && "mr-0"
                                                )} />
                                                {(!collapsed || isMobile) && (
                                                    <span className="truncate flex-1 text-left flex items-center justify-between">
                                                        {tool.title}
                                                        <span className="text-[9px] bg-muted-foreground/20 px-1.5 py-0.5 rounded text-muted-foreground ml-2">
                                                            Soon
                                                        </span>
                                                    </span>
                                                )}
                                            </Button>
                                        );
                                    }

                                    return (
                                        <Button
                                            key={tool.href}
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start h-10 text-sm transition-all duration-200",
                                                (collapsed && !isMobile) && "justify-center px-0",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 font-medium"
                                                    : "hover:bg-muted text-foreground/80 hover:text-foreground"
                                            )}
                                            title={(collapsed && !isMobile) ? tool.title : undefined}
                                            onClick={() => {
                                                onToolChange(tool.href);
                                                if (isMobile) {
                                                    setIsOpen(false);
                                                }
                                            }}
                                        >
                                            <tool.icon className={cn(
                                                "h-4 w-4 flex-shrink-0 transition-colors",
                                                (collapsed && !isMobile) ? "mr-0" : "mr-3",
                                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                            )} />
                                            {(!collapsed || isMobile) && (
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
                                (collapsed && !isMobile) && "justify-center px-2"
                            )}
                            title="ユーザー管理"
                        >
                            <Home className="h-3.5 w-3.5 flex-shrink-0" />
                            {(!collapsed || isMobile) && <span className="ml-2">ユーザー管理</span>}
                        </Button>
                    </Link>
                )}

                <form action={signOut}>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted",
                            (collapsed && !isMobile) && "justify-center px-2"
                        )}
                        title="ログアウト"
                        type="submit"
                    >
                        <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
                        {(!collapsed || isMobile) && <span className="ml-2">ログアウト</span>}
                    </Button>
                </form>

                {(!collapsed || isMobile) && (
                    <div className="text-[10px] text-muted-foreground text-center pt-1">
                        {displayTools.filter((t: typeof tools[number]) => !t.comingSoon).length}個の利用可能AIツール
                    </div>
                )}
            </div>

            {/* History Link (Fixed at bottom) */}
            <div className="p-2 border-t">
                <Link href="/student/history" passHref>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start h-10 text-sm transition-all duration-200 hover:bg-muted font-medium text-foreground/80",
                            (collapsed && !isMobile) && "justify-center px-0"
                        )}
                        title="生成履歴"
                        onClick={() => {
                            if (isMobile) setIsOpen(false);
                        }}
                    >
                        <Clock className={cn("h-4 w-4 flex-shrink-0 mr-3", (collapsed && !isMobile) && "mr-0")} />
                        {(!collapsed || isMobile) && <span>生成履歴</span>}
                    </Button>
                </Link>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar (Left Fixed) - Hidden on Mobile */}
            <div className={cn(
                "hidden md:flex flex-col border-r border-border/40 bg-background/95 backdrop-blur-xl transition-all duration-300 rounded-l-xl shadow-sm z-50 h-[calc(100vh-2rem)] my-4 ml-4",
                collapsed ? "w-16" : "w-64"
            )}>
                <SidebarContent />
            </div>

            {/* Mobile Trigger (Floating Hamburger) - Visible only on Mobile */}
            <div className="md:hidden fixed bottom-4 left-4 z-50">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full shadow-lg bg-background/80 backdrop-blur-md border-primary/20">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[280px]">
                        <SidebarContent isMobile={true} />
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}

export { tools };
