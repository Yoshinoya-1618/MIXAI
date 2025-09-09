/*
MIXAI: マイプロフィール & ダッシュボード 要件定義（明るめUI / 横長リスト版）
-----------------------------------------------------------------------------
本ファイルはプレビュー用の React 単一コンポーネントです（Tailwind + shadcn/ui）。
明るいトーン（紫→青グラデ）に統一し、カードは「横長リスト」で
完了データと作業中データを同一リスト内で扱います。

【要件（確定反映）】
- 保存期限：生成時から n日（Light 7 / Standard 15 / Creator 30）。期限切れは一覧から自動削除。
- クレジット：再MIX～マスタリングをひとくくり。どこからやり直しても 0.5 クレジット。
- 途中離脱：そのカードは「続きから」ボタンのみ表示（クリック可）。
- 再MIXを選ぶ時の順序：AI再MIX → 微調整（→ マスタリングへ）。
- ダッシュボードは明るめ／ホームと統一感のあるデザイン（紫系）。
- リストは1本。フィルタチップで表示切替（すべて/作業中/AI OK/完了/アーカイブ）。
- 表示ステータス：UPLOADED / PREPPED / AI_MIX_OK / TWEAKING / MASTERING / REVIEW / DONE / ARCHIVED。
- EXPIRED は UI 非表示（内部で自動削除）。
-----------------------------------------------------------------------------
*/

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, SlidersHorizontal, Wand2, Share2, ChevronDown, Clock, CheckCircle2, AlertTriangle, Play } from "lucide-react";

// ---- 型 & ユーティリティ -----------------------------------------------------

type Plan = "Light" | "Standard" | "Creator";
type Status = "UPLOADED"|"PREPPED"|"AI_MIX_OK"|"TWEAKING"|"MASTERING"|"REVIEW"|"DONE"|"ARCHIVED";

type Project = {
  id: string;
  title: string;
  status: Status;
  plan: Plan;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  artwork?: string; // 省略可
};

const PLAN_DAYS: Record<Plan, number> = { Light: 7, Standard: 15, Creator: 30 };

function daysLeft(createdAtISO: string, plan: Plan) {
  const created = new Date(createdAtISO).getTime();
  const expires = created + PLAN_DAYS[plan] * 86400000;
  return Math.ceil((expires - Date.now()) / 86400000);
}

function isExpired(p: Project) { return daysLeft(p.createdAt, p.plan) < 0; }

function progressOf(status: Status) {
  const order: Status[] = ["UPLOADED","PREPPED","AI_MIX_OK","TWEAKING","MASTERING","REVIEW","DONE"]; // ARCHIVED除外
  const idx = Math.max(0, order.indexOf(status));
  return Math.round((idx/(order.length-1))*100);
}

function fmtDate(iso: string){ const d = new Date(iso); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}-${mm}-${dd}`; }

function statusBadge(s: Status){
  switch(s){
    case "AI_MIX_OK": return {label:"AI OK", cls:"bg-emerald-50 text-emerald-700 border-emerald-200"};
    case "PREPPED": return {label:"下ごしらえ済", cls:"bg-sky-50 text-sky-700 border-sky-200"};
    case "TWEAKING": return {label:"微調整中", cls:"bg-indigo-50 text-indigo-700 border-indigo-200"};
    case "MASTERING": return {label:"マスタリング中", cls:"bg-violet-50 text-violet-700 border-violet-200"};
    case "REVIEW": return {label:"最終確認待ち", cls:"bg-amber-50 text-amber-700 border-amber-200"};
    case "DONE": return {label:"完了", cls:"bg-zinc-100 text-zinc-700 border-zinc-200"};
    case "ARCHIVED": return {label:"アーカイブ", cls:"bg-zinc-50 text-zinc-500 border-zinc-200"};
    default: return {label:s, cls:"bg-zinc-50 text-zinc-600 border-zinc-200"};
  }
}

// ---- ダミーデータ ------------------------------------------------------------

function daysAgoISO(n:number){ return new Date(Date.now()-n*86400000).toISOString(); }

const seed: Project[] = [
  { id: "p1", title: "ナイトクルーズ", status: "PREPPED", plan: "Light", createdAt: daysAgoISO(2), updatedAt: daysAgoISO(1) },
  { id: "p2", title: "透明な声", status: "AI_MIX_OK", plan: "Standard", createdAt: daysAgoISO(3), updatedAt: daysAgoISO(1) },
  { id: "p3", title: "星屑ララバイ", status: "TWEAKING", plan: "Creator", createdAt: daysAgoISO(10), updatedAt: daysAgoISO(0) },
  { id: "p4", title: "蒼のワルツ", status: "MASTERING", plan: "Standard", createdAt: daysAgoISO(1), updatedAt: daysAgoISO(0) },
  { id: "p5", title: "ミッドナイト・ドライブ", status: "REVIEW", plan: "Light", createdAt: daysAgoISO(5), updatedAt: daysAgoISO(0) },
  { id: "p6", title: "春風リフレイン", status: "DONE", plan: "Light", createdAt: daysAgoISO(6), updatedAt: daysAgoISO(0) },
  // 期限切れ（表示されない）
  { id: "p7", title: "expiredサンプル", status: "AI_MIX_OK", plan: "Light", createdAt: daysAgoISO(8), updatedAt: daysAgoISO(7) },
];

// ---- UI パーツ ---------------------------------------------------------------
function Progress({ value }:{ value:number }){
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-200">
      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.max(0,Math.min(100,value))}%` }} />
    </div>
  );
}

function Pill({children, tone}:{children:React.ReactNode; tone?:'warn'|'ok'}){
  const cls = tone==='warn' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200';
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

// ---- メイン：Dashboard -------------------------------------------------------

export default function DashboardPreview(){
  const [projects, setProjects] = useState<Project[]>(() => seed.filter(p=>!isExpired(p)));
  const [filter, setFilter] = useState<'all'|'working'|'aiok'|'done'|'archived'>('all');
  const [query, setQuery] = useState("");

  // フィルタ
  const filtered = useMemo(()=>{
    const list = projects.filter(p=>!isExpired(p)).filter(p=> p.title.toLowerCase().includes(query.trim().toLowerCase()));
    switch(filter){
      case 'working': return list.filter(p=>p.status==='PREPPED'||p.status==='TWEAKING'||p.status==='MASTERING'||p.status==='REVIEW');
      case 'aiok': return list.filter(p=>p.status==='AI_MIX_OK');
      case 'done': return list.filter(p=>p.status==='DONE');
      case 'archived': return list.filter(p=>p.status==='ARCHIVED');
      default: return list;
    }
  }, [projects, filter, query]);

  // 並び：更新日降順
  const rows = useMemo(()=> filtered.sort((a,b)=> new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [filtered]);

  // テスト：期限切れが含まれない
  useEffect(()=>{ console.assert(!rows.some(isExpired), 'Expired should be removed'); },[rows]);

  // メトリクス
  const active = projects.filter(p=>p.status!=="DONE" && p.status!=="ARCHIVED").length;
  const soonExpire = projects.filter(p=>daysLeft(p.createdAt,p.plan)<=3).length;
  const aiOK = projects.filter(p=>p.status==='AI_MIX_OK').length;

  return (
    <TooltipProvider>
      <div className="min-h-[100vh] w-full bg-[linear-gradient(180deg,#ffffff,#f7f8fb)] text-zinc-900">
        {/* Hero */}
        <div className="bg-[linear-gradient(120deg,#8b5cf6_0%,#60a5fa_100%)] text-white">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm/6 opacity-90">サイレント時間: 22:00–08:00 JST</div>
                <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
                <p className="mt-1 text-sm/6 opacity-90">保存期限は <strong>生成時</strong> から。期限切れは自動削除されます。</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20">新規プロジェクト</Button>
                <Button className="bg-white text-indigo-700 hover:bg-white/90">クレジット追加</Button>
              </div>
            </div>
            {/* メトリクス */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Metric title="作業中" value={active} icon={<Clock className="h-4 w-4"/>} />
              <Metric title="AI OK" value={aiOK} icon={<CheckCircle2 className="h-4 w-4"/>} />
              <Metric title="保存期限 3日以内" value={soonExpire} warn icon={<AlertTriangle className="h-4 w-4"/>} />
            </div>
          </div>
        </div>

        {/* メイン */}
        <div className="mx-auto max-w-6xl px-4 py-6">
          {/* フィルタ & 検索 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FilterChip active={filter==='all'} onClick={()=>setFilter('all')}>すべて</FilterChip>
              <FilterChip active={filter==='working'} onClick={()=>setFilter('working')}>作業中</FilterChip>
              <FilterChip active={filter==='aiok'} onClick={()=>setFilter('aiok')}>AI OK</FilterChip>
              <FilterChip active={filter==='done'} onClick={()=>setFilter('done')}>完了</FilterChip>
              <FilterChip active={filter==='archived'} onClick={()=>setFilter('archived')}>アーカイブ</FilterChip>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="曲名で検索…" className="w-64 bg-transparent text-sm outline-none placeholder:text-zinc-400" />
            </div>
          </div>

          {/* 横長リスト */}
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
            {rows.map(p => (
              <RowCard key={p.id} p={p} />
            ))}
            {rows.length===0 && (
              <div className="p-6 text-center text-sm text-zinc-500">該当するプロジェクトがありません</div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---- サブ：メトリック・フィルタ・行カード ----------------------------------
function Metric({title, value, icon, warn}:{title:string; value:number; icon?:React.ReactNode; warn?:boolean}){
  const tone = warn ? 'bg-white/15 text-white' : 'bg-white/10 text-white';
  return (
    <div className={`flex items-center justify-between rounded-lg ${tone} px-3 py-2`}> 
      <div className="text-sm/6">{title}</div>
      <div className="flex items-center gap-2"><span>{icon}</span><span className="text-lg font-semibold">{value}</span></div>
    </div>
  );
}

function FilterChip({active, children, onClick}:{active:boolean; children:React.ReactNode; onClick:()=>void}){
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-1 text-sm ${active? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}>{children}</button>
  );
}

function RowCard({ p }:{ p:Project }){
  const dleft = daysLeft(p.createdAt, p.plan);
  const {label, cls} = statusBadge(p.status);
  const prog = progressOf(p.status);
  const mid = p.status==='PREPPED'||p.status==='TWEAKING'||p.status==='MASTERING'||p.status==='REVIEW';
  const [open, setOpen] = useState(false);

  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-4 py-3">
      {/* サムネ */}
      <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 shadow-inner"/>

      {/* 本文 */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-medium text-zinc-900">{p.title}</div>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>
          <span className="text-xs text-zinc-500">作成 {fmtDate(p.createdAt)}・更新 {fmtDate(p.updatedAt)}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="w-56"><Progress value={prog} /></div>
          <span className="text-xs text-zinc-500">{prog}%</span>
          <Pill tone={dleft<=3? 'warn': undefined}>残り {Math.max(0,dleft)} 日（{p.plan}）</Pill>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2">
        {/* 途中離脱は『続きから』のみ */}
        {mid ? (
          <Button className="bg-indigo-600 text-white hover:bg-indigo-500"><Play className="mr-1 h-4 w-4"/>続きから</Button>
        ) : p.status==='AI_MIX_OK' ? (
          <>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-500"><Play className="mr-1 h-4 w-4"/>続きから</Button>
            <div className="relative">
              <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50" onClick={()=>setOpen(v=>!v)}>
                オプション<ChevronDown className="ml-1 h-4 w-4"/>
              </Button>
              {open && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-xl">
                  <MenuItem label="AI再MIX" sub="0.5 クレジット" icon={<RefreshCw className="h-4 w-4"/>} onClick={()=>setOpen(false)} />
                  <MenuItem label="微調整" sub="0.5 クレジット" icon={<SlidersHorizontal className="h-4 w-4"/>} onClick={()=>setOpen(false)} />
                  <MenuItem label="マスタリングへ" sub="0.5 クレジット" icon={<Wand2 className="h-4 w-4"/>} onClick={()=>setOpen(false)} />
                  <div className="my-1 h-px bg-zinc-200" />
                  <MenuItem label="共有（閲覧）" icon={<Share2 className="h-4 w-4"/>} onClick={()=>setOpen(false)} />
                </div>
              )}
            </div>
          </>
        ) : (
          // DONE / ARCHIVED など
          <div className="relative">
            <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50" onClick={()=>setOpen(v=>!v)}>
              オプション<ChevronDown className="ml-1 h-4 w-4"/>
            </Button>
            {open && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-xl">
                <MenuItem label="AI再MIX" sub="0.5 クレジット" icon={<RefreshCw className="h-4 w-4"/>} onClick={()=>setOpen(false)} />
                <MenuItem label="共有（閲覧）" icon={<Share2 className="h-4 w-4"/>} onClick={()=>setOpen(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({label, sub, icon, onClick}:{label:string; sub?:string; icon:React.ReactNode; onClick:()=>void}){
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-zinc-50">
      <span className="text-zinc-600">{icon}</span>
      <span className="flex-1 text-zinc-800">{label}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </button>
  );
}
