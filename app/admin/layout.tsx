import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminHeader from '../../components/admin/AdminHeader'

export const metadata = {
  title: 'Admin Dashboard | MIXAI',
  robots: 'noindex, nofollow'
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?cb=/admin')
  }

  // ユーザープロファイルとロールの取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  // 管理者権限チェック（簡易版 - 後で強化）
  const allowedRoles = ['admin', 'ops', 'support', 'read_only']
  const hasAccess = profile?.roles?.some((role: string) => allowedRoles.includes(role))

  if (!hasAccess) {
    redirect('/403') // 権限なしページへ
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} roles={profile?.roles || []} />
      
      <div className="flex">
        <AdminSidebar roles={profile?.roles || []} />
        
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}