import React from 'react'

export type FilterType = 'all' | 'working' | 'ai_ok' | 'completed' | 'archived'

interface FilterChipsProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  projectCounts: {
    all: number
    working: number
    ai_ok: number
    completed: number
    archived: number
  }
}

export default function FilterChips({ activeFilter, onFilterChange, projectCounts }: FilterChipsProps) {
  const filters: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'すべて', count: projectCounts.all },
    { value: 'working', label: '作業中', count: projectCounts.working },
    { value: 'ai_ok', label: 'AI OK', count: projectCounts.ai_ok },
    { value: 'completed', label: '完了', count: projectCounts.completed },
    { value: 'archived', label: 'アーカイブ', count: projectCounts.archived },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`
            px-4 py-2 rounded-full font-medium text-sm transition-all
            ${activeFilter === filter.value
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md'
              : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200'
            }
          `}
        >
          {filter.label}
          {filter.count > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeFilter === filter.value 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}