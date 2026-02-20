/**
 * JSONB content → editable text extraction / patch / context utility
 */

export type ContentInfo = {
  text: string;
  contentType: 'text' | 'script' | 'html';
  isEditable: boolean;
  contentPath: string; // 'root' | 'finalScript' | 'content'
}

export type GenerationContext = {
  label: string;
  value: string;
}

export function extractEditableText(content: any): ContentInfo {
  // String → directly editable
  if (typeof content === 'string') {
    return { text: content, contentType: 'text', isEditable: true, contentPath: 'root' };
  }

  if (typeof content === 'object' && content !== null) {
    // Scripts with finalScript
    if (content.finalScript) {
      return { text: content.finalScript, contentType: 'script', isEditable: true, contentPath: 'finalScript' };
    }

    // SEO article / structured content with title + content
    if (content.title && content.content) {
      return { text: content.content, contentType: 'html', isEditable: true, contentPath: 'content' };
    }

    // Video clip candidates → markdown text, editable
    if (content.clipCandidates) {
      const text = typeof content.clipCandidates === 'string'
        ? content.clipCandidates
        : JSON.stringify(content.clipCandidates, null, 2);
      return { text, contentType: 'text', isEditable: true, contentPath: 'clipCandidates' };
    }

    // Array of images → view only
    if (Array.isArray(content) && content.length > 0 && content[0]?.image) {
      return { text: '', contentType: 'text', isEditable: false, contentPath: 'root' };
    }

    // Fallback: JSON stringified, editable
    return { text: JSON.stringify(content, null, 2), contentType: 'text', isEditable: true, contentPath: 'root' };
  }

  return { text: String(content ?? ''), contentType: 'text', isEditable: false, contentPath: 'root' };
}

export function patchContent(original: any, newText: string, contentPath: string): any {
  if (contentPath === 'root') {
    // Try to parse as JSON if original was object
    if (typeof original === 'object' && original !== null && !Array.isArray(original)) {
      try {
        return JSON.parse(newText);
      } catch {
        return newText;
      }
    }
    return newText;
  }

  if (contentPath === 'finalScript') {
    return { ...original, finalScript: newText };
  }

  if (contentPath === 'content') {
    return { ...original, content: newText };
  }

  if (contentPath === 'clipCandidates') {
    return { ...original, clipCandidates: newText };
  }

  return newText;
}

/**
 * contentの中から生成時のコンテキスト情報（入力・分析結果等）を抽出
 * finalScript / content 等の「成果物本体」以外のフィールドを取り出す
 */
const CONTEXT_LABELS: Record<string, string> = {
  productInfo: '商品・サービス情報',
  productProfile: '商品プロファイル',
  structure: '構成分析',
  structureAnalysis: '構成分析',
  revisedStructure: '修正後の構成',
  viewerNeeds: '視聴者ニーズ分析',
  improvementData: '改善提案',
  persona: 'ペルソナ',
  target: 'ターゲット',
  theme: 'テーマ',
  category: 'カテゴリ',
  type: '種別',
  platform: 'プラットフォーム',
  referenceUrl: '参考URL',
  style: 'スタイル',
  finalOutline: 'アウトライン',
  selectedLength: '選択した尺',
  hearingResult: 'ヒアリング結果',
  lpStructure: 'LP構成',
  competitors: '競合分析',
  channelStyle: 'チャンネルスタイル',
  openingAnalysis: 'オープニング分析',
  keyword: 'キーワード',
  primaryKeyword: 'メインキーワード',
  articleType: '記事タイプ',
}

// These keys hold the "main content" — skip them as context
const CONTENT_KEYS = new Set([
  'finalScript', 'content', 'title', 'clipCandidates',
  'images', 'image', 'prompts', 'html',
])

export function extractGenerationContext(content: any): GenerationContext[] {
  if (typeof content !== 'object' || content === null || Array.isArray(content)) {
    return [];
  }

  const contexts: GenerationContext[] = [];

  for (const [key, value] of Object.entries(content)) {
    if (CONTENT_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;

    const label = CONTEXT_LABELS[key] || key;
    let display: string;

    if (typeof value === 'string') {
      display = value;
    } else {
      display = JSON.stringify(value, null, 2);
    }

    if (display.trim()) {
      contexts.push({ label, value: display });
    }
  }

  return contexts;
}

/**
 * RefinementAreaに渡すフルコンテキストを組み立て
 */
export function buildRefinementContext(content: any, projectTitle: string, projectType: string): any {
  if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
    return {
      ...content,
      _projectTitle: projectTitle,
      _projectType: projectType,
    };
  }
  return {
    _projectTitle: projectTitle,
    _projectType: projectType,
    originalContent: typeof content === 'string' ? content.slice(0, 2000) : undefined,
  };
}
