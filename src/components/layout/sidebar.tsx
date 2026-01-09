"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Menu,
    LayoutDashboard,
    Compass,
    Wand2,
    MessageSquare,
    BarChart,
    Sparkles,
    BookOpen,
    Users,
    ShieldCheck,
    FileText
} from "lucide-react";

interface SidebarProps {
    role: "admin" | "instructor" | "student";
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();

    const studentRoutes = [
        {
            label: "ホーム (Daily Plan)",
            icon: LayoutDashboard,
            href: "/dashboard",
            color: "text-primary",
        },
        {
            label: "AI制作スタジオ",
            icon: Wand2,
            href: "/studio",
            color: "text-primary",
        },
        {
            label: "AI副業コース一覧",
            icon: Compass,
            href: "/courses",
            color: "text-primary",
        },
        {
            label: "メンターチャット",
            icon: MessageSquare,
            href: "/chat",
            color: "text-primary",
        },
        {
            label: "収益化スキル進捗",
            icon: BarChart,
            href: "/progress",
            color: "text-primary",
        },
    ];

    const adminRoutes = [
        {
            label: "Accel",
            icon: Sparkles,
            href: "/admin/studio",
            color: "text-primary",
        },
        {
            label: "コース管理",
            icon: BookOpen,
            href: "/admin/courses",
            color: "text-primary",
        },
        {
            label: "受講生管理",
            icon: Users,
            href: "/admin/students",
            color: "text-primary",
        },
        {
            label: "講師管理",
            icon: ShieldCheck,
            href: "/admin/instructors",
            color: "text-primary",
        },
        {
            label: "文字起こし",
            icon: FileText,
            href: "/admin/transcripts",
            color: "text-primary",
        },
        {
            label: "監査ログ",
            icon: ShieldCheck,
            href: "/admin/audit",
            color: "text-primary",
        },
    ];

    const routes = role === "admin" ? adminRoutes : studentRoutes;

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-border">
            <div className="flex h-14 items-center border-b border-border px-6">
                <Link href="/" className="flex items-center gap-2 font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <span className="text-xl">S</span>
                    </div>
                    <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">スキルラボ</span>
                </Link>
            </div>
            <div className="flex flex-1 flex-col space-y-1 p-3">
                {routes.map((route) => (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "group/item flex w-full cursor-pointer justify-start rounded-lg p-3 text-sm font-medium transition-all duration-200",
                            pathname === route.href
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <div className="flex flex-1 items-center">
                            <route.icon className={cn("mr-3 h-5 w-5", pathname === route.href ? "text-primary-foreground" : route.color)} />
                            {route.label}
                        </div>
                    </Link>
                ))}
            </div>
            <div className="border-t border-border p-3">
                <div className="rounded-lg bg-secondary/50 p-4 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">
                        現在のロール: <span className="font-semibold text-foreground capitalize">{role}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export function MobileSidebar({ role }: SidebarProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-gray-900 border-gray-800 w-72">
                <Sidebar role={role} />
            </SheetContent>
        </Sheet>
    );
}
