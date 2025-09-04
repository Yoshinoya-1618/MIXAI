// components/NoticeBanner.tsx
'use client';

export function NoticeBanner() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-subtle">
        <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
          <li>アップロードは非公開で保管。7日以内に自動削除します。</li>
          <li>権利の確認はご利用者の責任です。DRM付き音源や市販カラオケのアップロードはできません。</li>
          <li>本サービスは法的助言を提供しません。</li>
        </ul>
      </div>
    </div>
  );
}
