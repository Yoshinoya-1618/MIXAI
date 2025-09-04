export const metadata = { title: 'お問い合わせ' }

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6" aria-labelledby="contact-title">
      <h1 id="contact-title" className="text-xl font-semibold">お問い合わせ</h1>
      <p>ご意見・不具合のご連絡は以下へお願いします。</p>
      <ul className="list-disc pl-5">
        <li>メール: contact@example.com</li>
      </ul>
    </main>
  )
}

