"use client";

import { CopywritingWorkflow } from "@/components/features/studio/CopywritingWorkflow";
import {
    analyzeSalesStructure,
    analyzeSalesCustomer,
    analyzeSalesDeep,
    writeSalesLetter
} from "@/app/actions/salesLetter";

export default function SalesLetterPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">セールスレター作成ツール</h1>
            <CopywritingWorkflow
                toolName="セールスレター"
                actions={{
                    analyzeStructure: analyzeSalesStructure,
                    analyzeCustomer: analyzeSalesCustomer,
                    analyzeDeep: analyzeSalesDeep,
                    generateCopy: writeSalesLetter
                }}
                defaultProductInfo={`商品名：\n価格：\nターゲット：\n悩み：`}
            />
        </div>
    );
}
