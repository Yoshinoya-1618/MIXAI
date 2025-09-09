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

export default function RightsPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">権利ポリシー</h1>
          
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">基本方針</h2>
              <p className="text-gray-700">
                MIXAIは、すべてのユーザーの知的財産権を尊重し、著作権法およびその他の関連法規を遵守します。
                当サービスをご利用の際は、第三者の権利を侵害しないようご注意ください。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">アップロード素材について</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  ユーザーは、以下の条件を満たす素材のみをアップロードしてください：
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700">
                  <li>自身が著作権を保有している素材</li>
                  <li>著作権者から明確な許諾を得ている素材</li>
                  <li>著作権フリーまたはパブリックドメインの素材</li>
                  <li>適切なライセンスの下で利用が許可されている素材</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">禁止される素材</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  以下の素材のアップロードは固く禁止されています：
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700">
                  <li>他者の著作権を侵害する素材</li>
                  <li>DRM（デジタル著作権管理）で保護された素材</li>
                  <li>商用音楽や映画のサウンドトラック（許諾なし）</li>
                  <li>違法に取得または配布された素材</li>
                  <li>プライバシーや肖像権を侵害する素材</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">権利者の保護</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  MIXAIは著作権者の権利を保護するため、以下の措置を実施しています：
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700">
                  <li>権利侵害が疑われるコンテンツの速やかな削除</li>
                  <li>繰り返し違反するユーザーのアカウント停止</li>
                  <li>必要に応じた法的措置の実施</li>
                  <li>権利者からの削除要請への迅速な対応</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">免責事項</h2>
              <p className="text-gray-700">
                ユーザーがアップロードした素材に関する法的責任は、アップロードしたユーザー自身が負うものとします。
                MIXAIは、ユーザーによる権利侵害行為について一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">権利侵害の通報</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  著作権侵害を発見された場合は、以下の情報と共にご連絡ください：
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700">
                  <li>侵害されている著作物の詳細</li>
                  <li>侵害が疑われるコンテンツのURL</li>
                  <li>あなたが権利者であることの証明</li>
                  <li>連絡先情報</li>
                </ul>
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-gray-700">
                    通報は<a href="/contact" className="text-indigo-600 hover:underline font-medium">お問い合わせフォーム</a>から受け付けています。
                    または、直接 <a href="mailto:rights@mixai.jp" className="text-indigo-600 hover:underline">rights@mixai.jp</a> までご連絡ください。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">生成コンテンツの権利</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  MIXAIで処理・生成されたコンテンツの権利について：
                </p>
                <ul className="list-disc ml-6 space-y-2 text-gray-700">
                  <li>生成されたコンテンツの著作権は、元の素材の権利者に帰属します</li>
                  <li>MIXAIは生成されたコンテンツに対していかなる権利も主張しません</li>
                  <li>商用利用の可否は、元の素材のライセンスに準じます</li>
                </ul>
              </div>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">ポリシーの更新</h2>
              <p className="text-gray-700">
                本ポリシーは、法令の改正や当社のサービス内容の変更に応じて、
                随時更新される場合があります。重要な変更がある場合は、
                サービス内でお知らせいたします。
              </p>
            </section>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}

