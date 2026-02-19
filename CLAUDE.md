# CLAUDE.md - SkillPlus AI Studio 開発ルール

## プロジェクト概要

SkillPlus は AI Creation Studio を中心としたフルスタック学習プラットフォーム（PWA）。
AI ツール群（17 種）をスタジオダッシュボード上で提供する。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict: false, ignoreBuildErrors: true) |
| Styling | Tailwind CSS v4 + CSS Variables |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (SSR) |
| UI | Radix UI primitives + Lucide React + Framer Motion |
| AI | Google Gemini (`@google/generative-ai`) |
| Video | Mux, YouTube transcript parsing |
| Deploy | Vercel (project: `ai-monetize-souken`) + GitHub |
| PWA | next-pwa (Service Worker) |

---

## プロジェクト構造

```
src/
├── app/
│   ├── (admin)/admin/          # 管理者・講師ルート
│   │   └── studio/             # ★ AI スタジオツール群（17 tools）
│   │       ├── page.tsx        # スタジオダッシュボード
│   │       ├── layout.tsx      # スタジオ共通レイアウト
│   │       ├── seo/            # SEO記事作成
│   │       ├── thumbnail/      # YouTubeサムネイル作成
│   │       ├── script/         # YouTube台本制作
│   │       ├── vsl-writing/    # VSLライティング
│   │       ├── video-clip/     # 動画切り抜き分析
│   │       ├── note-writing/   # note記事作成
│   │       ├── lp-writing/     # LPライティング
│   │       ├── short-script/   # ショート動画台本
│   │       ├── social-post/    # X・Threads投稿
│   │       ├── sales-letter/   # セールスレター
│   │       ├── note-thumbnail/ # note・Brain・Tips サムネイル
│   │       ├── eyecatch/       # ブログアイキャッチ
│   │       ├── insta-story/    # インスタストーリーズ
│   │       ├── line-banner/    # LINEバナー
│   │       ├── presentation/   # プレゼン資料
│   │       ├── funnel-design/  # マーケティングファネル
│   │       └── product-design/ # 商品・サービス設計
│   ├── (student)/              # 受講者ルート
│   ├── actions/                # ★ Server Actions（24 files）
│   │   ├── studio.ts           # 汎用スタジオアクション
│   │   ├── vslWriting.ts       # VSL専用アクション
│   │   ├── videoClip.ts        # 動画切り抜き専用アクション
│   │   ├── noteWriting.ts      # note記事専用アクション
│   │   ├── lpWriting.ts        # LP専用アクション
│   │   ├── thumbnail.ts        # サムネイル生成アクション
│   │   ├── scriptWorkflow.ts   # YouTube台本アクション
│   │   └── ...                 # 他ツール別アクション
│   └── api/                    # API Routes
│       ├── ai/                 # AI生成エンドポイント
│       ├── seo/                # SEO関連API
│       └── stream-thumbnail/   # サムネイルストリーミング
├── components/
│   ├── features/studio/        # ★ スタジオワークフローコンポーネント（19 files）
│   │   ├── VSLWorkflow.tsx
│   │   ├── VideoClipWorkflow.tsx
│   │   ├── NoteWritingWorkflow.tsx
│   │   ├── LPWorkflow.tsx
│   │   ├── ThumbnailWorkflow.tsx
│   │   ├── SEOWorkflow.tsx
│   │   ├── YouTubeScriptWorkflow.tsx
│   │   ├── StudioSidebar.tsx
│   │   ├── StudioToolSidebar.tsx
│   │   └── ...
│   ├── ui/                     # 共通UIコンポーネント（22 files）
│   └── layout/                 # レイアウトコンポーネント
├── lib/
│   ├── gemini.ts               # Gemini AI クライアント
│   ├── youtube.ts              # YouTube関連ユーティリティ
│   ├── supabase/               # Supabase クライアント（client/server/admin）
│   ├── auth/                   # 認証・RBAC
│   └── ai/                     # AI プロバイダー抽象化
├── types/                      # 型定義ファイル
│   ├── database.ts
│   ├── seo-types.ts
│   └── eyecatch-prompt-types.ts
└── middleware.ts                # 認証ミドルウェア

新要件定義書/                     # ★ 新規ツールの要件定義書
├── VSLライティング要件定義
├── 動画切り抜き分析ツール要件定義
├── note記事作成ツール要件定義/
└── LPライティングツール要件定義/

supabase/
├── migrations/                  # DBスキーマ マイグレーション
└── policies/                    # RLSポリシー
```

---

## ★★★ コーディング前の必須プロトコル ★★★

### 変更対象の事前明示

**コードを書く前に、必ず以下のフォーマットで変更計画を提示し、ユーザーの承認を得ること。**

```
## 変更計画

### 対象ファイル一覧

| # | ファイル | 操作 | 変更内容の概要 |
|---|---------|------|--------------|
| 1 | `src/app/actions/xxxxx.ts` | 新規作成 | ○○ツール用のServer Action |
| 2 | `src/components/features/studio/XxxWorkflow.tsx` | 新規作成 | ○○ツールのワークフローUI |
| 3 | `src/app/(admin)/admin/studio/xxx/page.tsx` | 新規作成 | ○○ツールのページ |
| 4 | `src/components/features/studio/StudioSidebar.tsx` | 修正 | サイドバーに○○ツールを追加 |
| 5 | `src/app/(admin)/admin/studio/page.tsx` | 修正 | ダッシュボードにカード追加 |

### 各ファイルの詳細変更内容

#### 1. `src/app/actions/xxxxx.ts`【新規作成】
- 関数: `generateXxx()` - メインの生成ロジック
- 関数: `analyzeXxx()` - 分析ロジック
- 使用AI: Gemini Pro / Flash
- 入力: { ... }
- 出力: { ... }

#### 2. `src/components/features/studio/XxxWorkflow.tsx`【新規作成】
- ステップ構成: STEP1 → STEP2 → ... 
- 状態管理: useState / zustand
- 要件定義書「○○ツール要件定義」に準拠

#### 3. `src/app/(admin)/admin/studio/xxx/page.tsx`【新規作成】
- XxxWorkflow をインポートして表示

#### 4. `src/components/features/studio/StudioSidebar.tsx`【修正】
- 変更箇所: toolsConfig 配列に新ツールを追加
- 変更前: （該当行を表示）
- 変更後: （変更後のコードを表示）

#### 5. `src/app/(admin)/admin/studio/page.tsx`【修正】
- 変更箇所: ツールカード一覧に追加
- 変更前: （該当行を表示）
- 変更後: （変更後のコードを表示）
```

### 事前確認チェックリスト

コードを書き始める前に以下を確認する：

- [ ] 要件定義書を読み込んだか？（`新要件定義書/` or ルートの `.txt` ファイル）
- [ ] 既存の類似ツールのコードを参考に確認したか？
- [ ] 変更計画をユーザーに提示し、承認を得たか？
- [ ] 新規ファイルのパスに誤りがないか？
- [ ] 既存ファイルの修正箇所を正確に特定したか？

---

## 新規ツール追加時の標準パターン

新しいスタジオツールを追加する場合、以下の 3〜5 ファイルを作成/修正する：

### 必須ファイル

1. **Server Action**: `src/app/actions/[toolName].ts`
   - `'use server'` ディレクティブ必須
   - Gemini API 呼び出しは `src/lib/gemini.ts` を使用
   - 型安全な入出力定義
   - エラーハンドリング必須

2. **ワークフローコンポーネント**: `src/components/features/studio/[ToolName]Workflow.tsx`
   - `'use client'` ディレクティブ必須
   - ステップベースのUI（要件定義書のフローに準拠）
   - 各ステップでユーザー確認を挟む設計
   - ローディング状態・エラー表示を含む
   - Markdown レンダリングには `react-markdown` + `remark-gfm` を使用

3. **ページ**: `src/app/(admin)/admin/studio/[tool-slug]/page.tsx`
   - ワークフローコンポーネントをインポートして表示
   - ルートセグメントはケバブケース

### 修正ファイル

4. **サイドバー**: `src/components/features/studio/StudioSidebar.tsx` or `StudioToolSidebar.tsx`
   - ツール一覧への追加

5. **ダッシュボード**: `src/app/(admin)/admin/studio/page.tsx`
   - ツールカードの追加

---

## コーディング規約

### ファイル命名

| 種別 | 規則 | 例 |
|------|------|-----|
| Server Action | camelCase.ts | `vslWriting.ts` |
| Workflow Component | PascalCase.tsx | `VSLWorkflow.tsx` |
| Page Route | kebab-case/ | `vsl-writing/page.tsx` |
| UI Component | PascalCase.tsx | `Button.tsx` |
| Type File | kebab-case.ts | `seo-types.ts` |

### コンポーネント作成ルール

```typescript
// ✅ 正しい: 'use client' は先頭に
'use client'

import { useState } from 'react'
// UI は src/components/ui/ から
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// アクションは src/app/actions/ から
import { generateXxx } from '@/app/actions/xxxxx'

export default function XxxWorkflow() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  // ...
}
```

### Server Action ルール

```typescript
// ✅ 正しい: 'use server' は先頭に
'use server'

import { generateWithGemini } from '@/lib/gemini'

export async function generateXxx(input: XxxInput): Promise<XxxOutput> {
  try {
    // Gemini呼び出し
    const result = await generateWithGemini(prompt, 'gemini-2.0-flash')
    return { success: true, data: result }
  } catch (error) {
    console.error('[generateXxx] Error:', error)
    return { success: false, error: String(error) }
  }
}
```

### 使用禁止 / 注意事項

- ❌ `console.log` を本番コードに残さない（`console.error` は OK）
- ❌ ハードコードされた API キー
- ❌ `any` 型の乱用（最小限に留める）
- ⚠️ Server Action の `bodySizeLimit` は `5mb`（`next.config.ts` で設定済み）
- ⚠️ `typescript.ignoreBuildErrors: true` が有効（型エラーでもビルドは通る）

---

## デプロイワークフロー

### 修正完了後の標準手順

コード修正が完了したら、以下の順序でデプロイする：

#### 1. ローカルビルド確認

```bash
npm run build
```

ビルドエラーがないことを確認する。警告は許容。

#### 2. Git コミット & プッシュ

```bash
git add -A
git commit -m "feat: [ツール名] - [変更概要]"
git push origin main
```

**コミットメッセージ規約:**

| プレフィックス | 用途 |
|-------------|------|
| `feat:` | 新機能追加 |
| `fix:` | バグ修正 |
| `refactor:` | リファクタリング |
| `style:` | UI/スタイル修正 |
| `docs:` | ドキュメント更新 |

#### 3. Vercel デプロイ

```bash
vercel --prod
```

**Vercel プロジェクト情報:**
- Project Name: `ai-monetize-souken`
- Project ID: `prj_aD6x9A2FnP7ioLmxZyGfEPagBkAu`
- Org ID: `team_xr0OpkoIV0pqbiCpUfAmddPZ`

#### 4. デプロイ後の確認事項

- [ ] Vercel ダッシュボードでビルド成功を確認
- [ ] 本番URLで該当ツールが動作することを確認
- [ ] エラーログ（Vercel Functions）に異常がないことを確認

---

## 環境変数

必要な環境変数（`.env.local`）：

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー |
| `GEMINI_API_KEY` | Google Gemini API キー |
| `MUX_TOKEN_ID` | Mux トークンID |
| `MUX_TOKEN_SECRET` | Mux トークンシークレット |
| `TAVILY_API_KEY` | Tavily 検索API キー |

---

## 要件定義書の場所

新規ツール開発時、要件定義書は以下の場所にある：

- `新要件定義書/` ディレクトリ内（最新版）
- プロジェクトルートの `*要件定義.txt` ファイル（初期版）

**必ず要件定義書を読んでからコーディングを開始すること。**

---

## トラブルシューティング

| 問題 | 対処 |
|------|------|
| ビルド時の型エラー | `next.config.ts` で `ignoreBuildErrors: true` が有効。致命的でなければ無視可 |
| Turbopack エラー | `npm run dev --webpack` / `npm run build --webpack` を使用 |
| Server Action 413 | `bodySizeLimit: '5mb'` を超えていないか確認 |
| Vercel タイムアウト | Gemini API の応答時間を確認。必要に応じてストリーミングに切替 |
| YouTube 文字起こし失敗 | `youtube-transcript` と `youtubei.js` の互換性を確認 |
