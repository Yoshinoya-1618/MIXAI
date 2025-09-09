'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendBad?: boolean
  bgColor?: string
  iconColor?: string
}

export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
  trendBad = false,
  bgColor = 'bg-white',
  iconColor = 'text-gray-600'
}: DashboardCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') {
      return <TrendingUp className={`h-4 w-4 ${trendBad ? 'text-red-500' : 'text-green-500'}`} />
    }
    if (trend === 'down') {
      return <TrendingDown className={`h-4 w-4 ${trendBad ? 'text-red-500' : 'text-green-500'}`} />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className={`${bgColor} rounded-lg border border-gray-200 p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${bgColor === 'bg-white' ? 'bg-gray-100' : ''}`}>
          <div className={iconColor}>
            {icon}
          </div>
        </div>
        {getTrendIcon()}
      </div>
      
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}