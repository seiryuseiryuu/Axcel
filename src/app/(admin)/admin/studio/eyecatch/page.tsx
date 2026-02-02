"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function EyecatchPage() {
    return (
        <ToolPlaceholder
            title="ブログアイキャッチ作成"
            description="ブログ記事の内容を一目で伝え、クリック率を高めるアイキャッチ画像を生成"
            features={[
                "記事タイトルからの画像イメージ自動生成",
                "SEOキーワードを意識したテキスト配置",
                "ブログのトンマナに合わせたスタイル選択",
                "各SNSシェア時のOGPサイズ対応"
            ]}
            steps={[
                "記事タイトル・キーワード入力",
                "ブログのカテゴリ・雰囲気選択",
                "画像生成AIによるベース画像作成",
                "タイトルテキストの配置・装飾",
                "完成画像のダウンロード"
            ]}
        />
    );
}
