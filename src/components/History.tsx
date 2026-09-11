'use client'

import { useEffect, useState } from 'react'
import type { HistoryItem } from '../types'
import { uploadGeneratedImage } from '../lib/figurebed/upload'
import './History.css'

interface HistoryProps {
  items: HistoryItem[]
  onClear: () => void
  onRemove: (id: string) => void
  onHistoryUpdate: (id: string, patch: Partial<HistoryItem>) => void
}

type ConfirmAction = { type: 'clear' } | { type: 'remove'; id: string }

export default function History({ items, onClear, onRemove, onHistoryUpdate }: HistoryProps) {
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null)
  // 图床上传状态：进行中的 id 集合 + 失败信息
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set())
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})

  // 弹窗打开时支持 Esc 键关闭
  useEffect(() => {
    if (!pendingConfirm) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingConfirm(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingConfirm])

  if (items.length === 0) return null

  const handleDownload = (item: HistoryItem) => {
    const a = document.createElement('a')
    a.href = item.dataUrl
    a.download = `z-image-${item.id}.${item.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 上传到 GitHub 图床（成功后自动复制外链并写回记录）
  const handleUpload = async (item: HistoryItem) => {
    if (uploadingIds.has(item.id)) return
    setUploadingIds((prev) => new Set(prev).add(item.id))
    setUploadErrors((prev) => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })
    try {
      const res = await uploadGeneratedImage(item.dataUrl, item.ext, item.prompt)
      onHistoryUpdate(item.id, { cdnUrl: res.url, cdnTarget: res.target })
      navigator.clipboard.writeText(res.url).catch(() => {})
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : String(err)
      }))
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleCopyLink = async (item: HistoryItem) => {
    if (!item.cdnUrl) return
    try {
      await navigator.clipboard.writeText(item.cdnUrl)
    } catch {
      // 剪贴板不可用时静默忽略
    }
  }

  // 重新生成:不跳路由,始终回填到当前页的生成器并锚点滑到生成区
  const handleRegenerate = (item: HistoryItem) => {
    sessionStorage.setItem('pending_prompt', item.prompt)
    window.dispatchEvent(new Event('use-prompt'))
  }

  const handleConfirm = () => {
    if (pendingConfirm?.type === 'clear') {
      onClear()
    } else if (pendingConfirm?.type === 'remove') {
      onRemove(pendingConfirm.id)
    }
    setPendingConfirm(null)
  }

  const confirmTitle = pendingConfirm?.type === 'clear' ? '清空历史记录' : '删除历史记录'
  const confirmText =
    pendingConfirm?.type === 'clear'
      ? '确定清空全部历史记录？删除后无法恢复。'
      : '确定删除这条历史记录？删除后无法恢复。'

  return (
    <>
      <section className="history" id="history">
        <div className="container">
          <div className="history-header">
            <h2>生成历史</h2>
            <button className="btn btn-ghost clear-btn" onClick={() => setPendingConfirm({ type: 'clear' })}>
              清空记录
            </button>
          </div>

          <div className="history-grid">
            {items.map((item) => (
              <div className="history-card" key={item.id}>
                <div className="history-img-wrap">
                  <img src={item.dataUrl} alt={item.prompt} loading="lazy" />
                  <button
                    className="history-remove"
                    onClick={() => setPendingConfirm({ type: 'remove', id: item.id })}
                    aria-label="删除这条记录"
                    title="删除"
                  >
                    ×
                  </button>
                </div>
                <div className="history-info">
                  <div className="history-prompt" title={item.prompt}>
                    {item.prompt}
                  </div>
                  <div className="history-meta-row">
                    <span className="history-size">{item.sizeLabel}</span>
                    <span className="history-time">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="history-actions">
                    <button
                      className="btn btn-ghost history-regenerate"
                      onClick={() => handleRegenerate(item)}
                      title="把提示词回填到生成器,调整后再生成"
                    >
                      🔁 重新生成
                    </button>
                    <button
                      className="btn btn-ghost history-download"
                      onClick={() => handleDownload(item)}
                    >
                      ⬇ 下载
                    </button>
                    {item.cdnUrl ? (
                      <button
                        className="btn btn-ghost history-upload"
                        onClick={() => handleCopyLink(item)}
                        title="点击复制图床外链"
                      >
                        🔗 复制链接
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost history-upload"
                        onClick={() => handleUpload(item)}
                        disabled={uploadingIds.has(item.id)}
                        title="上传到 GitHub 图床（公开可访问），成功后自动复制外链"
                      >
                        {uploadingIds.has(item.id) ? '⏳ 上传中…' : '☁️ 上传图床'}
                      </button>
                    )}
                  </div>
                  {uploadErrors[item.id] && (
                    <div className="history-upload-error">{uploadErrors[item.id]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {pendingConfirm && (
        <div className="confirm-overlay" onClick={() => setPendingConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">{confirmTitle}</div>
            <div className="confirm-text">{confirmText}</div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setPendingConfirm(null)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleConfirm}>
                {pendingConfirm.type === 'clear' ? '清空' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}