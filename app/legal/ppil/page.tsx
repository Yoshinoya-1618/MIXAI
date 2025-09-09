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

export default function PpilPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">資金決済法に基づく表示</h1>
          
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-700">
                本表示は、資金決済に関する法律（資金決済法）第13条の規定に基づき、
                前払式支払手段（プリペイド型クレジット）について表示するものです。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">前払式支払手段の名称</h2>
              <p className="text-gray-700">MIXAIクレジット</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">発行者</h2>
              <table className="w-full">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-3 pr-4 font-medium text-gray-700 w-1/3">発行者名</td>
                    <td className="py-3">MIXAI株式会社</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-gray-700">所在地</td>
                    <td className="py-3">
                      〒150-0001<br />
                      東京都渋谷区神宮前1-1-1
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-gray-700">代表者</td>
                    <td className="py-3">代表取締役 田中 太郎</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">支払可能金額等</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium mb-2">購入単位</h3>
                  <ul className="list-disc ml-6 space-y-1 text-gray-700">
                    <li>1クレジット = 700円（税込）</li>
                    <li>最小購入単位：1クレジット</li>
                    <li>最大保有数：無制限</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">利用可能サービス</h3>
                  <p className="text-gray-700">
                    MIXAIサービス内での音声処理、ミックス、マスタリング等の
                    各種音声処理サービスにご利用いただけます。
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">有効期限</h2>
              <p className="text-gray-700">
                クレジットの有効期限は、購入日から6ヶ月間です。<br />
                有効期限を過ぎたクレジットは失効し、返金はいたしません。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">利用上の注意</h2>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>クレジットは、購入者本人のアカウントでのみ利用可能です</li>
                <li>他のユーザーへの譲渡・転売はできません</li>
                <li>現金との交換はできません</li>
                <li>利用規約に違反した場合、クレジットが失効する場合があります</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">未使用残高の確認方法</h2>
              <p className="text-gray-700">
                未使用のクレジット残高は、以下の方法で確認できます：
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-700">
                <li>マイページの「クレジット残高」セクション</li>
                <li>ダッシュボード上部の残高表示</li>
                <li>処理画面での残高表示</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">払戻しについて</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  原則として、購入済みクレジットの払戻しはいたしません。
                  ただし、以下の場合は例外として払戻しを行います：
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>法定払戻し：</strong>
                    サービス終了時など、法令で定められた場合
                  </li>
                  <li>
                    <strong>14日間返金保証：</strong>
                    初回購入から14日以内かつ未使用の場合
                  </li>
                  <li>
                    <strong>システム不具合：</strong>
                    当社の責めに帰すべき事由により利用できない場合
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">資金保全措置</h2>
              <p className="text-gray-700">
                当社は、資金決済法に基づき、お客様から受け取った前払金について、
                以下の方法により保全措置を講じています：
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium mb-2">供託による保全</p>
                <p className="text-gray-700">
                  基準日（毎年3月31日及び9月30日）における未使用残高の2分の1以上の額を
                  法務局に供託することにより保全しています。
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">苦情及び相談窓口</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">当社お問い合わせ窓口</h3>
                  <div className="ml-4 space-y-1 text-gray-700">
                    <p>メール: support@mixai.jp</p>
                    <p>電話: 03-xxxx-xxxx（平日10:00-18:00）</p>
                    <p>
                      <a href="/contact" className="text-indigo-600 hover:underline">
                        お問い合わせフォーム
                      </a>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">日本資金決済業協会</h3>
                  <div className="ml-4 space-y-1 text-gray-700">
                    <p>苦情・紛争解決措置として、以下の機関もご利用いただけます：</p>
                    <p className="mt-2">一般社団法人日本資金決済業協会</p>
                    <p>電話: 03-3556-6261</p>
                    <p>
                      <a href="https://www.s-kessai.jp/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        https://www.s-kessai.jp/
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">その他の注意事項</h2>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>
                  本表示内容は、法令の改正等により変更される場合があります
                </li>
                <li>
                  最新の情報は、本ページにて確認してください
                </li>
                <li>
                  クレジットの利用には、別途定める利用規約が適用されます
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">登録番号</h2>
              <p className="text-gray-700">
                前払式支払手段発行者登録番号：関東財務局長第xxxxx号
              </p>
              <p className="text-sm text-gray-600 mt-2">
                （注）実際のサービス開始時には正式な登録番号を記載します
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}