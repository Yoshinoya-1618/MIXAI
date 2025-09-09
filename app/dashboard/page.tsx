'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

type Plan = "Light" | "Standard" | "Creator"
type Status = "UPLOADED"|"PREPPED"|"AI_MIX_OK"|"TWEAKING"|"MASTERING"|"REVIEW"|"DONE"|"ARCHIVED"

type Project = {
  id: string
  title: string
  status: Status
  plan: Plan
  createdAt: string
  updatedAt: string
  artwork?: string
}

const PLAN_DAYS: Record<Plan, number> = { Light: 7, Standard: 15, Creator: 30 }

function daysLeft(createdAtISO: string, plan: Plan) {
  const created = new Date(createdAtISO).getTime()
  const expires = created + PLAN_DAYS[plan] * 86400000
  return Math.ceil((expires - Date.now()) / 86400000)
}

function isExpired(p: Project) { 
  return daysLeft(p.createdAt, p.plan) < 0 
}

function progressOf(status: Status) {
  const order: Status[] = ["UPLOADED","PREPPED","AI_MIX_OK","TWEAKING","MASTERING","REVIEW","DONE"]
  const idx = Math.max(0, order.indexOf(status))
  return Math.round((idx/(order.length-1))*100)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function statusBadge(s: Status) {
  switch(s) {
    case "AI_MIX_OK": return {label:"AI OK", cls:"bg-emerald-50 text-emerald-700 border-emerald-200"}
    case "PREPPED": return {label:"下ごしらえ済", cls:"bg-sky-50 text-sky-700 border-sky-200"}
    case "TWEAKING": return {label:"微調整中", cls:"bg-indigo-50 text-indigo-700 border-indigo-200"}
    case "MASTERING": return {label:"マスタリング中", cls:"bg-violet-50 text-violet-700 border-violet-200"}
    case "REVIEW": return {label:"最終確認待ち", cls:"bg-amber-50 text-amber-700 border-amber-200"}
    case "DONE": return {label:"完了", cls:"bg-zinc-100 text-zinc-700 border-zinc-200"}
    case "ARCHIVED": return {label:"アーカイブ", cls:"bg-zinc-50 text-zinc-500 border-zinc-200"}
    default: return {label:s, cls:"bg-zinc-50 text-zinc-600 border-zinc-200"}
  }
}

function daysAgoISO(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString()
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all'|'working'|'aiok'|'done'|'archived'>('all')
  const [query, setQuery] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [planInfo, setPlanInfo] = useState<{plan: Plan, status: string, credits: number}>({
    plan: 'Light',
    status: 'none',
    credits: 0
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 実際のAPIからデータを取得
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setError('ログインが必要です')
          setLoading(false)
          return
        }

        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('ダッシュボードデータの取得に失敗しました')
        }

        const data = await response.json()
        
        // APIレスポンスからプロジェクトデータを設定
        setProjects(data.projects || [])
        setPlanInfo(data.planInfo || { plan: 'Light', status: 'none', credits: 0 })
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setError('ダッシュボードデータの取得に失敗しました')
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // フィルタ
  const filtered = useMemo(() => {
    const list = projects.filter(p => !isExpired(p)).filter(p => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    switch(filter) {
      case 'working': return list.filter(p => p.status==='PREPPED'||p.status==='TWEAKING'||p.status==='MASTERING'||p.status==='REVIEW')
      case 'aiok': return list.filter(p => p.status==='AI_MIX_OK')
      case 'done': return list.filter(p => p.status==='DONE')
      case 'archived': return list.filter(p => p.status==='ARCHIVED')
      default: return list
    }
  }, [projects, filter, query])

  // 並び：更新日降順
  const rows = useMemo(() => filtered.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [filtered])

  // メトリクス
  const active = projects.filter(p => p.status!=="DONE" && p.status!=="ARCHIVED").length
  const soonExpire = projects.filter(p => daysLeft(p.createdAt, p.plan) <= 3).length
  const aiOK = projects.filter(p => p.status==='AI_MIX_OK').length

  if (loading) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <AuroraBackground />
        <Header currentPage="dashboard" />
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="dashboard" />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[var(--indigo)] to-[var(--blue)] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm/6 opacity-90">
                現在のプラン: <strong>{planInfo.plan || '未加入'}</strong> | クレジット残高: <strong>{planInfo.credits}クレジット</strong>
                {planInfo.credits < 2 && (
                  <span className="ml-2 text-yellow-200">
                    • クレジット不足
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
              <p className="mt-1 text-sm/6 opacity-90">保存期限は <strong>生成時</strong> から。期限切れは自動削除されます。</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.location.href = '/upload'}
                className="border-white/50 bg-white/10 text-white hover:bg-white/20 px-4 py-2 rounded-lg border font-medium"
              >
                新規プロジェクト
              </button>
              <button 
                onClick={() => window.location.href = '/credits'}
                className="bg-white text-indigo-700 hover:bg-white/90 px-4 py-2 rounded-lg font-medium"
              >
                クレジット購入
              </button>
            </div>
          </div>
          
          {/* メトリクス */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard title="作業中" value={active} icon={<ClockIcon className="h-4 w-4" />} />
            <MetricCard title="AI OK" value={aiOK} icon={<CheckCircleIcon className="h-4 w-4" />} />
            <MetricCard title="保存期限 3日以内" value={soonExpire} warn icon={<ExclamationTriangleIcon className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* フィルタ & 検索 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FilterChip active={filter==='all'} onClick={() => setFilter('all')}>すべて</FilterChip>
            <FilterChip active={filter==='working'} onClick={() => setFilter('working')}>作業中</FilterChip>
            <FilterChip active={filter==='aiok'} onClick={() => setFilter('aiok')}>MIX完了</FilterChip>
            <FilterChip active={filter==='done'} onClick={() => setFilter('done')}>完了</FilterChip>
            <FilterChip active={filter==='archived'} onClick={() => setFilter('archived')}>アーカイブ</FilterChip>
          </div>
          <div className="glass-card px-3 py-2 border-zinc-200">
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="曲名で検索…" 
              className="w-64 bg-transparent text-sm outline-none placeholder:text-zinc-400" 
            />
          </div>
        </div>

        {/* 横長リスト */}
        <div className="glass-card divide-y divide-zinc-200">
          {rows.map(p => (
            <RowCard key={p.id} project={p} />
          ))}
          {rows.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                <MusicNoteIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-lg font-medium text-zinc-700 mb-2">まだプロジェクトがありません</p>
              <p className="text-sm text-zinc-500 mb-6">音声ファイルをアップロードして、AIミキシングを始めましょう</p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => window.location.href = '/upload'}
                  className="bg-indigo-600 text-white hover:bg-indigo-500 px-6 py-2 rounded-lg font-medium"
                >
                  最初のプロジェクトを作成
                </button>
                {planInfo.credits < 1 && (
                  <button 
                    onClick={() => window.location.href = '/credits'}
                    className="bg-white text-indigo-600 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium border border-indigo-200"
                  >
                    クレジット購入
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </main>
  )
}

// UI Components
function MetricCard({ title, value, icon, warn }: { title: string; value: number; icon?: React.ReactNode; warn?: boolean }) {
  const tone = warn ? 'bg-white/15 text-white' : 'bg-white/10 text-white'
  return (
    <div className={`flex items-center justify-between rounded-lg ${tone} px-3 py-2`}>
      <div className="text-sm/6">{title}</div>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-lg font-semibold">{value}</span>
      </div>
    </div>
  )
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`rounded-full border px-3 py-1 text-sm ${
        active 
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700' 
          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {children}
    </button>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-200">
      <div 
        className="h-1.5 rounded-full bg-indigo-500" 
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }} 
      />
    </div>
  )
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'warn' | 'ok' }) {
  const cls = tone === 'warn' 
    ? 'bg-amber-50 text-amber-700 border-amber-200' 
    : 'bg-zinc-50 text-zinc-600 border-zinc-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {children}
    </span>
  )
}

function RowCard({ project }: { project: Project }) {
  const dleft = daysLeft(project.createdAt, project.plan)
  const { label, cls } = statusBadge(project.status)
  const prog = progressOf(project.status)
  const mid = project.status === 'PREPPED' || project.status === 'TWEAKING' || project.status === 'MASTERING' || project.status === 'REVIEW'
  const [open, setOpen] = useState(false)

  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-4 py-3">
      {/* サムネ */}
      <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 shadow-inner" />

      {/* 本文 */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-medium text-zinc-900">{project.title}</div>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
            {label}
          </span>
          <span className="text-xs text-zinc-500">
            作成 {formatDate(project.createdAt)}・更新 {formatDate(project.updatedAt)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="w-56">
            <ProgressBar value={prog} />
          </div>
          <span className="text-xs text-zinc-500">{prog}%</span>
          <Pill tone={dleft <= 3 ? 'warn' : undefined}>
            残り {Math.max(0, dleft)} 日（{project.plan}）
          </Pill>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2">
        {mid ? (
          <button 
            onClick={() => window.location.href = `/mix/${project.plan.toLowerCase()}/${project.id}`}
            className="bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium flex items-center gap-1"
          >
            <PlayIcon className="w-4 h-4" />
            続きから
          </button>
        ) : project.status === 'AI_MIX_OK' ? (
          <>
            <button 
              onClick={() => window.location.href = `/mix/${project.plan.toLowerCase()}/${project.id}`}
              className="bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium flex items-center gap-1"
            >
              <PlayIcon className="w-4 h-4" />
              続きから
            </button>
            <div className="relative">
              <button 
                className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 border px-4 py-2 rounded-lg font-medium flex items-center gap-1"
                onClick={() => setOpen(v => !v)}
              >
                オプション
                <ChevronDownIcon className="w-4 h-4" />
              </button>
              {open && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-xl">
                  <MenuItem label="AI再MIX" sub="0.5 クレジット" icon={<RefreshIcon className="h-4 w-4" />} onClick={() => setOpen(false)} />
                  <MenuItem label="微調整" sub="0.5 クレジット" icon={<SlidersIcon className="h-4 w-4" />} onClick={() => setOpen(false)} />
                  <MenuItem label="マスタリングへ" sub="0.5 クレジット" icon={<WandIcon className="h-4 w-4" />} onClick={() => setOpen(false)} />
                  <div className="my-1 h-px bg-zinc-200" />
                  <MenuItem label="共有（閲覧）" icon={<ShareIcon className="h-4 w-4" />} onClick={() => setOpen(false)} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="relative">
            <button 
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 border px-4 py-2 rounded-lg font-medium flex items-center gap-1"
              onClick={() => setOpen(v => !v)}
            >
              オプション
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {open && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-xl">
                <MenuItem label="AI再MIX" sub="0.5 クレジット" icon={<RefreshIcon className="h-4 w-4" />} onClick={() => setOpen(false)} />
                <MenuItem label="共有（閲覧）" icon={<ShareIcon className="h-4 w-4" />} onClick={() => setOpen(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({ label, sub, icon, onClick }: { label: string; sub?: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-zinc-50"
    >
      <span className="text-zinc-600">{icon}</span>
      <span className="flex-1 text-zinc-800">{label}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </button>
  )
}

// Icon Components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function WandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 21.015l-2.882-2.726-2.882 2.726-1.358.657L5.52 21.015l-1.357-.657 2.137-2.018L5.52 17.685l1.358-.657 2.882 2.725 2.882-2.725 1.358.657-.78.655 2.137 2.018-1.357.657z" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186z" />
    </svg>
  )
}

function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
    </svg>
  )
}

function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl" 
           style={{ background: `linear-gradient(135deg, var(--indigo) 0%, var(--blue) 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" 
           style={{ background: `linear-gradient(135deg, var(--blue) 0%, var(--magenta) 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: `linear-gradient(135deg, var(--magenta) 0%, var(--indigo) 100%)` }} />
    </div>
  )
}