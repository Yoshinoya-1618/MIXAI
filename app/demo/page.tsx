'use client'

import React, { useState } from 'react'
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

export default function DemoPage() {
  const router = useRouter()
  const [activeGenre, setActiveGenre] = useState('all')
  const [isPlaying, setIsPlaying] = useState<string | null>(null)

  const genres = [
    { id: 'all', label: 'すべて' },
    { id: 'jpop', label: 'J-POP' },
    { id: 'rock', label: 'ロック' },
    { id: 'ballad', label: 'バラード' },
    { id: 'anime', label: 'アニソン' },
    { id: 'vocaloid', label: 'ボカロ' }
  ]

  const demos = [
    {
      id: 1,
      title: 'シティポップ風アレンジ',
      genre: 'jpop',
      duration: '0:45',
      description: '爽やかなシティポップ風の楽曲。Clearテーマで処理',
      before: '/demo/citypop_before.mp3',
      after: '/demo/citypop_after.mp3'
    },
    {
      id: 2,
      title: 'ロックバラード',
      genre: 'rock',
      duration: '0:52',
      description: '力強いボーカルが特徴的なロックバラード。Warmテーマで処理',
      before: '/demo/rock_before.mp3',
      after: '/demo/rock_after.mp3'
    },
    {
      id: 3,
      title: '感動系バラード',
      genre: 'ballad',
      duration: '0:48',
      description: '繊細な表現が求められるバラード。Naturalテーマで処理',
      before: '/demo/ballad_before.mp3',
      after: '/demo/ballad_after.mp3'
    },
    {
      id: 4,
      title: 'アニメ主題歌風',
      genre: 'anime',
      duration: '0:55',
      description: '明るく元気なアニメ主題歌風の楽曲。Clearテーマで処理',
      before: '/demo/anime_before.mp3',
      after: '/demo/anime_after.mp3'
    },
    {
      id: 5,
      title: 'ボカロカバー',
      genre: 'vocaloid',
      duration: '0:42',
      description: '人気ボカロ曲のカバー。AIハモリ生成も使用',
      before: '/demo/vocaloid_before.mp3',
      after: '/demo/vocaloid_after.mp3'
    },
    {
      id: 6,
      title: 'アコースティック',
      genre: 'ballad',
      duration: '0:50',
      description: 'アコースティックギターと歌声のシンプルな構成',
      before: '/demo/acoustic_before.mp3',
      after: '/demo/acoustic_after.mp3'
    }
  ]

  const filteredDemos = activeGenre === 'all' 
    ? demos 
    : demos.filter(demo => demo.genre === activeGenre)

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="demo" />
      
      {/* ヒーローセクション */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            実際の仕上がりを聴いてみよう
          </h1>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            MIXAIで処理した作品例をBefore/Afterで比較できます。
            様々なジャンルの楽曲で効果を確認してください。
          </p>
        </div>
      </section>

      {/* ジャンルフィルター */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex gap-2 flex-wrap justify-center">
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => setActiveGenre(genre.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeGenre === genre.id
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* デモリスト */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDemos.map(demo => (
              <div key={demo.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-1">{demo.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{demo.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {genres.find(g => g.id === demo.genre)?.label}
                    </span>
                    <span>{demo.duration}</span>
                  </div>
                </div>

                {/* Before/After プレイヤー */}
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Before</span>
                      <button
                        onClick={() => setIsPlaying(isPlaying === `${demo.id}-before` ? null : `${demo.id}-before`)}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        {isPlaying === `${demo.id}-before` ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-gray-400 rounded-full transition-all duration-300"></div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-indigo-700">After (MIXAI処理済み)</span>
                      <button
                        onClick={() => setIsPlaying(isPlaying === `${demo.id}-after` ? null : `${demo.id}-after`)}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors"
                      >
                        {isPlaying === `${demo.id}-after` ? (
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 ml-0.5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="h-1 bg-indigo-200 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 処理内容の説明 */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-12">MIXAIの処理内容</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">音量バランス調整</h3>
              <p className="text-sm text-gray-600">
                ボーカルと伴奏の最適なバランスに自動調整。
                歌声が埋もれず、かつ自然に聴こえるよう処理します。
              </p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">ピッチ・タイミング補正</h3>
              <p className="text-sm text-gray-600">
                微細な音程のズレやリズムのズレを自然に補正。
                機械的にならない範囲で最適化します。
              </p>
            </div>
            <div className="bg-white rounded-xl p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold mb-2">マスタリング処理</h3>
              <p className="text-sm text-gray-600">
                配信プラットフォームに最適な音圧と音質に調整。
                YouTube、TikTokなどで綺麗に聴こえます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-2xl font-bold mb-4">気に入りましたか？</h2>
          <p className="text-gray-600 mb-8">
            無料トライアルで実際にあなたの楽曲をMIXしてみましょう
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push('/upload')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all shadow-lg font-medium"
            >
              無料で試してみる
            </button>
            <button 
              onClick={() => router.push('/pricing')}
              className="px-8 py-4 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
            >
              料金プランを見る
            </button>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}