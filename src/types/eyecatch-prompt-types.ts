// Eye-catch Prompt Generator Types

export type ImageStyle = 'photorealistic' | 'minimal' | 'vibrant' | 'professional' | 'anime' | '3d-render' | 'cyberpunk';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '3:2' | '2:1';

export const IMAGE_STYLE_OPTIONS: { value: ImageStyle; label: string; description: string }[] = [
    { value: 'photorealistic', label: 'フォトリアル (写真)', description: 'High-quality photography, 8k resolution, realistic lighting, sharp focus' },
    { value: 'minimal', label: 'ミニマリスト (シンプル)', description: 'Clean, flat design, vector art, simple composition, soft colors' },
    { value: 'vibrant', label: 'ビビッド (鮮やか)', description: 'Bright, colorful, energetic, digital illustration style' },
    { value: 'professional', label: 'プロフェッショナル (ビジネス)', description: 'Corporate, trustworthy, balanced lighting, high-end commercial look' },
    { value: 'anime', label: 'アニメ風 (Niji)', description: 'Japanese anime style, cel shaded, highly detailed, Makoto Shinkai style lighting' },
    { value: '3d-render', label: '3Dレンダー (Octane)', description: '3D graphics, Octane Render, Unreal Engine 5, clay or plastic texture, isometric' },
    { value: 'cyberpunk', label: 'サイバーパンク (未来)', description: 'Neon lights, futuristic city, dark atmosphere, high contrast' },
];

export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; description: string }[] = [
    { value: '16:9', label: '16:9', description: 'YouTube・ブログ横長（推奨）' },
    { value: '4:3', label: '4:3', description: 'スタンダード横長' },
    { value: '3:2', label: '3:2', description: '写真比率' },
    { value: '2:1', label: '2:1', description: 'Twitter OGP' },
    { value: '1:1', label: '1:1', description: 'Instagram正方形' },
    { value: '9:16', label: '9:16', description: 'ストーリーズ・縦長' },
];

export interface ExtractedEyecatch {
    index: number;
    description: string;        // 抽出された説明
    sectionTitle?: string;      // H2セクションのタイトル
    surroundingContext?: string; // 周囲の文脈
}

export interface GeneratedPrompt {
    index: number;
    originalDescription: string;
    detailedPrompt: string;
    style: ImageStyle;
    aspectRatio: AspectRatio;
}

// 新しいインターフェースを追加
export interface StyleOption {
    id: string;
    label: string;
    description: string;
    thumbnailUrls: string[]; // このテーマに属する画像URL群
}

export interface AnalyzedMedia {
    imageUrl: string;
    images: { url: string }[]; // 取得した複数画像
    styleDescription: string;
    styleOptions?: StyleOption[];
}

export interface EyecatchPromptState {
    step: 1 | 2 | 3;
    htmlInput: string;
    extractedEyecatches: ExtractedEyecatch[];
    selectedStyle: ImageStyle;
    selectedAspectRatio: AspectRatio;
    generatedPrompts: GeneratedPrompt[];
    mediaUrl?: string;
    analyzedMedia?: AnalyzedMedia;
    selectedStyleDescription?: string; // グローバルデフォルトのスタイル
    perEyecatchStyles: Record<number, string>; // index → styleDescription（個別テーマ選択）
}

export const initialEyecatchPromptState: EyecatchPromptState = {
    step: 1,
    htmlInput: '',
    extractedEyecatches: [],
    selectedStyle: 'photorealistic',
    selectedAspectRatio: '16:9',
    generatedPrompts: [],
    mediaUrl: '',
    perEyecatchStyles: {},
};
