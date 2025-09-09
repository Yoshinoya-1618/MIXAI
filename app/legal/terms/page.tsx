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

export default function TermsPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">利用規約</h1>
        
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第1条（適用）</h2>
              <p className="text-gray-700">
              本規約は、MIXAI株式会社（以下「当社」といいます）が提供するAIミックス・マスタリングサービス
              「MIXAI」（以下「本サービス」といいます）の利用条件を定めるものです。
              登録ユーザーの皆様（以下「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。
            </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第2条（利用登録）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                本サービスの利用を希望する方は、本規約に同意の上、当社の定める方法によって利用登録を
                申請し、当社がこれを承認することによって、利用登録が完了するものとします。
              </li>
              <li>
                当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しない
                ことがあり、その理由については一切の開示義務を負わないものとします。
                <ul className="list-disc ml-6 mt-2">
                  <li>虚偽の事項を届け出た場合</li>
                  <li>本規約に違反したことがある者からの申請である場合</li>
                  <li>その他、当社が利用登録を相当でないと判断した場合</li>
                </ul>
              </li>
            </ol>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第3条（ユーザーIDおよびパスワードの管理）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理
                するものとします。
              </li>
              <li>
                ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、
                もしくは第三者と共用することはできません。
              </li>
            </ol>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第4条（料金および支払方法）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                ユーザーは、本サービスの利用にあたり、当社が別途定める料金を、当社が指定する方法により
                支払うものとします。
              </li>
              <li>
                サブスクリプションプランの料金は、毎月自動的に課金されます。解約手続きを行わない限り、
                自動的に更新されます。
              </li>
            </ol>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第5条（禁止事項）</h2>
              <p className="text-gray-700">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当社のサービスの運営を妨害するおそれのある行為</li>
              <li>第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
              <li>DRM等で保護された素材や権利侵害素材のアップロード</li>
              <li>自動化された手段（ボット、スクレイピング等）で本サービスにアクセスする行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第6条（本サービスの提供の停止等）</h2>
              <p className="text-gray-700">
              当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく
              本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
              <li>その他、当社が本サービスの提供が困難と判断した場合</li>
            </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第7条（著作権）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た
                コンテンツのみ、本サービスを利用してアップロードまたは処理するものとします。
              </li>
              <li>
                ユーザーが本サービスを利用してアップロードしたコンテンツの著作権は、ユーザーに帰属します。
              </li>
              <li>
                本サービスによって生成された音声ファイルの著作権は、元のコンテンツの権利者に帰属します。
              </li>
            </ol>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第8条（保証の否認および免責事項）</h2>
              <p className="text-gray-700">
              当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、
              特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）
              がないことを明示的にも黙示的にも保証しておりません。
            </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第9条（サービス内容の変更等）</h2>
              <p className="text-gray-700">
              当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を
              中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第10条（利用規約の変更）</h2>
              <p className="text-gray-700">
              当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更する
              ことができるものとします。変更後の本規約は、当社ウェブサイトに掲示された時点から
              効力を生じるものとします。
            </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第11条（個人情報の取扱い）</h2>
              <p className="text-gray-700">
              当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」
              に従い適切に取り扱うものとします。
            </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">第12条（準拠法・裁判管轄）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
              <li>
                本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。
              </li>
            </ol>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">お問い合わせ</h2>
              <p className="text-gray-700">本規約に関するお問い合わせは、以下までご連絡ください。</p>
              <div className="mt-3 space-y-1 text-gray-700">
                <p>MIXAI株式会社</p>
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

