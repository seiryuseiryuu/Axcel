'use client'

import { Suspense } from 'react'
import { HistoryPanel } from '@/components/features/history/HistoryPanel'

export default function AdminHistoryPage() {
  return (
    <Suspense>
      <HistoryPanel isAdmin={true} basePath="/admin/history" />
    </Suspense>
  )
}
