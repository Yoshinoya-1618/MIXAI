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

export default function PrivacyPage() {
  const lastUpdated = '2025年9月6日'
  
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="legal" />
      
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">プライバシーポリシー</h1>
        
          <p className="text-sm text-gray-600 mb-8 text-center">最終更新日: {lastUpdated}</p>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-8">
            <div>
            <p>
              MIXAI株式会社（以下「当社」といいます）は、本サービスにおける個人情報の取扱いについて、
              以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
            </p>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第1条（個人情報）</h2>
            <p>
              「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、
              当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる
              情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の
              個人を識別できる情報（個人識別情報）を指します。
            </p>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第2条（個人情報の収集方法）</h2>
            <p>
              当社は、ユーザーが利用登録をする際に氏名、メールアドレスなどの個人情報をお尋ねすることがあります。
              また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、
              当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下「提携先」といいます）などから
              収集することがあります。
            </p>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第3条（個人情報を収集・利用する目的）</h2>
            <p>当社が個人情報を収集・利用する目的は、以下のとおりです。</p>
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>当社サービスの提供・運営のため</li>
              <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
              <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等の案内のため</li>
              <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
              <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
              <li>ユーザーにご自身の登録情報の閲覧や変更、削除、ご利用状況の閲覧を行っていただくため</li>
              <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
              <li>上記の利用目的に付随する目的</li>
            </ol>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第4条（利用目的の変更）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を
                変更するものとします。
              </li>
              <li>
                利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、ユーザーに通知し、
                または本ウェブサイト上に公表するものとします。
              </li>
            </ol>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第5条（個人情報の第三者提供）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を
                提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
                <ul className="list-disc ml-6 mt-2">
                  <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                  <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                  <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                  <li>予め次の事項を告知あるいは公表し、かつ当社が個人情報保護委員会に届出をしたとき</li>
                </ul>
              </li>
            </ol>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第6条（個人情報の開示）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                当社は、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。
                ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこと
                もあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
                <ul className="list-disc ml-6 mt-2">
                  <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
                  <li>当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
                  <li>その他法令に違反することとなる場合</li>
                </ul>
              </li>
              <li>
                前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として
                開示いたしません。
              </li>
            </ol>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第7条（個人情報の訂正および削除）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                ユーザーは、当社の保有する自己の個人情報が誤った情報である場合には、当社が定める手続きにより、
                当社に対して個人情報の訂正、追加または削除（以下「訂正等」といいます）を請求することができます。
              </li>
              <li>
                当社は、ユーザーから前項の請求を受けてその請求に応じる必要があると判断した場合には、遅滞なく、
                当該個人情報の訂正等を行うものとします。
              </li>
              <li>
                当社は、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは
                遅滞なく、これをユーザーに通知します。
              </li>
            </ol>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第8条（個人情報の利用停止等）</h2>
            <p>
              当社は、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の
              手段により取得されたものであるという理由により、その利用の停止または消去（以下「利用停止等」
              といいます）を求められた場合には、遅滞なく必要な調査を行い、その結果に基づき、個人情報の
              利用停止等を行い、その旨本人に通知します。
            </p>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第9条（アップロードファイルの取り扱い）</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">重要：ファイルの保存と削除について</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>アップロードされたファイルは<strong>完全にプライベート</strong>に保存されます</li>
                <li>他のユーザーがアクセスすることはできません</li>
                <li>プランに応じた保存期間後、<strong>自動的に削除</strong>されます
                  <ul className="list-disc ml-6 mt-1">
                    <li>Liteプラン: 7日後</li>
                    <li>Standardプラン: 15日後</li>
                    <li>Creatorプラン: 30日後</li>
                  </ul>
                </li>
                <li>ユーザー自身でいつでも削除可能です</li>
              </ul>
            </div>
            </div>

            <div>
            <h2 className="text-xl font-semibold mb-4">第10条（プライバシーポリシーの変更）</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知
                することなく、変更することができるものとします。
              </li>
              <li>
                当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載した
                ときから効力を生じるものとします。
              </li>
            </ol>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">お問い合わせ窓口</h2>
            <p>本ポリシーに関するお問い合わせは、以下の窓口までお願いいたします。</p>
            <div className="mt-3 space-y-1">
              <p>MIXAI株式会社</p>
              <p>〒150-0001 東京都渋谷区神宮前1-1-1</p>
              <p>メール: privacy@mixai.jp</p>
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

