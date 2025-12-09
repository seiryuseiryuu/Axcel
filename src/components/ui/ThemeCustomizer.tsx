"use client";

import * as React from "react";
import { Moon, Sun, Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ThemeCustomizer() {
    const { theme, setTheme } = useTheme();
    const [color, setColor] = useState("ocean");

    // Apply color class to body
    useEffect(() => {
        const body = document.body;
        body.classList.remove("theme-violet", "theme-ocean", "theme-neon");
        if (color && color !== "default") {
            body.classList.add(`theme-${color}`);
        }
    }, [color]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-primary/20">
                    <Palette className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all text-primary" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 glass">
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                    {theme === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                    {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setColor("violet")}>
                    <div className="mr-2 h-4 w-4 rounded-full bg-violet-600 border border-white/20"></div> Violet (Default)
                    {color === "violet" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setColor("ocean")}>
                    <div className="mr-2 h-4 w-4 rounded-full bg-sky-500 border border-white/20"></div> Ocean
                    {color === "ocean" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setColor("neon")}>
                    <div className="mr-2 h-4 w-4 rounded-full bg-pink-600 border border-white/20"></div> Cyber Neon
                    {color === "neon" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
