'use client'

import React from 'react'
import Header from '../../components/common/Header'
import Footer from '../../components/common/Footer'
import StyleTokens from '../../components/common/StyleTokens'

const COLORS = {
  indigo: '#6366F1',
  blue: '#22D3EE', 
  magenta: '#F472B6',
  bg: '#F7F7F9',
}

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ')
}

export default function HelpPage() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="help" />
      
      <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25] mb-4">
            使い方ガイド
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            MIXAIを使って、プロ品質の音声処理を簡単に行う方法をステップバイステップで説明します
          </p>
        </div>

        <div className="grid gap-8">
          {/* Step 1 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3">ファイルをアップロード</h2>
                <p className="text-gray-600 mb-4">
                  歌声ファイル（ボーカル）と伴奏ファイル（インストルメンタル）を用意してアップロードします。
                  ハモリファイルも追加可能です。対応形式：MP3、WAV
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5 text-blue-600" />
                    ポイント
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• ファイルサイズ上限：20MB</li>
                    <li>• 最大処理時間：60秒</li>
                    <li>• ハモリは自動生成も可能（無料）</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3">テーマを選択</h2>
                <p className="text-gray-600 mb-4">
                  楽曲に合わせてMIXテーマを選択します。AIが楽曲を解析して最適なテーマを推奨します。
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Natural</h4>
                    <p className="text-sm text-gray-600">自然な仕上がり</p>
                  </div>
                  <div className="border border-blue-200 p-4 rounded-lg bg-blue-50">
                    <h4 className="font-medium mb-2 text-blue-900">Clear</h4>
                    <p className="text-sm text-blue-800">クリアで明瞭</p>
                  </div>
                  <div className="border border-purple-200 p-4 rounded-lg bg-purple-50">
                    <h4 className="font-medium mb-2 text-purple-900">Warm</h4>
                    <p className="text-sm text-purple-800">温かみのある音</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  ※上位プランではジャンル別テーマやカスタムテーマが利用可能
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-600 to-magenta-600 flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3">AI処理を実行</h2>
                <p className="text-gray-600 mb-4">
                  「処理を開始」ボタンをクリックすると、AIが自動的に音声を解析・処理します。
                  通常1-3分で完了します。
                </p>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-green-600" />
                    AI処理内容
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• ピッチ補正・タイミング調整</li>
                    <li>• ノイズ除去・音質向上</li>
                    <li>• 音量バランス最適化</li>
                    <li>• プロレベルのマスタリング</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-magenta-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3">結果をダウンロード</h2>
                <p className="text-gray-600 mb-4">
                  処理が完了すると、高品質に仕上がった音声ファイルをダウンロードできます。
                  MP3、WAV、FLAC形式で保存可能です（プランにより異なります）。
                </p>
                <div className="flex items-center gap-4">
                  <button className="btn-primary px-6 py-2">
                    無料で試してみる
                  </button>
                  <a href="/pricing" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    料金プランを見る →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-center mb-8">よくある質問</h2>
          <div className="grid gap-4">
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">処理にはどのくらい時間がかかりますか？</h3>
              <p className="text-gray-600">
                ファイルサイズと選択プランによって異なりますが、通常1-3分程度で完了します。
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">どのような音声ファイルに対応していますか？</h3>
              <p className="text-gray-600">
                MP3、WAV、FLAC形式に対応しています。最大50MBまでのファイルをアップロードできます。
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">処理した音声ファイルの保存期間は？</h3>
              <p className="text-gray-600">
                プランによって異なります。プリペイド/Lite：7日、Standard：15日、Creator：30日間保存されます。
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">クレジット購入とサブスクリプションの違いは？</h3>
              <p className="text-gray-600">
                クレジット購入は必要な時に必要な分だけ購入できる都度課金方式です。月1-2曲の方におすすめです。
                サブスクリプションは月額固定料金で、月3曲以上処理される方は割安になります。
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">クレジットカードを持っていませんが利用できますか？</h3>
              <p className="text-gray-600">
                はい、ご利用いただけます。クレジット購入ではコンビニ決済や銀行振込もご利用可能です。
                必要な時に必要な分だけクレジットを購入してMIXAIをお使いいただけます。
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">1クレジットで何ができますか？</h3>
              <p className="text-gray-600">
                1クレジットで最大60秒のフルMIX&マスタリング（1曲分）が可能です。ハモリ生成は全プラン無料です。
                プリペイドプランでCreator機能（HQマスター・強力ノイズ抑制込み）を利用する場合は+0.5クレジット必要です。
              </p>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-medium mb-2">購入したクレジットに有効期限はありますか？</h3>
              <p className="text-gray-600">
                いいえ、購入したクレジットに有効期限はありません。いつでもお好きなタイミングでご利用いただけます。
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}

// =========================================
// Shared Components
// =========================================


function AuroraBackground() {
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

// =========================================
// Icons
// =========================================

function LightBulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}