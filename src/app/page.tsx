"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />

      <FadeIn delay={0.2}>
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-10">
          <p className="fixed left-0 top-0 flex w-full justify-center border-b border-border bg-background/50 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-muted/50 lg:p-4">
            スキルラボ &nbsp;
            <code className="font-mono font-bold">Concept v1.0</code>
          </p>
        </div>
      </FadeIn>

      <div className="relative flex place-items-center flex-col gap-6 py-20 text-center z-10">
        <SlideIn direction="up" delay={0.4}>
          <div className="mb-4">
            <h1 className="text-6xl font-black tracking-tighter sm:text-8xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-cyan-400 animate-pulse">
              スキルラボ
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              AIスタジオを搭載した次世代の学習管理システム。<br />
              インタラクティブな学習体験を、ここから。
              <br />
              <span className="text-sm opacity-70">Powered by Google Deepmind Antigravity</span>
            </p>
          </div>
        </SlideIn>

        <SlideIn direction="up" delay={0.6}>
          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <Link href="/dashboard">
              <Button variant="default" size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/20 transition-transform hover:scale-105">
                学習を始める (ログイン/登録)
              </Button>
            </Link>
          </div>
        </SlideIn>
      </div>
    </div>
  );
}
