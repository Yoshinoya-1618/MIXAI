'use client'

import React, { useState } from 'react'
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

export default function ContactPage() {
  const [formData, setFormData] = useState({
    category: 'general',
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const categories = [
    { value: 'general', label: '一般的なお問い合わせ' },
    { value: 'technical', label: '技術的なサポート' },
    { value: 'billing', label: '請求・支払いについて' },
    { value: 'feature', label: '機能リクエスト' },
    { value: 'bug', label: 'バグ報告' },
    { value: 'other', label: 'その他' }
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    
    // ここで実際の送信処理
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
        <StyleTokens />
        <AuroraBackground />
        <Header currentPage="contact" />
        
        <section className="relative px-4 sm:px-6 lg:px-8 py-32">
          <div className="mx-auto max-w-2xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">送信完了しました</h1>
            <p className="text-gray-600 mb-8">
              お問い合わせありがとうございます。<br />
              内容を確認の上、2営業日以内にご返信いたします。
            </p>
            <button 
              onClick={() => {
                setSent(false)
                setFormData({
                  category: 'general',
                  name: '',
                  email: '',
                  subject: '',
                  message: ''
                })
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              新しいお問い合わせ
            </button>
          </div>
        </section>
        
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen text-gray-900 bg-[var(--bg)]">
      <StyleTokens />
      <AuroraBackground />
      <Header currentPage="contact" />
      
      {/* ヒーローセクション */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            お問い合わせ
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            MIXAIについてのご質問、ご要望、お困りのことがございましたら、
            お気軽にお問い合わせください。
          </p>
        </div>
      </section>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* サイドバー */}
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="font-bold mb-4">お問い合わせ前に</h3>
                <p className="text-sm text-gray-600 mb-4">
                  よくある質問をご確認いただくと、すぐに解決する場合があります。
                </p>
                <a href="/faq" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  FAQを見る →
                </a>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="font-bold mb-4">返信について</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>通常2営業日以内に返信</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>土日祝日は返信が遅れる場合があります</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>緊急の技術的問題は優先対応</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
                <h3 className="font-bold mb-4">企業様向け</h3>
                <p className="text-sm text-gray-600 mb-4">
                  法人契約、APIの大規模利用、パートナーシップについては、
                  専用窓口をご用意しています。
                </p>
                <a href="mailto:business@mixai.jp" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  business@mixai.jp
                </a>
              </div>
            </aside>

            {/* フォーム */}
            <main className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="mb-6">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    お問い合わせ種別 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      お名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    件名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    お問い合わせ内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="できるだけ詳しくご記入ください"
                    required
                  />
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    ※ 個人情報は適切に管理し、お問い合わせ対応以外の目的では使用いたしません。
                    詳しくは<a href="/legal/privacy" className="text-indigo-600 hover:underline">プライバシーポリシー</a>をご確認ください。
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? '送信中...' : '送信する'}
                </button>
              </form>
            </main>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}