// components/FeaturesTimeline.tsx
'use client';

function Item({
  title,
  body,
  pinLeft,
}: {
  title: string;
  body: string;
  pinLeft?: boolean;
}) {
  return (
    <div className="relative rounded-xl bg-white p-6 shadow-subtle ring-1 ring-neutral-200">
      <div
        aria-hidden
        className={`absolute top-6 hidden h-3 w-3 rounded-full border-2 border-white bg-accent shadow-subtle md:block ${
          pinLeft ? '-left-6' : '-right-6'
        }`}
      />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{body}</p>
    </div>
  );
}

export function FeaturesTimeline() {
  const left = [
    {
      title: 'すぐ分かる変化',
      body: 'Before/After を数クリックで比較。完成イメージを短時間で確認できます。',
    },
    {
      title: 'やりすぎない補正',
      body: '歌の表情はそのままに、気になるズレと音程だけを優しく整えます。',
    },
    {
      title: '直感UI',
      body: 'アップロード → プレビュー → 書き出し。迷わない導線設計です。',
    },
  ];
  const right = [
    {
      title: '軽くて速い',
      body: 'ブラウザ完結。通常は1〜2分で書き出しまで完了します。',
    },
    {
      title: '安全な保存',
      body: '非公開ストレージと署名URLで配布。7日で自動削除されます。',
    },
    {
      title: '仕上げ済み',
      body: 'SNSに馴染む音量（-14 LUFS / -1 dBTP）で出力します。',
    },
  ];

  return (
    <div className="relative grid gap-10 md:grid-cols-2">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-neutral-300 to-transparent md:block"
      />
      <div className="space-y-6">
        {left.map((v, i) => (
          <Item key={i} {...v} pinLeft />
        ))}
      </div>
      <div className="space-y-6">
        {right.map((v, i) => (
          <Item key={i} {...v} />
        ))}
      </div>
    </div>
  );
}
