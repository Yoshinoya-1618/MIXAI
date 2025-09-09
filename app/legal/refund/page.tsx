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

export default function RefundPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">返金ポリシー</h1>
          
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3 text-green-800">14日間返金保証</h2>
              <p className="text-gray-700">
                MIXAIでは、お客様に安心してサービスをご利用いただくため、
                初回購入から14日以内であれば、理由を問わず全額返金いたします。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">返金対象</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-indigo-600">サブスクリプションプラン</h3>
                  <ul className="list-disc ml-6 space-y-2 text-gray-700">
                    <li>初回購入から14日以内の申請</li>
                    <li>無料トライアル期間中の解約（課金前）</li>
                    <li>システム障害により正常にサービスが利用できなかった場合</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-indigo-600">クレジット購入</h3>
                  <ul className="list-disc ml-6 space-y-2 text-gray-700">
                    <li>購入から14日以内かつ未使用のクレジット</li>
                    <li>システムエラーにより処理が失敗したクレジット</li>
                    <li>重複決済が発生した場合</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">返金対象外</h2>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>14日間を経過した購入</li>
                <li>使用済みのクレジット</li>
                <li>処理済みの音声ファイル</li>
                <li>利用規約違反によるアカウント停止の場合</li>
                <li>不正利用が疑われる場合</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">返金申請方法</h2>
              <div className="space-y-3">
                <p className="text-gray-700">返金をご希望の場合は、以下の手順でお申し込みください：</p>
                
                <ol className="list-decimal ml-6 space-y-3 text-gray-700">
                  <li>
                    <strong>申請フォームへアクセス</strong><br />
                    <a href="/contact" className="text-indigo-600 hover:underline">お問い合わせフォーム</a>から
                    「返金申請」を選択してください
                  </li>
                  <li>
                    <strong>必要情報の入力</strong>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li>注文番号または決済ID</li>
                      <li>購入日時</li>
                      <li>返金理由（任意）</li>
                      <li>登録メールアドレス</li>
                    </ul>
                  </li>
                  <li>
                    <strong>申請内容の確認</strong><br />
                    3営業日以内に返金可否をメールでご連絡いたします
                  </li>
                  <li>
                    <strong>返金処理</strong><br />
                    承認後、5-7営業日以内に元の決済方法に返金いたします
                  </li>
                </ol>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">返金処理期間</h2>
              <div className="space-y-2 text-gray-700">
                <p>返金処理には以下の期間を要します：</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>クレジットカード：5-7営業日</li>
                  <li>デビットカード：7-10営業日</li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  ※ カード会社によって反映時期が異なる場合があります
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">サービス不具合による返金</h2>
              <p className="text-gray-700">
                以下の場合は、期間を問わず返金対応いたします：
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-2 text-gray-700">
                <li>当社のシステム障害により処理が完了しなかった場合</li>
                <li>アップロードしたファイルが正常に処理されなかった場合</li>
                <li>生成された音声ファイルに重大な不具合がある場合</li>
                <li>その他、当社の責めに帰すべき事由による場合</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">注意事項</h2>
              <div className="space-y-3 text-gray-700">
                <p>返金に関して以下の点にご注意ください：</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    返金後、処理済みのファイルへのアクセスができなくなります
                  </li>
                  <li>
                    ダウンロード済みのファイルは削除をお願いする場合があります
                  </li>
                  <li>
                    返金処理完了後、同一アカウントでの再購入を制限する場合があります
                  </li>
                  <li>
                    繰り返しの返金申請はお断りする場合があります
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3 text-blue-800">デジタルコンテンツの性質について</h2>
              <p className="text-gray-700">
                MIXAIはデジタルコンテンツを扱うサービスです。
                音声ファイルの処理が開始された後は、原則として返金をお受けできません。
                ご購入前に、無料トライアルでサービスの品質をご確認いただくことをお勧めします。
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">お問い合わせ</h2>
              <p className="text-gray-700">
                返金ポリシーに関するご質問は、以下までご連絡ください。
              </p>
              <div className="mt-3 space-y-1">
                <p>メール: support@mixai.jp</p>
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