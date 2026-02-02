"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function ProductDesignPage() {
    return (
        <ToolPlaceholder
            title="商品・サービス設計ツール"
            description="売れる商品コンセプトの立案から、具体的なサービス内容の設計までをサポート"
            features={[
                "3C分析（自社・競合・顧客）に基づくポジショニング",
                "USP（独自の強み）の言語化",
                "商品パッケージ（松竹梅プラン）の設計",
                "提供価値とベネフィットの整理"
            ]}
            steps={[
                "市場・ターゲット・競合の状況入力",
                "独自の強み・リソースの棚卸し",
                "商品コンセプトのブレインストーミング",
                "サービス詳細・価格帯の設計",
                "商品コンセプトシートの出力"
            ]}
        />
    );
}
