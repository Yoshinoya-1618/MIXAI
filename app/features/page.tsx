'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'

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

export default function FeaturesPage() {
  const router = useRouter()
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="features" />
      
      {/* ヒーローセクション */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-3xl sm:text-4xl font-medium mb-6 leading-tight">
            やり取りの前に、まず"仕上がり"を聴けます。
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            ちょっと直したいところは、その場で。気に入ったら、そのまま保存。
          </p>
          <p className="text-sm text-gray-500 mb-12">
            小さなひらめきが、止まらないうちに形にしましょう。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push('/upload')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all shadow-lg"
            >
              無料で体験する
            </button>
            <button 
              onClick={() => router.push('/demo')}
              className="px-8 py-4 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              作品例を聴く
            </button>
          </div>
        </div>
      </section>

      {/* あるある → そっと解決 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-white/60 border-y border-gray-100">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h3 className="font-medium text-lg mb-3 text-gray-900">
                  依頼先を探すだけで、数日たってしまう。
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  → MIXAIなら、思い立ったときにすぐ始められます。
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-3 text-gray-900">
                  音のイメージを、言葉にするのがむずかしい。
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  → 目の前で聴きながら、"少し明るく""少し近く"など感覚で整えられます。
                </p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-medium text-lg mb-3 text-gray-900">
                  修正のお願いが気まずい。
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  → 自分のペースで何度でも試して、納得してから進められます。
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-3 text-gray-900">
                  締切が近いのに、まだ形になっていない。
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  → まず一度、仕上がりを聴いてから考えられます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 体験の流れ */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl sm:text-2xl font-semibold mb-8">体験の流れ</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <span className="text-indigo-600 font-medium">1</span>
              </div>
              <h3 className="font-medium mb-2">アップロード</h3>
              <p className="text-sm text-gray-600">素材を置くだけ。</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <span className="text-indigo-600 font-medium">2</span>
              </div>
              <h3 className="font-medium mb-2">聴く</h3>
              <p className="text-sm text-gray-600">すぐに全体の雰囲気を確認。</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <span className="text-indigo-600 font-medium">3</span>
              </div>
              <h3 className="font-medium mb-2">ちょっと整える</h3>
              <p className="text-sm text-gray-600">歌を少し前に／空気感を少しだけ—感覚で微調整。</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <span className="text-indigo-600 font-medium">4</span>
              </div>
              <h3 className="font-medium mb-2">仕上げる</h3>
              <p className="text-sm text-gray-600">納得の形で保存。あとからやり直しもできます。</p>
            </div>
          </div>
          
          <p className="text-center text-gray-500 mt-12 text-sm">
            気づいたときに、いつでもどうぞ。
          </p>
        </div>
      </section>

      {/* 併用のご提案 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6">併用のご提案</h2>
          <p className="text-gray-600 leading-relaxed">
            MIXAIで土台を素早くつくり、最後のこだわりをMIX師さんに。<br />
            そんな使い方も、もちろん歓迎です。
          </p>
        </div>
      </section>

      {/* よくある質問 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl sm:text-2xl font-semibold text-center mb-12">よくある質問</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="font-medium mb-3">Q. 難しい操作は必要ですか？</h3>
              <p className="text-gray-600">
                A. 「聴きながら少し動かす」だけ。細かい設定は意識しなくて大丈夫です。
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Q. 途中でやめても大丈夫？</h3>
              <p className="text-gray-600">
                A. いつでも中断・再開できます。気が向いたときに続きから。
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Q. プロの方とも併用できますか？</h3>
              <p className="text-gray-600">
                A. はい。下地づくりに使って、最終仕上げだけ依頼する方もいます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 静かなCTA */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-gray-500 mb-8">
            思いついた今の声で、すぐ聴ける。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button 
              onClick={() => router.push('/upload')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all shadow-lg"
            >
              無料で体験する
            </button>
            <button 
              onClick={() => router.push('/demo')}
              className="px-8 py-4 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              作品例を聴く
            </button>
          </div>
          
          <p className="text-sm">
            <a href="/pricing" className="text-gray-500 hover:text-gray-700 underline">
              料金を見る
            </a>
          </p>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}