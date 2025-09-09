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

export default function TokushohoPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">特定商取引法に基づく表示</h1>
        
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            {/* 事業者情報 */}
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">事業者情報</h2>
            <table className="w-full">
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700 w-1/3">販売事業者名</td>
                  <td className="py-3">よしの屋　※個人事業主</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">代表者</td>
                  <td className="py-3">吉野 有翔</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">所在地</td>
                  <td className="py-3">
                    ※請求があれば遅滞なく開示します
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">電話番号</td>
                  <td className="py-3">
                    ※請求があれば遅滞なく開示します
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">メールアドレス</td>
                  <td className="py-3">support@mixai.jp</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">適格請求書発行事業者<br />登録番号</td>
                  <td className="py-3">T1234567890123</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 販売価格 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">販売価格（税込）</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">サブスクリプションプラン</h3>
                <ul className="space-y-2 ml-4">
                  <li>• Liteプラン: 月額1,780円（税込）</li>
                  <li>• Standardプラン: 月額3,980円（税込）</li>
                  <li>• Creatorプラン: 月額7,380円（税込）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">追加クレジット</h3>
                <ul className="ml-4">
                  <li>• 1クレジット: 700円（税込）</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600">
                ※ 無料トライアル期間（7日間）あり。トライアル期間中は0円。
              </p>
            </div>
          </div>

          {/* 支払方法・時期 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">支払方法・支払時期</h2>
            <table className="w-full">
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700 w-1/3">支払方法</td>
                  <td className="py-3">
                    クレジットカード<br />
                    <span className="text-sm text-gray-600">（Visa、Mastercard、American Express、JCB）</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">支払時期</td>
                  <td className="py-3">
                    <div className="space-y-2">
                      <div>
                        <strong>サブスクリプション:</strong><br />
                        毎月の更新日に自動課金
                      </div>
                      <div>
                        <strong>追加クレジット:</strong><br />
                        購入時に即時決済
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* サービス提供時期 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">サービス提供時期</h2>
            <p>決済完了後、即時にサービスをご利用いただけます。</p>
            <p className="mt-2 text-sm text-gray-600">
              ※ AIミックス処理の完了時間は、アップロードされたファイルのサイズや
              サーバーの混雑状況により、通常3〜10分程度かかります。
            </p>
          </div>

          {/* 返金ポリシー */}
          <div>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">返金ポリシー</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2 text-indigo-600">【14日間返金保証】</h3>
                <p className="text-gray-700">
                  お客様に安心してご利用いただくため、初回購入から14日以内であれば、
                  理由を問わず全額返金いたします。
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2 text-indigo-600">【サービス不具合による返金】</h3>
                <p className="text-gray-700">
                  当社のサービスに不具合があり、正常にご利用いただけない場合は、
                  期間を問わず全額返金いたします。
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">返金申請方法</h3>
                <ul className="space-y-1 ml-4 text-gray-700">
                  <li>• お問い合わせフォームより返金希望の旨をご連絡ください</li>
                  <li>• 注文番号と返金理由をお知らせください</li>
                  <li>• 3営業日以内に返金処理を行います</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">注意事項</h3>
                <ul className="space-y-1 ml-4 text-gray-700">
                  <li>• デジタルコンテンツの性質上、ダウンロード済みの音声ファイルの削除をお願いする場合があります</li>
                  <li>• 返金後、同一アカウントでの再購入はお断りする場合があります</li>
                  <li>• 不正利用が疑われる場合は返金をお断りすることがあります</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 動作環境 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">動作環境</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium mb-2">推奨ブラウザ</h3>
                <ul className="ml-4">
                  <li>• Google Chrome（最新版）</li>
                  <li>• Safari（最新版）</li>
                  <li>• Microsoft Edge（最新版）</li>
                  <li>• Firefox（最新版）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">推奨環境</h3>
                <ul className="ml-4">
                  <li>• インターネット接続: ブロードバンド環境推奨</li>
                  <li>• JavaScript: 有効にする必要があります</li>
                  <li>• Cookie: 有効にする必要があります</li>
                </ul>
              </div>
            </div>
          </div>

          {/* その他 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">その他</h2>
            <table className="w-full">
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700 w-1/3">商品以外の必要料金</td>
                  <td className="py-3">
                    インターネット接続に必要な通信費用はお客様のご負担となります。
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">申込有効期限</td>
                  <td className="py-3">
                    期限はございません。ただし、キャンペーン価格等には期限がある場合があります。
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-700">不良品について</td>
                  <td className="py-3">
                    デジタルコンテンツのため不良品という概念はございませんが、
                    システムエラー等により正常にサービスが提供できなかった場合は、
                    個別に対応させていただきます。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 問い合わせ */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">お問い合わせ</h2>
            <p>
              本表示に関するお問い合わせは、以下までご連絡ください。
            </p>
            <div className="mt-3 space-y-1">
              <p>メール: support@mixai.jp</p>
              <p>
                <a href="/contact" className="text-blue-600 hover:underline">
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