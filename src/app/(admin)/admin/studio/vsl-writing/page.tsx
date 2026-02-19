"use client";

import { VSLWorkflow } from "@/components/features/studio/VSLWorkflow";

export default function VSLWritingPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">VSLライティングツール</h1>
            <VSLWorkflow />
        </div>
    );
}
