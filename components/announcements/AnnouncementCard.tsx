'use client'

import React, { useState, useEffect } from 'react'
import { Bell, ChevronRight, Calendar, Tag } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  category: 'general' | 'update' | 'maintenance' | 'important'
  priority: number
  published_at: string
  expires_at?: string
}

export function AnnouncementCard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements?limit=3')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements)
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'important':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'update':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">お知らせ</h3>
        </div>
        <p className="text-gray-500 text-sm">現在お知らせはありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">お知らせ</h3>
          </div>
          <a
            href="/announcements"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>すべて見る</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setExpanded(expanded === announcement.id ? null : announcement.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryStyle(announcement.category)}`}>
                    <Tag className="w-3 h-3 mr-1" />
                    {getCategoryLabel(announcement.category)}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(announcement.published_at)}
                  </span>
                </div>
                
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {announcement.title}
                </h4>
                
                {expanded === announcement.id && (
                  <p className="text-sm text-gray-600 mt-2">
                    {announcement.content}
                  </p>
                )}
              </div>
              
              <ChevronRight 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expanded === announcement.id ? 'rotate-90' : ''
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}