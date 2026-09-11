'use client'

import { useEffect, useState } from 'react'
import HunyuanStudio from './HunyuanStudio'
import History from './History'
import { HISTORY_LIMIT } from '../config'
import { addHistory, clearHistory, loadHistory, removeHistory, updateHistory } from '../utils/historyDB'
import type { HistoryItem } from '../types'

// 与首页 GeneratorSection 同构:管理 IndexedDB 历史记录(与 Gitee 渠道共用同一份历史)
export default function HunyuanSection() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    let cancelled = false
    loadHistory().then((items) => {
      if (!cancelled) setHistory(items)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleHistoryAdd = async (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT))
    await addHistory(item)
    const all = await loadHistory()
    if (all.length > HISTORY_LIMIT) {
      const toRemove = all.slice(HISTORY_LIMIT)
      for (const old of toRemove) {
        await removeHistory(old.id)
      }
    }
  }

  const handleHistoryClear = async () => {
    setHistory([])
    await clearHistory()
  }

  const handleHistoryRemove = async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id))
    await removeHistory(id)
  }

  // 局部更新历史记录（如图床上传成功后写回外链）
  const handleHistoryUpdate = async (id: string, patch: Partial<HistoryItem>) => {
    setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    await updateHistory(id, patch)
  }

  return (
    <>
      <HunyuanStudio onHistoryAdd={handleHistoryAdd} />
      <History
        items={history}
        onClear={handleHistoryClear}
        onRemove={handleHistoryRemove}
        onHistoryUpdate={handleHistoryUpdate}
      />
    </>
  )
}
