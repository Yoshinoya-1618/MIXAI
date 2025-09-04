// app/complete/page.tsx
'use client';

import * as React from 'react';
import Header from '../../components/common/Header';
import StyleTokens from '../../components/common/StyleTokens';
import Footer from '../../components/common/Footer';

export default function CompletePage(){
  const price = typeof window!=='undefined' ? (localStorage.getItem('utaseion:lastPrice') ?? '500') : '500';
  React.useEffect(()=>{
    const used = localStorage.getItem('utaseion:freeUsed')==='1';
    if(!used) localStorage.setItem('utaseion:freeUsed','1');
  },[]);

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="complete" />
      
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">処理完了</h1>
          <p className="mt-2 text-gray-600">音声の処理が正常に完了しました</p>
        </div>
        
        <div className="card p-6">
          <div className="mx-auto grid max-w-xl place-items-center text-center">
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-emerald-600">処理完了</h1>
            <p className="mt-1 text-sm text-slate-600">音声の補正が完了しました</p>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium">補正後の音声</div>
            <div className="mt-2">
              <audio className="w-full" controls preload="none" src="/sample-after.mp3" aria-label="補正後のプレビュー" />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm font-medium">ダウンロード料金</div>
            <div className="text-lg font-semibold text-indigo-600">¥{price}</div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium">ダウンロード形式</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Format title="MP3形式" body="標準的な音声ファイル" href="/api/download?fmt=mp3" />
              <Format title="WAV形式" body="高音質な音声ファイル" href="#" disabled />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/" className="btn-ghost">別の音声を処理</a>
            <a href="/demo" className="btn-ghost">デモページで確認</a>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            セキュリティについて：アップロードされたファイルは安全に保管され、7日後に自動削除されます。
          </p>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}

function Format({title, body, href, disabled}:{title:string; body:string; href:string; disabled?:boolean}){
  return (
    <a
      href={disabled?undefined:href}
      onClick={(e)=>{ if(disabled) e.preventDefault(); }}
      className={`block rounded-lg border px-4 py-3 ${disabled?'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400':'border-slate-200 bg-white hover:bg-slate-50'}`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-sm text-slate-600">{body}</div>
      <div className="mt-2 text-xs text-slate-500">{disabled?'準備中':'ダウンロード'}</div>
    </a>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
