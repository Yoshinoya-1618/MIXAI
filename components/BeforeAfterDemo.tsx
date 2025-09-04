// components/BeforeAfterDemo.tsx
'use client';
import * as React from 'react';

export function BeforeAfterDemo() {
  const [mode, setMode] = React.useState<'before' | 'after'>('before');
  const beforeRef = React.useRef<HTMLAudioElement | null>(null);
  const afterRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const b = beforeRef.current,
      a = afterRef.current;
    if (!b || !a) return;
    if (mode === 'before') {
      a.pause();
      b.currentTime = 0;
      void b.play().catch(() => {});
    } else {
      b.pause();
      a.currentTime = 0;
      void a.play().catch(() => {});
    }
  }, [mode]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-subtle">
      <div className="flex items-center gap-3">
        <button
          className="btn-ghost"
          onClick={() => setMode((m) => (m === 'before' ? 'after' : 'before'))}
          aria-label="Before/After 切替"
        >
          {mode === 'before' ? 'After を聴く' : 'Before を聴く'}
        </button>
        <p className="text-sm text-neutral-600">
          {mode === 'before' ? 'Before：未整音の参考音' : 'After：整音イメージ'}
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AudioBox
          ref={beforeRef}
          label="Before"
          active={mode === 'before'}
          src="/sample-before.mp3"
        />
        <AudioBox
          ref={afterRef}
          label="After"
          active={mode === 'after'}
          src="/sample-after.mp3"
        />
      </div>
    </div>
  );
}

const AudioBox = React.forwardRef<
  HTMLAudioElement,
  { label: string; active: boolean; src: string }
>(({ label, active, src }, ref) => (
  <div
    className={`rounded-lg border p-3 ${
      active ? 'border-indigo-300 bg-indigo-50/30' : 'border-neutral-200 bg-white'
    }`}
  >
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`h-2 w-2 rounded-full ${
          active ? 'bg-indigo-600' : 'bg-neutral-300'
        }`}
        aria-hidden
      />
    </div>
    <audio
      ref={ref}
      controls
      preload="none"
      className="w-full"
      aria-label={`${label} のサンプル`}
      src={src}
    />
  </div>
));
AudioBox.displayName = 'AudioBox';
