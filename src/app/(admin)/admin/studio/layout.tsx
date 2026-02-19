"use client";

import { useState } from "react";
import { StudioSidebar } from "@/components/features/studio/StudioSidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-8">
            {/* Desktop Sidebar - always visible on md+ screens */}
            <div className="hidden md:block">
                <StudioSidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Sidebar */}
                    <div className="absolute left-0 top-0 h-full z-50">
                        <StudioSidebar />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    {children}
                </div>
            </main>

            {/* Mobile Hamburger Button - Fixed Bottom Left */}
            <Button
                variant="default"
                size="icon"
                className={cn(
                    "fixed bottom-4 left-4 z-50 md:hidden h-14 w-14 rounded-full shadow-lg",
                    isMobileMenuOpen && "bg-destructive hover:bg-destructive/90"
                )}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <Menu className="h-6 w-6" />
                )}
            </Button>
        </div>
    );
}
