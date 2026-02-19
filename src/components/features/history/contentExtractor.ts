/**
 * JSONB content → editable text extraction / patch utility
 */

export type ContentInfo = {
  text: string;
  contentType: 'text' | 'script' | 'html';
  isEditable: boolean;
  contentPath: string; // 'root' | 'finalScript' | 'content'
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

    // Video clip candidates → view only
    if (content.clipCandidates) {
      return { text: JSON.stringify(content, null, 2), contentType: 'text', isEditable: false, contentPath: 'root' };
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

  return newText;
}
