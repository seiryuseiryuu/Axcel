// Eye-catch Prompt Generator Types

export type ImageStyle = 'photorealistic' | 'illustration' | 'anime' | 'watercolor' | '3d_render' | 'minimal' | 'flat_design';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '3:2' | '2:1';

export const IMAGE_STYLE_OPTIONS: { value: ImageStyle; label: string; description: string }[] = [
    { value: 'photorealistic', label: 'フォトリアル', description: '実写のような高品質な画像' },
    { value: 'illustration', label: 'イラスト', description: 'デジタルイラスト風' },
    { value: 'anime', label: 'アニメ調', description: '日本のアニメ風スタイル' },
    { value: 'watercolor', label: '水彩画', description: '柔らかい水彩画風' },
    { value: '3d_render', label: '3Dレンダー', description: '3DCG風のレンダリング' },
    { value: 'minimal', label: 'ミニマル', description: 'シンプルでクリーンなデザイン' },
    { value: 'flat_design', label: 'フラットデザイン', description: 'モダンなフラットスタイル' },
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
}

export interface AnalyzedMedia {
    imageUrl: string;
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
    selectedStyleDescription?: string; // 選択されたスタイルオプションの説明
}

export const initialEyecatchPromptState: EyecatchPromptState = {
    step: 1,
    htmlInput: '',
    extractedEyecatches: [],
    selectedStyle: 'photorealistic',
    selectedAspectRatio: '16:9',
    generatedPrompts: [],
    mediaUrl: '',
};
