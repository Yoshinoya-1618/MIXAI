'use client'

import React from 'react'
import Header from '../components/common/Header'
import Footer from '../components/common/Footer'
import StyleTokens from '../components/common/StyleTokens'
import { InterruptedSessionBanner } from '../components/mix/InterruptedSessionBanner'
import { AnnouncementBanner } from '../components/announcements/AnnouncementBanner'
import { AnnouncementCard } from '../components/announcements/AnnouncementCard'

// =============================================
// Tokens / Utilities
// =============================================

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ')
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// =========================================
// Main Page
// =========================================
export default function MIXAIHomePreview() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <AnnouncementBanner />
      <Header currentPage="home" />
      <Hero />
      
      {/* セッション復旧通知 */}
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-4">
        <InterruptedSessionBanner />
      </div>
      
      <Demo />
      
      {/* お知らせカード */}
      <section className="py-8">
        <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
          <AnnouncementCard />
        </div>
      </section>
      
      <Teasers />
      <Upload />
      <Benefits />
      <HowItWorks />
      <Pricing />
      <Footer />
    </main>
  )
}


// =========================================
// Sections & Components
// =========================================
function A({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }){ 
  return (<a href={href ?? '#'} onClick={onClick} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded px-1 py-1">{children}</a>) 
}

// =============================================
// Hero
// =============================================
function Hero(){
  return (
    <section className="relative overflow-hidden">
      <HeroBG />
      <div className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 text-center">
        <h1 className="text-white text-[34px] sm:text-[44px] font-semibold leading-tight tracking-tight">歌声が、主役になる。</h1>
        <p className="mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-[15.5px] text-white/90">
          歌ってみた動画を、もっと気軽に。伴奏と歌声を入れるだけで、自然に整えます。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button className="btn-hero" onClick={() => window.location.href = '/upload'}>
            <span className="inline-flex items-center gap-1.5"><IconPlaySmall/>無料で始める</span>
          </button>
          <button className="btn-hero-ghost" onClick={()=>scrollToId('demo')}>デモを聴く</button>
        </div>

        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <HeroFeature icon={<IconDoc className="text-white"/>} title="多様な音声形式" desc="あなたに最適な音声形式でファイルを変換できます" />
          <HeroFeature icon={<IconSpark className="text-white"/>} title="AI技術で高品質変換" desc="最新の技術により自然で魅力的な歌声を実現" />
          <HeroFeature icon={<IconUsers className="text-white"/>} title="様々なシーンで活用" desc="YouTube、TikTok、商用利用まで幅広く対応" />
        </div>
      </div>
    </section>
  )
}
function HeroBG(){
  return (
    <div aria-hidden className="absolute inset-0 z-0">
      {/* solid gradient like reference */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#6D5EF7] via-[#8E66F7] to-[#22D3EE]" />
      {/* soft glows */}
      <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-[460px] h-[460px] rounded-full bg-white/10 blur-3xl" />
    </div>
  )
}

function HeroFeature({icon, title, desc}: {icon: React.ReactNode; title: string; desc?: string}){
  return (
    <div className="card-hero">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/15 grid place-items-center">{icon}</div>
        <div>
          <div className="font-medium text-white">{title}</div>
          {desc ? <p className="text-[13px] text-white/85">{desc}</p> : null}
        </div>
      </div>
    </div>
  )
}

function Logo(){
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full grid place-items-center bg-gradient-to-br from-[var(--brand)] via-[var(--brandAlt)] to-[var(--accent)]">
        <IconMic className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="font-semibold">MIXAI</span>
    </div>
  )
}

function PrimaryCTA({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400">
      {children}
    </button>
  )
}

// =============================================
// Demo
// =============================================
function Demo(){
  return (
    <section id="demo" className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">まずは耳で。違いは短い秒数でも伝わる。</h2>
        <div className="mt-6 card p-5 sm:p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <AudioCard label="Before" />
            <AudioCard label="After" tag="AI化" />
          </div>
          <div className="mt-5"><button className="btn-primary" onClick={() => window.location.href = '/upload'}>無料で試す</button></div>
        </div>
      </div>
    </section>
  )
}
function AudioCard({label, tag}: {label: string; tag?: string}){
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-700">{label}</div>
        <div className="flex items-center gap-2">
          {tag && <span className="px-2 py-[3px] rounded-md text-[11px] bg-[var(--brand)]/10 border border-[var(--brand)]/20">{tag}</span>}
          <MiniBars />
        </div>
      </div>
      {/* Audio要素の実音源は省略（Canvas動作安定のため） */}
      <div className="h-10 grid place-items-center text-[11px] text-gray-500 bg-gray-50 rounded">サンプル音源（省略）</div>
    </div>
  )
}
function MiniBars(){
  return (
    <div aria-hidden className="flex gap-[3px]">
      {Array.from({length:24}).map((_,i)=> (
        <div key={i} className="w-[3px] rounded-sm bg-gradient-to-t from-[var(--brand)]/40 via-[var(--brandAlt)]/40 to-[var(--accent)]/40" style={{height: `${10 + (i % 6) * 4}px`}} />
      ))}
    </div>
  )
}

// =============================================
// Teasers
// =============================================
function Teasers(){
  return (
    <section id="features" className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">AIで解析してMIX→マスタリングまで。すぐ投稿OK。</h2>
        <p className="mt-2 text-sm text-gray-600">instと歌声、ハモリも追加できます。60秒までの短い素材に対応しています。</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <TeaserCard icon={<IconUpload className="text-[color:var(--brand)]"/>} title="ファイルをアップロード" desc="instと歌声（WAV / MP3）をドラッグ&ドロップ" />
          <TeaserCard icon={<IconDownload className="text-[color:var(--brand)]"/>} title="変換・ダウンロード" desc="AIで解析してMIX→マスタリングまで。すぐ投稿OK。" />
        </div>
      </div>
    </section>
  )
}
function TeaserCard({icon, title, desc}: {icon: React.ReactNode; title: string; desc: string}){
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 grid place-items-center">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <p className="text-sm text-gray-700">{desc}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Upload (mock)
// =============================================
function Upload(){
  return (
    <section id="upload" className="relative z-10 py-12 sm:py-16 bg-white/60 border-y border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-6">
          <DropSlot kind="inst" />
          <DropSlot kind="ボーカル" />
        </div>
        <div className="mt-6 card p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-medium">+ ハモリ（任意）</div>
              <p className="text-sm text-gray-600">上3度・下3度・5度を自動生成してプレビュー。1つ選んで適用できます。</p>
            </div>
            <div className="flex gap-2">
              <Tab active>ハモリ生成</Tab>
              <Tab onClick={()=>{const el=document.getElementById('harmony-upload'); if(el){el.setAttribute('open','true'); el.scrollIntoView({behavior:'smooth', block:'start'})}}}>自分でアップロード</Tab>
            </div>
          </div>
        </div>
        {/* Harmony upload accordion */}
        <details id="harmony-upload" className="mt-4 card">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm text-gray-700">ハモリを自分でアップロード（クリックして開く）</summary>
          <div className="px-4 pb-4">
            <div className="mt-3">
              <DropSlot kind="ハモリ" />
            </div>
          </div>
        </details>
        <div className="mt-8 text-center">
          <button className="btn-primary text-lg px-8 py-4" onClick={() => window.location.href = '/upload'}>MIX開始</button>
          
        </div>
      </div>
    </section>
  )
}
function DropSlot({kind}: {kind: string}){
  return (
    <div className="rounded-xl border-2 border-dashed p-5 text-center bg-white border-gray-200">
      <IconUpload className="mx-auto text-[color:var(--brand)]" />
      <div className="mt-2 font-medium">{kind}</div>
      <div className="text-xs text-gray-600">ここにドラッグ / クリックして選択</div>
      <div className="mt-1 text-[11px] text-gray-500">対応: WAV / MP3（〜20MB・60秒）</div>
    </div>
  )
}
function Tab({children, active, onClick}: {children: React.ReactNode; active?: boolean; onClick?: () => void}){
  return (
    <button onClick={onClick} className={cx('px-3 py-1.5 rounded-lg text-sm border transition', active? 'bg-indigo-50 border-indigo-200 text-indigo-900':'bg-white border-gray-200 hover:bg-gray-50')}>
      {children}
    </button>
  )
}





// =============================================
// Benefits / How
// =============================================
function Benefits(){
  const items = [
    {icon:<IconSlider className="text-[color:var(--brand)]"/>, title:'プロ級の品質', lead:'AIによる高精度な音声処理', pts:['ピッチ補正で正確な音程に','タイミング調整でリズムをジャスト','マスタリングで配信クオリティ']},
    {icon:<IconBolt className="text-[color:var(--brand)]"/>, title:'簡単・高速', lead:'誰でもすぐに使える', pts:['アップロードするだけで自動処理','難しい設定は一切不要','数分で完成']},
    {icon:<IconShield className="text-[color:var(--brand)]"/>, title:'安全・安心', lead:'プライバシーを守る', pts:['アップロードファイルは非公開','プラン別の保存期間後に自動削除','セキュアな通信でデータを保護']},
  ]
  return (
    <section className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">機能一覧</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {items.map((it)=> (
            <article key={it.title} className="card p-5">
              <div className="text-2xl">{it.icon}</div>
              <h3 className="mt-2 font-semibold">{it.title}</h3>
              <p className="text-sm text-gray-700">{it.lead}</p>
              <ul className="mt-3 text-sm text-gray-700 space-y-1.5">
                {it.pts.map((p)=> (
                  <li key={p} className="flex items-start gap-2"><IconCheck className="mt-[3px] text-[color:var(--brand)]"/>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks(){
  const steps = [
    ['①','伴奏と歌声をアップロード','ドラッグ&ドロップまたはファイル選択','対応: WAV/MP3 ・ 〜20MB ・ 〜60秒'],
    ['②','AIがMIX・マスタリング','ピッチ補正・タイミング調整・音量バランスを自動処理','処理状況をリアルタイムで表示'],
    ['③','完成ファイルをダウンロード','満足いただけたらダウンロード','保存期間内は何度でもダウンロード可能']
  ]
  return (
    <section id="how" className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">MIXの始め方ガイド</h2>
        <ol className="mt-6 grid sm:grid-cols-3 gap-4">
          {steps.map(([n,t,sub,meta])=> (
            <li key={n} className="card p-5 flex flex-col">
              <div className="flex items-center gap-2"><div className="text-lg font-mono">{n}</div><div className="font-medium">{t}</div></div>
              <p className="mt-1 text-sm text-gray-700">{sub}</p>
              <div className="mt-3 text-[12px] text-gray-600">{meta}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}


// =============================================
// Pricing
// =============================================
function Pricing(){
  return (
    <section id="pricing" className="relative z-10 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">料金プラン</h2>
          <p className="mt-3 text-base text-gray-700">会員登録で7日間の無料トライアル（クレカ不要）</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Plan 
            name="Lite" 
            price="1,780" 
            credits="3" 
            features={[
              { label: "MIX調整機能", detail: "5軸（音量・ピッチ・タイミング・空間・音質）" },
              { label: "テーマ", detail: "3種類（Natural・Clear・Warm）" },
              { label: "ハモリ生成", detail: "全編対応 +0.5クレジット" },
              { label: "保存期間", detail: "7日間" },
              { label: "出力形式", detail: "MP3/WAV" }
            ]} 
          />
          <Plan 
            name="Standard" 
            price="3,980" 
            credits="6" 
            ribbon="人気" 
            features={[
              { label: "MIX調整機能", detail: "6軸 +明瞭度（Clarity）" },
              { label: "テーマ", detail: "5種類 +AI推奨テーマ" },
              { label: "ハモリ生成", detail: "全編対応 +0.5クレジット" },
              { label: "保存期間", detail: "15日間" },
              { label: "出力形式", detail: "MP3/WAV/FLAC" }
            ]} 
            highlight 
          />
          <Plan 
            name="Creator" 
            price="7,380" 
            credits="10" 
            features={[
              { label: "MIX調整機能", detail: "7軸 +存在感（Presence）" },
              { label: "テーマ", detail: "カスタムテーマ +参照曲解析" },
              { label: "ハモリ生成", detail: "全編対応 +0.5クレジット" },
              { label: "保存期間", detail: "30日間" },
              { label: "出力形式", detail: "MP3/WAV/FLAC" }
            ]} 
          />
        </div>
        <div className="text-center mt-8">
          <button className="btn-primary px-8 py-3" onClick={() => window.location.href = '/pricing'}>
            <span className="font-semibold">全プランを比較する</span>
          </button>
          <p className="mt-3 text-xs text-gray-600">詳細な機能比較表を確認できます</p>
        </div>
        
        {/* クレジット購入の案内 */}
        <div className="mt-12 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">サブスク不要！必要な分だけクレジット購入</h3>
            <p className="text-sm text-gray-600 mb-4">
              コンビニ・銀行振込でもOK。必要な時に必要な分だけ購入できます
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="font-bold text-indigo-600">1クレジット</div>
                <div className="text-xs text-gray-600">¥700</div>
                <div className="text-xs">¥700/曲</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-bold text-indigo-600">2クレジット</div>
                <div className="text-xs text-gray-600">¥1,380</div>
                <div className="text-xs">¥690/曲</div>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-indigo-300">
                <div className="font-bold text-indigo-600">5クレジット</div>
                <div className="text-xs text-gray-600">¥3,300</div>
                <div className="text-xs text-green-600 font-semibold">¥660/曲</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-bold text-indigo-600">10クレジット</div>
                <div className="text-xs text-gray-600">¥6,500</div>
                <div className="text-xs text-green-600 font-semibold">¥650/曲</div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="font-bold text-indigo-600">20クレジット</div>
                <div className="text-xs text-gray-600">¥12,000</div>
                <div className="text-xs text-green-600 font-semibold">¥600/曲</div>
              </div>
            </div>
            <button className="btn-secondary px-6 py-2" onClick={() => window.location.href = '/credits'}>
              クレジットを購入
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
function Plan({name, price, credits, features, ribbon, highlight}: {
  name: string; 
  price: string; 
  credits: string;
  features: {label: string; detail: string}[];
  ribbon?: string; 
  highlight?: boolean
}){
  return (
    <div className={cx(
      'relative rounded-xl border-2 p-6 text-left flex flex-col h-full transition-all',
      highlight ? 'bg-gradient-to-b from-indigo-50 to-white border-indigo-300 shadow-lg scale-105' : 'bg-white border-gray-200 hover:border-gray-300'
    )}>
      {ribbon && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold">
          {ribbon}
        </span>
      )}
      
      <div className="text-center pb-4 border-b border-gray-100">
        <div className="font-bold text-lg text-gray-900">{name}</div>
        <div className="mt-3">
          <span className="text-3xl font-bold">¥{price}</span>
          <span className="text-sm text-gray-600">/月</span>
        </div>
        <div className="mt-2 text-sm text-gray-700">
          月間 <span className="font-semibold text-indigo-600">{credits}クレジット</span>
        </div>
        <div className="mt-1 text-xs text-gray-600">
          {name === 'Lite' && '約¥593/曲でMIX可能'}
          {name === 'Standard' && '約¥663/曲でMIX可能'}
          {name === 'Creator' && '約¥738/曲でMIX可能'}
        </div>
      </div>
      
      <ul className="mt-4 space-y-3 flex-1">
        {features.map(f => (
          <li key={f.label} className="flex items-start gap-2">
            <div className="mt-0.5">
              <IconCheckSmall className="text-green-500" />
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium text-gray-900">{f.label}</div>
              <div className="text-xs text-gray-600">{f.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-6">
        <button 
          onClick={() => window.location.href = `/checkout?plan=${name.toLowerCase()}`} 
          className={cx(
            'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
            highlight 
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600' 
              : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
        >
          {highlight ? 'おすすめプラン' : 'このプランを選ぶ'}
        </button>
      </div>
    </div>
  )
}



// =============================================
// Icons
// =============================================
function IconDoc(props: any){return(<svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>)}
function IconSpark(props: any){return(<svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)}
function IconUsers(props: any){return(<svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>)}
function IconUpload(props: any){return(<svg {...props} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 5 17 10"/><line x1="12" y1="5" x2="12" y2="16"/></svg>)}
function IconDownload(props: any){return(<svg {...props} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>)}
function IconSlider(props: any){return(<svg {...props} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><circle cx="12" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="20" r="2"/></svg>)}
function IconBolt(props: any){return(<svg {...props} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)}
function IconShield(props: any){return(<svg {...props} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z"/><path d="M9 12l2 2 4-4"/></svg>)}
function IconCheck(props: any){return(<svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>)}
function IconCheckSmall(props: any){return(<svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>)}
function IconMic(props: any){return(<svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>)}
function IconPlaySmall(props: any){
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[color:var(--brand)]"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  )
}

function AuroraBackground() {
  const COLORS = {
    indigo: '#6366F1',
    blue: '#22D3EE',  
    magenta: '#F472B6',
  }
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full opacity-35 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.indigo} 0%, ${COLORS.blue} 100%)` }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl" 
           style={{ background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.magenta} 100%)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
           style={{ background: `linear-gradient(135deg, ${COLORS.magenta} 0%, ${COLORS.indigo} 100%)` }} />
    </div>
  )
}
