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

export default function DocsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('getting-started')

  const sections = [
    { id: 'getting-started', title: 'はじめに', icon: '🚀' },
    { id: 'api', title: 'API リファレンス', icon: '⚡' },
    { id: 'guides', title: 'ガイド', icon: '📚' },
    { id: 'troubleshooting', title: 'トラブルシューティング', icon: '🔧' }
  ]

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="docs" />
      
      {/* ヒーローセクション */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            ドキュメント
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            MIXAIの使い方、API仕様、技術的な詳細情報をご確認いただけます。
          </p>
          
          {/* 検索バー */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="ドキュメントを検索..."
                className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* サイドバー */}
            <aside className="lg:col-span-1">
              <nav className="sticky top-24 space-y-2">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span className="font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* メインコンテンツ */}
            <main className="lg:col-span-3">
              {activeSection === 'getting-started' && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold mb-6">はじめに</h2>
                  
                  <div className="prose prose-gray max-w-none">
                    <h3 className="text-lg font-bold mt-8 mb-4">MIXAIとは</h3>
                    <p className="text-gray-600 mb-4">
                      MIXAIは、AIを活用した音楽ミキシング・マスタリングサービスです。
                      歌ってみた動画の制作者や音楽クリエイターが、プロ品質のMIXを手軽に実現できます。
                    </p>

                    <h3 className="text-lg font-bold mt-8 mb-4">主な機能</h3>
                    <ul className="list-disc pl-6 space-y-2 text-gray-600">
                      <li>自動MIX処理：AIが最適なバランスを自動調整</li>
                      <li>ピッチ補正：音程の微調整を自動で実行</li>
                      <li>タイミング補正：リズムのズレを自然に修正</li>
                      <li>マスタリング：配信プラットフォームに最適な音圧調整</li>
                      <li>ハモリ生成：AIが3パターンのハーモニーを自動生成</li>
                    </ul>

                    <h3 className="text-lg font-bold mt-8 mb-4">クイックスタート</h3>
                    <ol className="list-decimal pl-6 space-y-4 text-gray-600">
                      <li>
                        <strong>アカウント作成</strong><br />
                        メールアドレスまたはGoogleアカウントで登録
                      </li>
                      <li>
                        <strong>ファイルアップロード</strong><br />
                        伴奏（インスト）とボーカルファイルを選択
                      </li>
                      <li>
                        <strong>テーマ選択</strong><br />
                        Natural、Clear、Warmから選択
                      </li>
                      <li>
                        <strong>処理開始</strong><br />
                        1〜3分で処理完了
                      </li>
                      <li>
                        <strong>ダウンロード</strong><br />
                        MP3またはWAV形式で保存
                      </li>
                    </ol>

                    <div className="mt-8 p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-900">
                        <strong>ヒント：</strong>最初は無料トライアルで全機能をお試しください。
                        7日間、Creatorプラン相当の機能が利用できます。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'api' && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold mb-6">API リファレンス</h2>
                  
                  <div className="prose prose-gray max-w-none">
                    <div className="p-4 bg-yellow-50 rounded-lg mb-6">
                      <p className="text-sm text-yellow-900">
                        <strong>注意：</strong>API機能は現在開発中です。
                        2024年春頃の提供開始を予定しています。
                      </p>
                    </div>

                    <h3 className="text-lg font-bold mt-8 mb-4">認証</h3>
                    <p className="text-gray-600 mb-4">
                      すべてのAPIリクエストには、APIキーが必要です。
                      APIキーはダッシュボードから発行できます。
                    </p>
                    
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
                      <pre className="text-sm">
{`curl -X POST https://api.mixai.jp/v1/mix \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "instrumental=@inst.wav" \\
  -F "vocal=@vocal.wav" \\
  -F "theme=natural"`}
                      </pre>
                    </div>

                    <h3 className="text-lg font-bold mt-8 mb-4">エンドポイント</h3>
                    
                    <div className="space-y-6">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-bold">POST</span>
                          <code className="text-sm font-mono">/v1/mix</code>
                        </div>
                        <p className="text-sm text-gray-600">新しいMIXジョブを作成</p>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-bold">GET</span>
                          <code className="text-sm font-mono">/v1/mix/:jobId</code>
                        </div>
                        <p className="text-sm text-gray-600">ジョブのステータスを取得</p>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-bold">GET</span>
                          <code className="text-sm font-mono">/v1/mix/:jobId/download</code>
                        </div>
                        <p className="text-sm text-gray-600">完成ファイルをダウンロード</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'guides' && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold mb-6">ガイド</h2>
                  
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="text-lg font-bold mb-2">最適な録音環境の作り方</h3>
                      <p className="text-gray-600 mb-4">
                        高品質なMIXのためには、クリーンな録音が重要です。
                        ノイズを最小限に抑える録音環境の構築方法を解説します。
                      </p>
                      <span className="text-indigo-600 font-medium text-sm">詳しく読む →</span>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="text-lg font-bold mb-2">テーマの選び方</h3>
                      <p className="text-gray-600 mb-4">
                        Natural、Clear、Warmの3つのテーマから、
                        楽曲に最適なものを選ぶためのガイドラインです。
                      </p>
                      <span className="text-indigo-600 font-medium text-sm">詳しく読む →</span>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="text-lg font-bold mb-2">ハモリ生成の活用法</h3>
                      <p className="text-gray-600 mb-4">
                        AI生成のハーモニーを効果的に使用する方法と、
                        各パターンの特徴について説明します。
                      </p>
                      <span className="text-indigo-600 font-medium text-sm">詳しく読む →</span>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="text-lg font-bold mb-2">配信プラットフォーム別の最適化</h3>
                      <p className="text-gray-600 mb-4">
                        YouTube、TikTok、ニコニコ動画など、
                        各プラットフォームに最適な設定を解説します。
                      </p>
                      <span className="text-indigo-600 font-medium text-sm">詳しく読む →</span>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'troubleshooting' && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-2xl font-bold mb-6">トラブルシューティング</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold mb-4">よくある問題と解決方法</h3>
                      
                      <div className="space-y-4">
                        <details className="border border-gray-200 rounded-lg">
                          <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50">
                            <span className="font-medium">ファイルがアップロードできない</span>
                          </summary>
                          <div className="px-6 pb-4">
                            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                              <li>ファイル形式がWAVまたはMP3であることを確認</li>
                              <li>ファイルサイズが20MB以下であることを確認</li>
                              <li>ファイル名に特殊文字が含まれていないか確認</li>
                              <li>ブラウザのキャッシュをクリアして再試行</li>
                            </ul>
                          </div>
                        </details>
                        
                        <details className="border border-gray-200 rounded-lg">
                          <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50">
                            <span className="font-medium">処理が完了しない</span>
                          </summary>
                          <div className="px-6 pb-4">
                            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                              <li>通常は1〜3分で完了します</li>
                              <li>混雑時は最大10分程度かかる場合があります</li>
                              <li>10分以上経過しても完了しない場合はサポートへ連絡</li>
                              <li>ページをリロードして状態を確認</li>
                            </ul>
                          </div>
                        </details>
                        
                        <details className="border border-gray-200 rounded-lg">
                          <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50">
                            <span className="font-medium">音質が期待と異なる</span>
                          </summary>
                          <div className="px-6 pb-4">
                            <ul className="list-disc pl-6 space-y-2 text-gray-600">
                              <li>元の録音品質を確認（ノイズ、音割れなど）</li>
                              <li>適切なテーマが選択されているか確認</li>
                              <li>プランによって利用可能な調整軸が異なります</li>
                              <li>再処理して別のテーマを試す</li>
                            </ul>
                          </div>
                        </details>
                      </div>
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold mb-2">それでも解決しない場合</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        サポートチームがお手伝いします。以下の情報を添えてお問い合わせください：
                      </p>
                      <ul className="list-disc pl-6 text-sm text-gray-600 space-y-1">
                        <li>エラーメッセージのスクリーンショット</li>
                        <li>使用しているブラウザとバージョン</li>
                        <li>問題が発生した日時</li>
                        <li>ジョブID（処理済みの場合）</li>
                      </ul>
                      <button 
                        onClick={() => router.push('/contact')}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        サポートに連絡
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}