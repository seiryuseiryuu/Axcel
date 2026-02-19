'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchHistory, deleteProject } from '@/app/actions/history'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, Sparkles, ArrowLeft, FileText, Image as ImageIcon, Video, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { HistoryListItem } from './HistoryListItem'
import { HistoryContentViewer } from './HistoryContentViewer'
import Link from 'next/link'

const filterOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'video_script', label: '台本' },
  { value: 'seo_article', label: '記事' },
  { value: 'thumbnail', label: 'サムネ' },
  { value: 'image', label: '画像' },
  { value: 'mixed', label: 'その他' },
]

interface HistoryPanelProps {
  isAdmin: boolean
  basePath: string
}

export function HistoryPanel({ isAdmin, basePath }: HistoryPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get('id')
  )
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileDetailView, setIsMobileDetailView] = useState(false)

  const loadHistory = useCallback(() => {
    startTransition(async () => {
      const result = await fetchHistory()
      if (result.success && result.data) {
        setProjects(result.data)
      } else if (result.error) {
        setError(result.error)
      }
    })
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-select from URL param
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId && projects.length > 0) {
      setSelectedProjectId(urlId)
      setIsMobileDetailView(true)
    }
  }, [searchParams, projects])

  const filtered = projects.filter((p) => {
    if (filterType !== 'all' && p.type !== filterType) return false
    if (searchQuery && !p.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  const handleSelect = (id: string) => {
    setSelectedProjectId(id)
    setIsMobileDetailView(true)
    // Update URL without full navigation
    const url = new URL(window.location.href)
    url.searchParams.set('id', id)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const handleDelete = (projectId: string) => {
    if (!confirm('この履歴を削除しますか？')) return
    startTransition(async () => {
      const result = await deleteProject(projectId)
      if (result.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId))
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null)
          setIsMobileDetailView(false)
        }
        toast({ title: '削除しました' })
      } else {
        toast({ title: '削除に失敗しました', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleBack = () => {
    setIsMobileDetailView(false)
  }

  if (isLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-xl shrink-0 z-10">
        <div className="px-4 md:px-6 py-4 flex items-center gap-4">
          {/* Mobile back button */}
          {isMobileDetailView ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="md:hidden hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              生成履歴
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              過去の成果物を閲覧・AI修正できます
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          エラー: {error}
        </div>
      )}

      {projects.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">まだ履歴がありません</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            AIスタジオでコンテンツを作成すると、ここに保存されます。
          </p>
          <Link href={isAdmin ? '/admin/studio' : '/studio'}>
            <Button className="bg-primary hover:bg-primary/90">
              <Sparkles className="w-4 h-4 mr-2" />
              スタジオで作成を始める
            </Button>
          </Link>
        </div>
      ) : (
        /* 2-panel layout */
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - List */}
          <div
            className={`w-full md:w-80 md:border-r flex flex-col shrink-0 ${
              isMobileDetailView ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search + Filter */}
            <div className="p-3 border-b space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="タイトルで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {filterOptions.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={filterType === opt.value ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setFilterType(opt.value)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Scrollable list */}
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {filtered.map((project) => (
                  <HistoryListItem
                    key={project.id}
                    project={project}
                    isSelected={project.id === selectedProjectId}
                    onSelect={() => handleSelect(project.id)}
                    onDelete={() => handleDelete(project.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    該当する履歴がありません
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right panel - Content Viewer */}
          <div
            className={`flex-1 flex flex-col min-w-0 ${
              !isMobileDetailView ? 'hidden md:flex' : 'flex'
            }`}
          >
            {selectedProject ? (
              <HistoryContentViewer
                key={selectedProject.id}
                project={selectedProject}
                onContentSaved={loadHistory}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>左のリストからアイテムを選択してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
