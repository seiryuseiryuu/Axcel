"use client";

import { CopywritingWorkflow } from "@/components/features/studio/CopywritingWorkflow";
import {
    analyzeLpStructure,
    analyzeLpCustomer,
    analyzeLpDeep,
    writeLpCopy
} from "@/app/actions/lpWriting";

export default function LpWritingPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">LPライティングツール</h1>
            <CopywritingWorkflow
                toolName="LPライティング"
                actions={{
                    analyzeStructure: analyzeLpStructure,
                    analyzeCustomer: analyzeLpCustomer,
                    analyzeDeep: analyzeLpDeep,
                    generateCopy: writeLpCopy
                }}
                defaultProductInfo={`商品名：\n価格：\nターゲット：\n特徴：`}
            />
        </div>
    );
}
