'use client'

import React, { useState } from 'react'
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

export default function FAQPage() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="faq" />
      
      <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25] mb-4">
            よくある質問
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            MIXAIについてのよくあるご質問にお答えします。お困りのことがあれば、まずはこちらをご確認ください
          </p>
        </div>

        <div className="grid gap-8">
          {/* 基本機能 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center">
                  <QuestionMarkIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">基本機能</h2>
                <p className="text-gray-600">
                  MIXAIの基本的な機能と使い方についての質問
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <FAQItem 
                question="どのようなジャンルに対応していますか？"
                answer="ポップス、ロック、バラード、EDM、R&B、アニソン、ボカロなど、幅広いジャンルに対応しています。カラオケ音源（DRM保護されたものや市販のもの）はご使用いただけません。"
              />
              <FAQItem 
                question="処理時間はどれくらいですか？"
                answer="60秒以内の楽曲であれば通常3分以内に処理が完了します。Creatorプランでは優先処理により、さらに高速に処理されます。"
              />
              <FAQItem 
                question="対応ファイル形式を教えてください。"
                answer="入力：WAV、MP3（最大20MB、最大60秒）に対応しています。出力：MP3（320kbps）で提供します。Standard以上のプランではWAV（16bit/44.1kHz）、FLAC形式も選択可能です。"
              />
            </div>
          </div>

          {/* プラン・料金 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                  <CurrencyYenIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">プラン・料金</h2>
                <p className="text-gray-600">
                  料金プランと支払いに関する質問
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <FAQItem 
                question="無料トライアルはありますか？"
                answer="会員登録特典として7日間の無料トライアルをご用意しています。Creatorプラン相当の全機能と1クレジット分（1曲分）お試しいただけます。クレジットカード登録不要でメール認証のみでご利用いただけます。7日後は自動的にプリペイドプランに移行します。"
              />
              <FAQItem 
                question="プラン変更はいつでもできますか？"
                answer="はい、マイページからいつでもプラン変更・解約が可能です。変更は次回更新日から適用されます。日割り計算は行いません。"
              />
              <FAQItem 
                question="支払い方法は何に対応していますか？"
                answer="サブスクリプションプランはクレジットカード（Visa、Mastercard、JCB、American Express）に対応しています。クレジット購入はクレジットカードのほか、コンビニ決済、銀行振込にも対応しています。Stripe決済システムを使用しているため、安全にお支払いいただけます。"
              />
            </div>
          </div>

          {/* 技術・品質 */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <CogIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">技術・品質</h2>
                <p className="text-gray-600">
                  AIの技術仕様と音質に関する質問
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <FAQItem 
                question="どのようなAI技術を使っていますか？"
                answer="最新のディープラーニング技術を使用し、独自開発のAIモデルで音声のピッチ補正、ノイズ除去、音質向上を自動的に行います。モデルは継続的に改善しています。"
              />
              <FAQItem 
                question="元の楽曲よりも品質が向上しますか？"
                answer="AIが音程のブレを補正し、ノイズを除去、音響バランスを最適化するため、プロフェッショナルな仕上がりになります。"
              />
              <FAQItem 
                question="アップロードした音源は安全ですか？"
                answer="お客様の音源は暗号化されて保存され、プランごとの保存期間（プリペイド/Lite: 7日、Standard: 15日、Creator: 30日）経過後に自動的に削除されます。第三者がアクセスすることはありません。"
              />
            </div>
          </div>

          {/* トラブルシューティング */}
          <div className="glass-card p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">トラブルシューティング</h2>
                <p className="text-gray-600">
                  エラーや問題が発生した場合の対処方法
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <FAQItem 
                question="アップロードでエラーが発生します"
                answer="ファイルサイズが20MBを超えていないか、対応形式（WAV、MP3）であるか、楽曲が60秒以内かご確認ください。解決しない場合はブラウザのキャッシュをクリアしてお試しください。"
              />
              <FAQItem 
                question="処理が完了しません"
                answer="通常1-3分以内に完了しますが、混雑時は時間がかかる場合があります。Creatorプランは最優先処理、Standardプランは優先処理されます。10分以上経っても完了しない場合は、サポートまでお問い合わせください。"
              />
              <FAQItem 
                question="ログインができません"
                answer="メールアドレスとパスワードが正しく入力されているかご確認ください。Googleアカウントでのログインも可能です。パスワードを忘れた場合は「パスワードを忘れた方」からリセットできます。"
              />
              <FAQItem 
                question="クレジットの繰り越しはできますか？"
                answer="サブスクリプションプランでは、未使用のクレジットは翌月に自動的に繰り越されます。プラン解約時には繰り越し分も失効します。都度購入のクレジットは有効期限なく使用できます。"
              />
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <div className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-4">まだ解決しませんか？</h2>
            <p className="text-gray-600 mb-6">
              上記で解決しない場合は、お気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary px-8 py-3">
                サポートに問い合わせ
              </button>
              <a href="/help" className="btn-secondary px-8 py-3">
                使い方ガイドを見る
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-4 flex items-center justify-between hover:bg-gray-50/50 px-4 rounded-lg transition-colors"
      >
        <h3 className="font-medium text-gray-900 pr-4">{question}</h3>
        <ChevronDownIcon 
          className={clsx(
            "w-5 h-5 text-gray-500 transition-transform flex-shrink-0",
            isOpen ? "rotate-180" : ""
          )} 
        />
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
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

function QuestionMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

function CurrencyYenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5l3 4.5m0 0l3-4.5M12 12v5.25M15 12H9m6 3H9m12-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}