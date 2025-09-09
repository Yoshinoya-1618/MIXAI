'use client'

import React from 'react'
import Header from '../../../components/common/Header'
import Footer from '../../../components/common/Footer'
import StyleTokens from '../../../components/common/StyleTokens'

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

export default function CookiesPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">クッキーポリシー</h1>
          
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">クッキー（Cookie）について</h2>
              <p className="text-gray-700">
                MIXAIでは、お客様により良いサービスを提供するため、クッキーおよび類似の技術を使用しています。
                このポリシーでは、当社がどのようにクッキーを使用し、お客様がどのように管理できるかについて説明します。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">クッキーとは</h2>
              <p className="text-gray-700">
                クッキーとは、ウェブサイトを訪問したときにお客様のブラウザに保存される小さなテキストファイルです。
                クッキーは、ウェブサイトがお客様のデバイスを認識し、設定を記憶し、
                お客様の利用体験を向上させるために使用されます。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">使用するクッキーの種類</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-indigo-600">必須クッキー</h3>
                  <p className="text-gray-700">
                    サービスの基本機能を提供するために必要不可欠なクッキーです。
                    これらがないと、ログイン状態の維持やセキュリティ機能が正常に動作しません。
                  </p>
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
                    <li>認証情報の保持</li>
                    <li>セキュリティトークン</li>
                    <li>言語設定</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-indigo-600">機能性クッキー</h3>
                  <p className="text-gray-700">
                    お客様の設定や選択を記憶し、パーソナライズされた体験を提供するためのクッキーです。
                  </p>
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
                    <li>テーマ設定（ダークモード等）</li>
                    <li>音量設定</li>
                    <li>最近使用したフィルター</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-indigo-600">分析クッキー</h3>
                  <p className="text-gray-700">
                    サービスの利用状況を分析し、改善するために使用するクッキーです。
                  </p>
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
                    <li>Google Analytics</li>
                    <li>ページビュー統計</li>
                    <li>エラートラッキング</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第三者のクッキー</h2>
              <p className="text-gray-700">
                当社は以下の第三者サービスを使用しており、これらのサービスが独自のクッキーを設定する場合があります：
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
                <li>Stripe（決済処理）</li>
                <li>Google Analytics（アクセス解析）</li>
                <li>Supabase（認証・データベース）</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">クッキーの管理方法</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  お客様は、ブラウザの設定を通じてクッキーを管理することができます：
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700">
                  <li>
                    <strong>すべてのクッキーを受け入れる：</strong>
                    すべての機能を最大限に活用できます
                  </li>
                  <li>
                    <strong>クッキーをブロックする：</strong>
                    一部の機能が制限される可能性があります
                  </li>
                  <li>
                    <strong>クッキーを削除する：</strong>
                    保存された設定やログイン情報がリセットされます
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">主要ブラウザでの設定方法</h2>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Safari
                  </a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/ja/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Firefox
                  </a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/ja-jp/microsoft-edge/microsoft-edge-でcookie-を削除する-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">ポリシーの変更</h2>
              <p className="text-gray-700">
                当社は、必要に応じて本クッキーポリシーを更新する場合があります。
                重要な変更がある場合は、サービス内でお知らせいたします。
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">お問い合わせ</h2>
              <p className="text-gray-700">
                クッキーポリシーに関するご質問は、以下までご連絡ください。
              </p>
              <div className="mt-3 space-y-1">
                <p>メール: privacy@mixai.jp</p>
                <p>
                  <a href="/contact" className="text-indigo-600 hover:underline">
                    お問い合わせフォーム
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}