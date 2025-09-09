'use client'

import { useState } from 'react'
import { Search, Filter, Calendar, Download } from 'lucide-react'

export default function JobsFilters() {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    plan: 'all',
    dateFrom: '',
    dateTo: ''
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // 検索実行
    console.log('Searching with filters:', filters)
  }

  const handleExport = () => {
    // CSVエクスポート
    console.log('Exporting to CSV')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 検索ボックス */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ジョブID、ユーザー名で検索"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ステータスフィルタ */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">すべてのステータス</option>
            <option value="queued">待機中</option>
            <option value="processing">処理中</option>
            <option value="completed">完了</option>
            <option value="failed">失敗</option>
            <option value="cancelled">キャンセル</option>
          </select>

          {/* プランフィルタ */}
          <select
            value={filters.plan}
            onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">すべてのプラン</option>
            <option value="lite">Lite</option>
            <option value="standard">Standard</option>
            <option value="creator">Creator</option>
            <option value="freetrial">無料トライアル</option>
            <option value="prepaid">プリペイド</option>
          </select>

          {/* 検索・エクスポートボタン */}
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              フィルタ
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              title="CSVエクスポート"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 日付範囲フィルタ */}
        <div className="flex items-center space-x-4">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="datetime-local"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </form>
    </div>
  )
}