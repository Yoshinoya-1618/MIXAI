// components/FAQ.tsx
'use client';
import * as React from 'react';

export function FAQ() {
  const items = [
    {
      q: '初回無料の条件は？',
      a: 'アカウント登録だけで1回分の書き出しが無料です。2回目以降は¥500/回の都度課金になります。',
    },
    {
      q: '対応ファイルと上限は？',
      a: 'WAV/MP3に対応。各60秒・20MB以内を目安にしてください。モノ/ステレオどちらでも構いません。',
    },
    {
      q: 'どれくらいで仕上がりますか？',
      a: '混雑状況にもよりますが、通常は1〜2分で書き出しが完了します。',
    },
    {
      q: 'やり直しはできますか？',
      a: 'タイミングが合わない場合は±2000msの微調整や候補区間で再レンダーできます。追課金は不要です。',
    },
    {
      q: '保存と削除はどうなりますか？',
      a: 'ファイルは非公開のまま保管され、7日以内に自動削除されます。ダウンロードは署名URLを使用します。',
    },
    {
      q: '権利の取り扱いは？',
      a: 'DRM付き音源や市販カラオケ音源のアップロードはできません。権利の確認はご利用者の責任でお願いします。',
    },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      {items.map((it, i) => (
        <Accordion key={i} title={it.q}>
          {it.a}
        </Accordion>
      ))}
    </div>
  );
}

function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-medium"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span
          aria-hidden
          className={`ml-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-sm transition-transform ${
            open ? 'rotate-45' : ''
          }`}
        >
          ＋
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-6 text-neutral-700">{children}</div>
      )}
    </div>
  );
}
