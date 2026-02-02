"use client";

import { ShortScriptWorkflow } from "@/components/features/studio/ShortScriptWorkflow";

export default function ShortScriptPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">ショート動画台本作成ツール</h1>
            <ShortScriptWorkflow />
        </div>
    );
}
