'use client'

import { useState, useTransition } from 'react'
import { Copy, Download, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { RefinementArea } from '@/components/features/studio/RefinementArea'
import { updateArtifactContent } from '@/app/actions/history'
import { useToast } from '@/hooks/use-toast'
import { extractEditableText, patchContent } from './contentExtractor'

interface HistoryContentViewerProps {
  project: any
  onContentSaved?: () => void
}

export function HistoryContentViewer({ project, onContentSaved }: HistoryContentViewerProps) {
  const artifact = project.generated_artifacts?.[0]
  const { toast } = useToast()
  const [isSaving, startSaveTransition] = useTransition()

  const content = artifact?.content
  const info = content != null ? extractEditableText(content) : null

  const [currentText, setCurrentText] = useState(info?.text ?? '')

  // Reset when project changes
  const [lastProjectId, setLastProjectId] = useState(project.id)
  if (project.id !== lastProjectId) {
    setLastProjectId(project.id)
    const newInfo = artifact?.content != null ? extractEditableText(artifact.content) : null
    setCurrentText(newInfo?.text ?? '')
  }

  if (!artifact) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        アーティファクトがありません
      </div>
    )
  }

  const isImageContent = Array.isArray(content) && content.length > 0 && content[0]?.image

  const handleCopy = () => {
    const textToCopy = info?.text || JSON.stringify(content, null, 2)
    navigator.clipboard.writeText(textToCopy)
    toast({ title: 'コピーしました' })
  }

  const handleDownload = () => {
    const textToDownload = currentText || info?.text || JSON.stringify(content, null, 2)
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.title || 'content'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    if (!info) return
    startSaveTransition(async () => {
      const patched = patchContent(content, currentText, info.contentPath)
      const result = await updateArtifactContent(artifact.id, patched)
      if (result.success) {
        toast({ title: '保存しました' })
        onContentSaved?.()
      } else {
        toast({ title: '保存に失敗しました', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{project.title}</h2>
          <p className="text-xs text-muted-foreground">
            {new Date(project.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1.5" />
            コピー
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" />
            DL
          </Button>
          {info?.isEditable && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              保存
            </Button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isImageContent ? (
          <div className="grid grid-cols-2 gap-4">
            {(content as any[]).map((item: any, idx: number) => (
              <div key={idx} className="rounded-lg overflow-hidden border">
                {item.image ? (
                  <img src={item.image} alt={`Generated ${idx + 1}`} className="w-full" />
                ) : (
                  <pre className="text-xs bg-muted p-3 overflow-x-auto">{JSON.stringify(item, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        ) : info ? (
          <div className="space-y-6">
            {/* Title for structured content */}
            {content?.title && info.contentPath === 'content' && (
              <h3 className="text-xl font-bold">{content.title}</h3>
            )}

            {/* Rendered content */}
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer content={currentText} />
            </div>

            {/* AI Refinement area for editable content */}
            {info.isEditable && (
              <RefinementArea
                initialContent={currentText}
                contextData={{ projectTitle: project.title, projectType: project.type }}
                onContentUpdate={(newContent) => setCurrentText(newContent)}
                contentType={info.contentType}
              />
            )}
          </div>
        ) : (
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
