'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertCircle, Info, AlertTriangle, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  category: 'general' | 'update' | 'maintenance' | 'important'
  priority: number
  published_at: string
  expires_at?: string
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  useEffect(() => {
    // ローカルストレージから閉じたお知らせのIDを取得
    const dismissed = localStorage.getItem('dismissedAnnouncements')
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed))
    }
    
    fetchAnnouncements()
  }, [])

  useEffect(() => {
    // 複数のお知らせがある場合、自動的に切り替える
    if (announcements.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length)
      }, 10000) // 10秒ごとに切り替え

      return () => clearInterval(interval)
    }
  }, [announcements.length])

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements?limit=5')
      if (response.ok) {
        const data = await response.json()
        // 閉じたお知らせを除外
        const filtered = data.announcements.filter(
          (a: Announcement) => !dismissedIds.includes(a.id)
        )
        setAnnouncements(filtered)
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    if (announcements.length > 0) {
      const currentAnnouncement = announcements[currentIndex]
      const newDismissedIds = [...dismissedIds, currentAnnouncement.id]
      
      // ローカルストレージに保存
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissedIds))
      setDismissedIds(newDismissedIds)
      
      // 配列から削除
      const newAnnouncements = announcements.filter((_, i) => i !== currentIndex)
      setAnnouncements(newAnnouncements)
      
      // インデックスをリセット
      if (currentIndex >= newAnnouncements.length && newAnnouncements.length > 0) {
        setCurrentIndex(newAnnouncements.length - 1)
      }
      
      // お知らせがなくなったら非表示
      if (newAnnouncements.length === 0) {
        setIsVisible(false)
      }
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'important':
        return <AlertCircle className="w-4 h-4" />
      case 'maintenance':
        return <AlertTriangle className="w-4 h-4" />
      case 'update':
        return <Megaphone className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'important':
        return 'bg-red-500'
      case 'maintenance':
        return 'bg-yellow-500'
      case 'update':
        return 'bg-blue-500'
      default:
        return 'bg-gray-600'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'important':
        return '重要'
      case 'maintenance':
        return 'メンテナンス'
      case 'update':
        return 'アップデート'
      default:
        return 'お知らせ'
    }
  }

  if (loading || !isVisible || announcements.length === 0) {
    return null
  }

  const currentAnnouncement = announcements[currentIndex]

  return (
    <div className={`${getCategoryColor(currentAnnouncement.category)} text-white`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center space-x-2">
              {getCategoryIcon(currentAnnouncement.category)}
              <span className="font-semibold text-sm">
                {getCategoryLabel(currentAnnouncement.category)}
              </span>
            </div>
            <div className="flex-1">
              <span className="font-medium">{currentAnnouncement.title}</span>
              {currentAnnouncement.content && (
                <span className="ml-2 opacity-90 text-sm">
                  {currentAnnouncement.content}
                </span>
              )}
            </div>
          </div>
          
          {announcements.length > 1 && (
            <div className="flex items-center space-x-2 mx-4">
              {announcements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`お知らせ ${index + 1}`}
                />
              ))}
            </div>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}