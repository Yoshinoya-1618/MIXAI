'use client'

import React from 'react'
import Header from '../components/common/Header'
import StyleTokens from '../components/common/StyleTokens'
import { InterruptedSessionBanner } from '../components/mix/InterruptedSessionBanner'

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
      <Header currentPage="home" />
      <Hero />
      
      {/* セッション復旧通知 */}
      <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-4">
        <InterruptedSessionBanner />
      </div>
      
      <Demo />
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
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 text-center">
        <h1 className="text-white text-[34px] sm:text-[44px] font-semibold leading-tight tracking-tight">歌声が、主役になる。</h1>
        <p className="mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-[15.5px] text-white/90">
          歌ってみた動画を、もっと気軽に。伴奏と歌声を入れるだけで、自然に整えます。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button className="btn-hero" onClick={()=>scrollToId('upload')}>
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
    <section id="demo" className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">まずは耳で。違いは短い秒数でも伝わる。</h2>
        <div className="mt-6 card p-5 sm:p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <AudioCard label="Before" />
            <AudioCard label="After" tag="AI化" />
          </div>
          <div className="mt-5"><button className="btn-primary" onClick={()=>scrollToId('upload')}>無料で試す</button></div>
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
    <section id="features" className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">ここにポンッと置くだけ</h2>
        <p className="mt-2 text-sm text-gray-600">伴奏と歌声、ハモリも追加できます。60秒までの短い素材に対応しています。</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <TeaserCard icon={<IconUpload className="text-[color:var(--brand)]"/>} title="ファイルをアップロード" desc="伴奏と歌声（WAV / MP3）をドラッグ&ドロップ" />
          <TeaserCard icon={<IconDownload className="text-[color:var(--brand)]"/>} title="変換・ダウンロード" desc="AIで整えて2mixを出力。すぐ投稿OK" />
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
    <section id="upload" className="py-12 sm:py-16 bg-white/60 border-y border-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-6">
          <DropSlot kind="伴奏" />
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
          <button className="btn-primary text-lg px-8 py-4" onClick={()=>alert('デモ：MIXを開始（プレビュー用）')}>MIX開始</button>
          
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
    {icon:<IconSlider className="text-[color:var(--brand)]"/>, title:'ちょうどいい補正', lead:'歌心を残す自然なタッチ', pts:['ピッチ/タイミングを軽やかに補正','抑揚やビブラートは尊重','不自然な加工感は最小限']},
    {icon:<IconBolt className="text-[color:var(--brand)]"/>, title:'すぐ使える', lead:'迷わず、待たせない', pts:['アップロード→自動処理','ログインなしでも試せる','WAV/MP3で保存も可能']},
    {icon:<IconShield className="text-[color:var(--brand)]"/>, title:'安心して使える', lead:'非公開保存・短期削除', pts:['外部共有は行いません','アクセスはあなたのみ','削除もワンタップで簡単']},
  ]
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">ちょうどよく、すぐ、安心</h2>
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
    ['①','伴奏と歌声を選ぶ','ドラッグ&ドロップ / タップで選択','対応: WAV/MP3 ・ 〜20MB ・ 60秒'],
    ['②','自動でMIX&マスタリング','ピッチ・タイミング・MIXからマスタリングまで行います','ブラウザで進行が見えます'],
    ['③','仕上がりを確認','満足したら保存。やり直しもOK','非公開保存・短期削除']
  ]
  return (
    <section id="how" className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-semibold">使い方は3ステップ</h2>
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
    <section id="pricing" className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="card p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold">歌ってみたを、もっと気軽に始めよう</h2>
          <p className="mt-3 text-sm text-gray-700">気に入らなければ料金はいただきません。7日間無料でお試しできます。</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Plan name="ライト" price="¥1,280" note="/月" bullets={[
              "毎月3クレジット",
              "基本プリセット3種（クリーン/やわらか/ボーカル持ち上げ）",
              "テンポのズレを軽くそろえる（±3%まで）",
              "ピッチ補正：候補を表示（自動適用なし）",
              "保存：7日間"
            ]} />
            <Plan name="スタンダード" price="¥2,480" note="/月" ribbon="人気" bullets={[
              "毎月6クレジット",
              "プリセット7種＋かんたん微調整（明るさ・広さ・前後感）",
              "曲のテンポに自動で合わせる（可変テンポOK）",
              "ピッチ補正：自動検出→ワンタップ修正",
              "保存：30日間"
            ]} highlight />
            <Plan name="クリエイター" price="¥5,980" note="/月" bullets={[
              "毎月10クレジット",
              "プリセット12種＋細かな微調整",
              "細かなテンポの揺れにも追従（テンポマップ）",
              "ピッチ補正：高精度に自動修正",
              "保存：90日間"
            ]} />
          </div>
          <div className="mt-6">
            <button className="btn-primary" onClick={()=>scrollToId('upload')}>無料で体験（7日間）</button>
          </div>
        </div>
      </div>
    </section>
  )
}
function Plan({name, price, note, bullets, ribbon, highlight}: {name: string; price: string; note: string; bullets: string[]; ribbon?: string; highlight?: boolean}){
  return (
    <div className={cx('relative rounded-lg border p-5 text-left flex flex-col h-full', highlight? 'bg-indigo-50 border-indigo-200':'bg-white border-gray-200')}>
      {ribbon && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded-full bg-[var(--brand)] text-white">{ribbon}</span>}
      <div className="font-semibold">{name}</div>
      <div className="text-lg font-mono mt-1">{price}<span className="text-xs">{note}</span></div>
      <ul className="mt-2 text-xs text-gray-700 space-y-1">
        {bullets.map(b=> <li key={b} className="flex items-start gap-1.5"><IconCheckSmall className="mt-[2px]" />{b}</li>)}
      </ul>
      <div className="flex-1" />
      <div className="mt-5"><button className={cx('w-full h-10 rounded-md text-sm font-semibold', highlight? 'bg-[var(--brand)] text-white':'bg-gray-900 text-white')}>プランを選択</button></div>
    </div>
  )
}


function Footer(){
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 text-xs text-gray-700">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <FooterCol title="Help" items={[["ヘルプセンター","#"],["使い方ガイド","#"],["FAQ","#"],["制限/対応フォーマット","#"]]} />
          <FooterCol title="ポリシー" items={[["利用規約","#"],["プライバシー","#"],["クッキー","#"],["コンテンツ","#"],["権利侵害の申告","#"]]} />
          <FooterCol title="販売情報" items={[["特商法表記","#"],["返金・キャンセル","#"],["支払い・領収書","#"]]} />
          <FooterCol title="安全と連絡" items={[["セキュリティ","#"],["データ削除リクエスト","#"],["通報","#"],["お問い合わせ","#"],["運営者情報","#"]]} />
        </div>
        <div className="mt-8 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-2"><Logo /><span>© {new Date().getFullYear()} MIXAI</span></div>
          <div className="flex gap-3">
            <A href="#">ステータス</A>
            <A href="#">更新情報</A>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({title, items}: {title: string; items: Array<[string, string]>}){
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map(([label, href])=> <li key={label}><a href={href} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded">{label}</a></li>)}
      </ul>
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
