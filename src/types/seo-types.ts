// SEO Article Generator Types (v2 - Updated Workflow)

export type Intent = 'informational' | 'navigational' | 'commercial' | 'transactional';
export type Tone = 'polite' | 'casual' | 'professional';
export type ReaderLevel = 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced';

export interface InternalLink {
    title: string;
    url: string;
}

// Step 1: Reference Articles & Search Intent Analysis
export interface ReferenceArticle {
    url: string;
    title: string;
    content: string;
    h2Sections: H2Analysis[];
}

export interface SearchIntentAnalysis {
    searchIntent: Intent;
    evidence: string;
    searcherSituation: string;
    expectedInformation: string[];
    requiredTopics: string[];
}

// Step 2: Article Structure Analysis (H2-level)
export interface H2Analysis {
    h2Text: string;
    h3List: string[];
    providedValue: string;
    readerQuestionAnswered: string;
    keywordPlacement: string;
}

export interface TitleAnalysis {
    segments: string[];
    wordOrderIntent: string;
    attractiveElements: string;
    clickReason: string;
}

export interface ArticleStructureAnalysis {
    titleAnalysis: TitleAnalysis;
    h2Analyses: H2Analysis[];
    usedData: {
        statistics: string[];
        examples: string[];
    };
    ctaAnalysis: {
        placements: string[];
        content: string;
    };
}

// Step 3: Reader Analysis (with Introduction Interest Focus)
export interface ReaderAnalysis {
    level: ReaderLevel;
    levelEvidence: string;
    psychologyAtSearch: string;
    painPoints: string[];
    expectedOutcome: string;
    introductionInterest: {
        clickReason: string;
        interestPoints: string[];
        continueReadingElements: string;
        bounceRiskAndSolution: string;
    };
    informationLiteracy: {
        alreadyKnown: string[];
        seekingNew: string[];
    };
    persona: {
        ageGroup: string;
        occupation: string;
        situation: string;
    };
}

// Step 4: Improvements (Axis-based table format)
export interface ContentAxis {
    axis: string;  // 抽象化された内容軸
    competitorContent: string[];  // 競合記事がこの軸で提供している内容（SEO順）
    suggestedAddition: string;  // 追加すべき内容
    suggestedRemoval: string;  // 削除すべき内容
}

export interface ImprovementSuggestions {
    axes?: ContentAxis[];  // 5-8 content axes
    // For backward compatibility
    additions?: string[];
    removals?: string[];
}

export interface SelectedImprovements {
    selectedAxes?: {
        axisIndex: number;
        additionSelected: boolean;
        removalSelected: boolean;
    }[];
    // For backward compatibility
    selectedAdditions?: number[];
    selectedRemovals?: number[];
}

// Step 5: Article Structure (Market-in approach)
export interface TitleCandidate {
    title: string;
    referenceElement: string;
    wordOrderIntent: string;
}

export interface OutlineSection {
    h2: string;
    estimatedWordCount: number;
    h3List: string[];
    sectionSummary: string;
    referenceH2Source: string;
}

export interface ArticleOutline {
    h1: string;
    titleCandidates: TitleCandidate[];
    selectedTitleIndex: number;
    sections: OutlineSection[];
    metaDescription: string;
}

// Step 6: Generated Content
export interface GeneratedArticle {
    content: string;
    wordCount: number;
    metaTitle: string;
    metaDescription: string;
    faqs: { question: string; answer: string }[];
}

// Main Workflow State
export interface SEOWorkflowState {
    step: 1 | 2 | 3 | 4 | 5 | 6;

    // Step 1 inputs
    primaryKeyword: string;
    secondaryKeywords: string;
    referenceUrls: string[];
    targetAudience: string;  // Optional - editable
    useWordCount: boolean;   // Whether to specify word count
    wordCountMin: number;    // Optional
    wordCountMax: number;    // Optional
    preferredStructure: string;
    tone: Tone;
    ctaLink: string;
    ctaText: string;
    // E-E-A-T fields (separated)
    authorName: string;
    authorTitle: string;
    authorProfile: string;

    // Internal Links Settings
    internalLinksUrl: string;
    internalLinks: InternalLink[];
    selectedInternalLinks: InternalLink[];

    // Step 1 outputs
    referenceArticles: ReferenceArticle[];
    searchIntentAnalysis: SearchIntentAnalysis | null;
    step1Confirmed: boolean;

    // Step 2 outputs
    structureAnalyses: ArticleStructureAnalysis[];
    step2Confirmed: boolean;

    // Step 3 outputs
    readerAnalysis: ReaderAnalysis | null;
    step3Confirmed: boolean;

    // Step 4 outputs
    improvements: ImprovementSuggestions | null;
    selectedImprovements: SelectedImprovements | null;
    step4Confirmed: boolean;

    // Step 5 outputs
    outline: ArticleOutline | null;
    step5Confirmed: boolean;

    // Step 6 outputs
    generatedContent: GeneratedArticle | null;
}

// API Request Types
export interface FetchTopArticlesRequest {
    keyword: string;
    count?: number;  // default 3
}

export interface SearchIntentRequest {
    primaryKeyword: string;
    referenceArticles: { title: string; h2List: string[] }[];
}

export interface StructureAnalysisRequest {
    articleTitle: string;
    articleContent: string;
}

export interface ReaderAnalysisRequest {
    primaryKeyword: string;
    articleSummary: string;
    searchIntentAnalysis: SearchIntentAnalysis | null;
}

export interface ImprovementsRequest {
    readerAnalysis: ReaderAnalysis;
    structureAnalyses: ArticleStructureAnalysis[];
}

export interface OutlineRequest {
    primaryKeyword: string;
    secondaryKeywords: string[];
    readerAnalysis: ReaderAnalysis;
    titleAnalysis: TitleAnalysis;
    h2Structure: H2Analysis[];
    selectedImprovements: SelectedImprovements;
    improvements: ImprovementSuggestions;
    wordCountMin: number;
    wordCountMax: number;
}

export interface DraftRequest {
    primaryKeyword: string;
    secondaryKeywords: string[];
    outline: ArticleOutline;
    readerAnalysis: ReaderAnalysis;
    tone: Tone;
    wordCountMin: number;
    wordCountMax: number;
    // E-E-A-T separated fields
    authorName?: string;
    authorTitle?: string;
    authorProfile?: string;
    ctaLink?: string;
    ctaText?: string;
    referenceArticles?: ReferenceArticle[];
    structureAnalyses?: ArticleStructureAnalysis[];
    internalLinks?: InternalLink[];  // 内部リンク（AIへの指示用）
}

// Search Intent Options
export const INTENT_OPTIONS: { value: Intent; label: string }[] = [
    { value: 'informational', label: 'Informational（情報を知りたい）' },
    { value: 'navigational', label: 'Navigational（特定サイトに行きたい）' },
    { value: 'commercial', label: 'Commercial（比較検討したい）' },
    { value: 'transactional', label: 'Transactional（購入・申込したい）' },
];

// Reader Level Options
export const READER_LEVEL_OPTIONS: { value: ReaderLevel; label: string }[] = [
    { value: 'absolute_beginner', label: '超初心者（全く情報収集していない）' },
    { value: 'beginner', label: '初心者（情報収集済み、行動し始め）' },
    { value: 'intermediate', label: '中級者（行動中、最適化を求める）' },
    { value: 'advanced', label: '上級者（結果あり、さらに上を目指す）' },
];

// Tone Options
export const TONE_OPTIONS: { value: Tone; label: string }[] = [
    { value: 'polite', label: '丁寧（です・ます調）' },
    { value: 'casual', label: 'カジュアル（親しみやすい）' },
    { value: 'professional', label: '専門的（権威性重視）' },
];

// Initial State
export const initialSEOState: SEOWorkflowState = {
    step: 1,
    primaryKeyword: '',
    secondaryKeywords: '',
    referenceUrls: [],
    targetAudience: '',
    useWordCount: false,
    wordCountMin: 3000,
    wordCountMax: 6000,
    preferredStructure: '',
    tone: 'polite',
    ctaLink: '',
    ctaText: '',
    // E-E-A-T fields
    authorName: '',
    authorTitle: '',
    authorProfile: '',
    referenceArticles: [],
    searchIntentAnalysis: null,
    step1Confirmed: false,
    structureAnalyses: [],
    step2Confirmed: false,
    readerAnalysis: null,
    step3Confirmed: false,
    improvements: null,
    selectedImprovements: null,
    step4Confirmed: false,
    outline: null,
    step5Confirmed: false,

    generatedContent: null,
    internalLinksUrl: '',
    internalLinks: [],
    selectedInternalLinks: [],
};
