'use client'

import { Suspense } from 'react'
import { HistoryPanel } from '@/components/features/history/HistoryPanel'

export default function StudentHistoryPage() {
  return (
    <Suspense>
      <HistoryPanel isAdmin={false} basePath="/student/history" />
    </Suspense>
  )
}
