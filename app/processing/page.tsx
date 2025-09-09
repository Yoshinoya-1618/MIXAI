// app/processing/page.tsx
'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/common/Header';
import StyleTokens from '../../components/common/StyleTokens';
import Footer from '../../components/common/Footer';
import { apiFetch } from '../web/api';
import { CreditService } from '../../lib/credits';

type Meta = { 
  inst?:{name:string;durationSec:number}; 
  vox?:{name:string;durationSec:number}; 
  startedAt?:number;
  jobId?: string;
  theme?: string;
  harmony?: string;
};

function ProcessingContent(){
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('job');
  const harmony = searchParams.get('harmony') || 'upper';
  const theme = searchParams.get('theme') || 'clean_light';
  
  const meta:Meta|undefined = React.useMemo(()=>{
    try{ 
      const stored = JSON.parse(localStorage.getItem('utaseion:jobMeta')||'null')||undefined;
      return stored ? { ...stored, jobId, harmony, theme } : { jobId, harmony, theme };
    }catch{ 
      return { jobId, harmony, theme }; 
    }
  },[jobId, harmony, theme]);
  
  const [pct,setPct] = React.useState(0);
  const [stage,setStage] = React.useState<'processing'|'mixing'|'mastering'>('processing');
  const [error, setError] = React.useState<string | null>(null);
  const [holdId, setHoldId] = React.useState<string | null>(null);

  // MIX処理の開始
  React.useEffect(() => {
    if (!jobId) return;
    
    const startProcessing = async () => {
      try {
        // クレジットホールド
        const creditService = new CreditService();
        const userRes = await apiFetch('/api/v1/auth/me');
        const userData = await userRes.json();
        
        if (userData?.id) {
          const holdResult = await creditService.holdCredits({
            jobId,
            userId: userData.id,
            amount: 1.0, // 基本1クレジット
            type: 'hold',
            description: 'MIX処理'
          });
          
          if (!holdResult.success) {
            setError(holdResult.error || 'クレジット予約に失敗しました');
            return;
          }
          
          setHoldId(holdResult.holdId || null);
        }
        
        // MIX処理を開始
        const res = await apiFetch(`/api/v1/jobs/${jobId}/process`, {
          method: 'POST',
          body: JSON.stringify({
            harmony: harmony,
            theme: theme // 選択されたテーマ
          })
        });
        
        if (!res.ok) {
          throw new Error('MIX処理の開始に失敗しました');
        }
      } catch (err) {
        console.error('Processing error:', err);
        setError(err instanceof Error ? err.message : '処理中にエラーが発生しました');
      }
    };
    
    startProcessing();
  }, [jobId, harmony, theme]);
  
  // 進捗アニメーション
  React.useEffect(()=>{
    if (error) return;
    
    const id = setInterval(()=>{
      setPct(p=>{
        const n = Math.min(100, p+2);
        if(n>=60 && stage==='processing') setStage('mixing');
        if(n>=85 && stage!=='mastering') setStage('mastering');
        return n;
      });
    },120);
    return ()=>clearInterval(id);
  },[stage, error]);

  // 完了時の処理
  React.useEffect(()=>{
    if(pct>=100 && !error){
      const completeProcessing = async () => {
        try {
          // クレジット消費確定
          if (holdId) {
            const creditService = new CreditService();
            const userRes = await apiFetch('/api/v1/auth/me');
            const userData = await userRes.json();
            
            if (userData?.id) {
              await creditService.consumeCredits(holdId, userData.id);
            }
          }
          
          // ユーザーのプランを確認してMIXエディターへ遷移
          const userRes = await apiFetch('/api/v1/auth/me');
          const userData = await userRes.json();
          
          // プランを確認
          const subRes = await apiFetch('/api/v1/subscriptions/active');
          let planCode = 'prepaid'; // デフォルト
          
          if (subRes.ok) {
            const subData = await subRes.json();
            planCode = subData?.plan_code || 'prepaid';
          }
          
          // プランに応じたMIXエディターへ遷移
          router.push(`/mix/${planCode}/${jobId}?theme=${theme}&harmony=${harmony}`);
        } catch (err) {
          console.error('Completion error:', err);
        }
      };
      
      completeProcessing();
    }
  },[pct, router, error, holdId, jobId]);

  const deleteAt = React.useMemo(()=>{
    const base = (meta?.startedAt ?? Date.now()) + 7*24*60*60*1000;
    return new Date(base).toLocaleString();
  },[meta?.startedAt]);

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="processing" />
      
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">AI音声処理中</h1>
          <p className="mt-2 text-gray-600">高品質なMIXを作成しています</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
              <button 
                onClick={() => router.push('/upload')}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                アップロードに戻る
              </button>
            </div>
          )}
        </div>
        
        <div className="card p-6">
          <div className="grid grid-cols-[auto,1fr] items-start gap-6">
            <div className="kicker text-slate-700 text-sm">
              音<br/>声<br/>処<br/>理<br/>中
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">処理進捗</div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-indigo-600 transition-[width] duration-100" style={{width:`${pct}%`}} />
              </div>
              <div className="mt-2 text-sm text-slate-600">{pct}%完了</div>
              <div className="mt-1 text-sm text-slate-600">
                現在の状態：
                {stage === 'processing' && 'AI解析中'}
                {stage === 'mixing' && 'MIX処理中'}
                {stage === 'mastering' && 'マスタリング中'}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium text-slate-800">アップロード済みファイル</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Pill title="伴奏トラック" name={meta?.inst?.name} sec={meta?.inst?.durationSec} icon={<MusicalNoteIcon className="w-5 h-5" />}/>
              <Pill title="ボーカルトラック" name={meta?.vox?.name} sec={meta?.vox?.durationSec} icon={<MicrophoneIcon className="w-5 h-5" />}/>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-indigo-50/60 p-4">
            <div className="text-sm font-semibold">セキュリティと保存期間</div>
            <p className="mt-1 text-sm text-slate-700">
              アップロードされたファイルは安全に暗号化して保存され、他のユーザーからはアクセスできません。<br/>
              <span className="inline-flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> {deleteAt} に自動削除されます。</span><br/>
              処理完了後、いつでもダウンロードページから音声を取得できます。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/demo" className="btn-ghost">デモページで確認</a>
            <a href="/" className="btn-ghost">新しいファイルをアップロード</a>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}

function Pill({title,name,sec,icon}:{title:string;name?:string;sec?:number;icon:React.ReactElement}){
  return (
    <div className="pill">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-indigo-600" aria-hidden>{icon}</span>
        <div className="font-medium">{title}</div>
      </div>
      <div className="mt-1 text-sm text-slate-600">{name ?? '—'}</div>
      <div className="text-xs text-slate-500">{sec?`${Math.round(sec)}秒`:''}</div>
    </div>
  );
}

function MusicalNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3zM19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
