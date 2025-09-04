export const metadata = { title: 'プライバシーポリシー' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6" aria-labelledby="privacy-title">
      <h1 id="privacy-title" className="text-xl font-semibold">プライバシーポリシー</h1>
      <p>
        アップロードされたファイルはprivateに保存され、7日後に自動削除します。取得する最小限の情報と目的を明記します。
      </p>
    </main>
  )
}

