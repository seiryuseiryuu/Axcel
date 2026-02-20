'use client'

import { useState, useTransition } from 'react'
import { Copy, Download, Save, Loader2, ChevronDown, ChevronRight, Info, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { updateArtifactContent } from '@/app/actions/history'
import { refineContent } from '@/app/actions/refine'
import { useToast } from '@/hooks/use-toast'
import { extractEditableText, patchContent, extractGenerationContext, buildRefinementContext } from './contentExtractor'

interface HistoryContentViewerProps {
  project: any
  onContentSaved?: () => void
}

export function HistoryContentViewer({ project, onContentSaved }: HistoryContentViewerProps) {
  const artifact = project.generated_artifacts?.[0]
  const { toast } = useToast()
  const [isSaving, startSaveTransition] = useTransition()
  const [isRefining, startRefineTransition] = useTransition()
  const [contextOpen, setContextOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])

  const content = artifact?.content
  const info = content != null ? extractEditableText(content) : null
  const generationContexts = content != null ? extractGenerationContext(content) : []

  const [currentText, setCurrentText] = useState(info?.text ?? '')

  // Reset when project changes
  const [lastProjectId, setLastProjectId] = useState(project.id)
  if (project.id !== lastProjectId) {
    setLastProjectId(project.id)
    const newInfo = artifact?.content != null ? extractEditableText(artifact.content) : null
    setCurrentText(newInfo?.text ?? '')
    setContextOpen(false)
    setInstruction('')
    setChatHistory([])
  }

  if (!artifact) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        アーティファクトがありません
      </div>
    )
  }

  const isImageContent = Array.isArray(content) && content.length > 0 && content[0]?.image
  const refinementContext = buildRefinementContext(content, project.title, project.type)

  const handleCopy = () => {
    const textToCopy = currentText || info?.text || JSON.stringify(content, null, 2)
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

  const handleRefine = () => {
    if (!instruction.trim() || !info) return

    setChatHistory(prev => [...prev, { role: 'user', text: instruction }])
    const currentInstruction = instruction
    setInstruction('')

    startRefineTransition(async () => {
      const result = await refineContent(currentText, currentInstruction, refinementContext, info.contentType as any)
      if (result.success && result.data) {
        setCurrentText(result.data)
        setChatHistory(prev => [...prev, { role: 'ai', text: '修正しました。' }])
        toast({ title: '修正完了', description: 'コンテンツを更新しました' })
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', text: '修正に失敗しました。' }])
        toast({ title: 'エラー', description: '修正に失敗しました', variant: 'destructive' })
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{project.title}</h2>
          <p className="text-xs text-muted-foreground">
            {new Date(project.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">コピー</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">DL</span>
          </Button>
          {info?.isEditable && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              保存
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {/* Generation Context Section */}
        {generationContexts.length > 0 && (
          <div className="mb-4 border rounded-lg bg-muted/30">
            <button
              onClick={() => setContextOpen(!contextOpen)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {contextOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Info className="w-4 h-4" />
              生成時の入力・分析情報（{generationContexts.length}件）
            </button>
            {contextOpen && (
              <div className="px-4 pb-4 space-y-3 border-t">
                {generationContexts.map((ctx, idx) => (
                  <div key={idx} className="pt-3">
                    <p className="text-xs font-semibold text-primary mb-1">{ctx.label}</p>
                    <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto border">
                      {ctx.value}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main content display */}
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
          <div>
            {content?.title && info.contentPath === 'content' && (
              <h3 className="text-xl font-bold mb-4">{content.title}</h3>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer content={currentText} />
            </div>
          </div>
        ) : (
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>

      {/* Fixed bottom: AI refinement input */}
      {info?.isEditable && (
        <div className="shrink-0 border-t bg-card/80 backdrop-blur-sm px-4 md:px-6 py-3">
          {/* Chat history */}
          {chatHistory.length > 0 && (
            <div className="mb-3 space-y-1.5 max-h-[120px] overflow-y-auto">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`text-xs px-3 py-1.5 rounded-lg max-w-[80%] ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              <span className="hidden sm:inline">AI修正</span>
            </div>
            <Textarea
              placeholder="修正指示を入力... 例: 「もっと具体的にして」「トーンをカジュアルに」"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="min-h-[44px] max-h-[100px] resize-none bg-background text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleRefine()
                }
              }}
            />
            <Button
              onClick={handleRefine}
              disabled={isRefining || !instruction.trim()}
              size="icon"
              className="h-[44px] w-[44px] shrink-0"
            >
              {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Ctrl+Enter で送信 ・ 生成時の情報を踏まえてAIが修正します
          </p>
        </div>
      )}
    </div>
  )
}
