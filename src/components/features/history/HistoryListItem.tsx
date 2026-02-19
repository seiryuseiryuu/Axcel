'use client'

import { FileText, Image as ImageIcon, Video, Zap, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  video_script: { icon: Video, label: 'YouTube台本', color: 'text-red-500' },
  thumbnail: { icon: ImageIcon, label: 'サムネイル', color: 'text-purple-500' },
  image: { icon: ImageIcon, label: '画像', color: 'text-blue-500' },
  seo_article: { icon: FileText, label: 'SEO記事', color: 'text-green-500' },
  mixed: { icon: Zap, label: 'コンテンツ', color: 'text-yellow-500' },
}

function getConfig(type: string) {
  return typeConfig[type] || { icon: FileText, label: type, color: 'text-muted-foreground' }
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}時間前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}日前`
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

interface HistoryListItemProps {
  project: any
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export function HistoryListItem({ project, isSelected, onSelect, onDelete }: HistoryListItemProps) {
  const config = getConfig(project.type)
  const Icon = config.icon

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-accent/50 group ${
        isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'
      }`}
    >
      <Icon className={`w-4 h-4 mt-1 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(project.created_at)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </button>
  )
}
