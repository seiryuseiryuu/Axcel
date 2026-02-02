"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function PresentationPage() {
    return (
        <ToolPlaceholder
            title="プレゼン資料構成ツール"
            description="セミナーや営業で使用するプレゼンテーション資料の構成（スライド割）を作成"
            features={[
                "聴衆を動かすストーリーテリング",
                "スライドごとのキーメッセージ作成",
                "図解・グラフの挿入提案",
                "台本（スクリプト）の同時生成"
            ]}
            steps={[
                "プレゼンの目的・聴衆・ゴールの設定",
                "全体の流れ（起承転結）の設計",
                "スライド割り（コンテ）の作成",
                "各スライドの具体的な内容入力",
                "構成案・台本の出力"
            ]}
        />
    );
}
