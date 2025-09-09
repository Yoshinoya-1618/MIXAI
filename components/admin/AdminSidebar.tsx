'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Briefcase, 
  MessageSquare, 
  Users, 
  Flag, 
  FileText, 
  Lock,
  AlertTriangle,
  Settings
} from 'lucide-react'

interface AdminSidebarProps {
  roles: string[]
}

export default function AdminSidebar({ roles }: AdminSidebarProps) {
  const pathname = usePathname()
  
  const isAdmin = roles.includes('admin')
  const isOps = roles.includes('ops')
  const isSupport = roles.includes('support')
  const isReadOnly = roles.includes('read_only')

  const navigation = [
    {
      name: 'ダッシュボード',
      href: '/admin',
      icon: LayoutDashboard,
      visible: true
    },
    {
      name: 'ジョブ管理',
      href: '/admin/jobs',
      icon: Briefcase,
      visible: true
    },
    {
      name: 'フィードバック',
      href: '/admin/feedback',
      icon: MessageSquare,
      visible: true
    },
    {
      name: 'ユーザー管理',
      href: '/admin/users',
      icon: Users,
      visible: isAdmin || isOps
    },
    {
      name: '機能フラグ',
      href: '/admin/flags',
      icon: Flag,
      visible: isAdmin || isOps
    },
    {
      name: '監査ログ',
      href: '/admin/audit',
      icon: FileText,
      visible: isAdmin || isOps
    },
    {
      name: '保管庫',
      href: '/admin/vault',
      icon: Lock,
      visible: isAdmin || isOps
    }
  ]

  const dangerZone = [
    {
      name: '承認待ち',
      href: '/admin/approvals',
      icon: AlertTriangle,
      visible: isAdmin,
      badge: 0 // 後で動的に取得
    },
    {
      name: 'システム設定',
      href: '/admin/settings',
      icon: Settings,
      visible: isAdmin
    }
  ]

  return (
    <aside className="fixed left-0 top-16 h-full w-64 bg-white border-r border-gray-200">
      <nav className="p-4 space-y-1">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            メインメニュー
          </h3>
          {navigation.filter(item => item.visible).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {dangerZone.some(item => item.visible) && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              管理者専用
            </h3>
            {dangerZone.filter(item => item.visible).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-red-50 text-red-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* ロール表示 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500">現在のロール:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {roles.map(role => (
                <span 
                  key={role}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </aside>
  )
}