'use client'

import React, { useState, useEffect } from 'react'
import Header from '../../components/common/Header'
import StyleTokens from '../../components/common/StyleTokens'
import Footer from '../../components/common/Footer'

export default function FAQPage() {
  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <Header currentPage="faq" />
      <Hero />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  )
}


function Hero() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold">よくある質問</h1>
        <p className="mt-4 text-lg text-gray-700">
          MIXAIについてのよくあるご質問にお答えします
        </p>
      </div>
    </section>
  )
}

function FAQ() {
  const faqs = [
    {
      category: "基本機能",
      questions: [
        {
          q: "どのような楽曲に対応していますか？",
          a: "ポップス、バラード、ロック、アイドルソング等、幅広いジャンルに対応しています。ただし、DRM保護されたカラオケ音源や市販音源は使用できません。"
        },
        {
          q: "処理にはどれくらい時間がかかりますか？",
          a: "通常60秒以内の楽曲であれば2-3分で完了します。混雑時は若干お時間をいただく場合があります。Standard以上のプランでは処理が優先的に実行されます。"
        },
        {
          q: "どのようなファイル形式に対応していますか？",
          a: "入力：WAV、MP3（最大20MB、60秒）に対応しています。出力：MP3（320kbps）は全プラン、WAV（16bit/24bit）はプランに応じて選択可能です。"
        }
      ]
    },
    {
      category: "セキュリティ・プライバシー",
      questions: [
        {
          q: "アップロードしたファイルは安全ですか？",
          a: "すべてのファイルは非公開で保存され、署名付きURLでのみアクセス可能です。他のユーザーがアクセスすることは一切ありません。また、プランに応じた期間後に自動で完全削除されます。"
        },
        {
          q: "ファイルはどのくらいの期間保存されますか？",
          a: "Lite: 7日間、Standard・Creator: 30日間保存されます。期間終了後は完全に削除され、復旧はできません。"
        },
        {
          q: "個人情報の取り扱いについて教えてください",
          a: "アップロードされた音声ファイルは処理目的以外に使用されません。プライバシーポリシーに従って適切に管理されています。"
        }
      ]
    },
    {
      category: "料金・プラン",
      questions: [
        {
          q: "無料で試すことはできますか？",
          a: "はい、アカウント登録後に1回無料でお試しいただけます。品質をご確認の上、プランをご選択ください。"
        },
        {
          q: "プランの変更は可能ですか？",
          a: "はい、いつでもプランの変更が可能です。アップグレードは即座に反映され、ダウングレードは次回課金日から適用されます。"
        },
        {
          q: "返金は可能ですか？",
          a: "品質にご満足いただけない場合は、購入から7日以内であれば全額返金いたします。お気軽にサポートまでお問い合わせください。"
        }
      ]
    },
    {
      category: "技術的な問題",
      questions: [
        {
          q: "処理が失敗した場合はどうなりますか？",
          a: "処理が失敗した場合、クレジットは消費されません。エラーの詳細をお知らせいただければ、サポートチームが対応いたします。"
        },
        {
          q: "モバイルでも利用できますか？",
          a: "はい、スマートフォンやタブレットのブラウザからもご利用いただけます。専用アプリは不要です。"
        },
        {
          q: "アップロードができません",
          a: "ファイルサイズ（20MB以下）、形式（WAV/MP3）、時間（60秒以内）をご確認ください。問題が続く場合はサポートまでお問い合わせください。"
        }
      ]
    },
    {
      category: "商用利用・権利",
      questions: [
        {
          q: "商用利用は可能ですか？",
          a: "はい、すべてのプランで商用利用可能です。ただし、楽曲自体の著作権は別途必要に応じて処理してください。"
        },
        {
          q: "YouTubeやTikTokに投稿できますか？",
          a: "はい、各プラットフォームに最適化された音量レベル（-14 LUFS）で出力されるため、そのまま投稿いただけます。"
        },
        {
          q: "クレジット表記は必要ですか？",
          a: "MIXAIのクレジット表記は任意です。ただし、原楽曲の著作者・作詞者・作曲者のクレジットは適切に表記してください。"
        }
      ]
    }
  ]

  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {faqs.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-12">
            <h2 className="text-xl font-semibold mb-6 text-[var(--brand)]">{category.category}</h2>
            <div className="space-y-4">
              {category.questions.map((faq, faqIndex) => {
                const itemId = `${categoryIndex}-${faqIndex}`
                const isOpen = openItems.includes(itemId)
                
                return (
                  <div key={faqIndex} className="card overflow-hidden">
                    <button
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                      onClick={() => toggleItem(itemId)}
                    >
                      <h3 className="font-semibold text-gray-900 pr-4">{faq.q}</h3>
                      <IconChevron className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-semibold">お探しの答えが見つかりませんでしたか？</h2>
          <p className="mt-4 text-gray-700">
            技術的な問題やご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="text-left">
              <h3 className="font-semibold mb-2">メールサポート</h3>
              <p className="text-sm text-gray-600 mb-4">24時間以内に返信いたします</p>
              <button className="btn-primary">メールで問い合わせ</button>
            </div>
            <div className="text-left">
              <h3 className="font-semibold mb-2">リアルタイムチャット</h3>
              <p className="text-sm text-gray-600 mb-4">平日10:00-18:00対応</p>
              <button className="btn-ghost">チャットを開始</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


function IconChevron(props: any) {
  return (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}