"use client";

import { LineBannerWorkflow } from "@/components/features/studio/LineBannerWorkflow";

export default function LineBannerPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">LINEバナー作成ツール</h1>
            <LineBannerWorkflow />
        </div>
    );
}
