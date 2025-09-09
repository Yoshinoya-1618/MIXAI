import React, { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RotateCcw, HelpCircle } from "lucide-react"

interface MixParams {
  presenceDb: number
  spaceReverbSec: number
  punchCompDb: number
  airDb: number
  lowDb: number
  highDb: number
  deEssDb: number
  satDb: number
  stereoRatio: number
  gateThreshDb: number
  harmVol: number
  clarityDb?: number
  exciterDb?: number
  genrePreset?: string
  // Additional Creator plan properties
  filterSweepDb?: number
  compAttackMs?: number
  compReleaseMs?: number
  compRatio?: number
  limiterThreshDb?: number
  saturationAmt?: number
  vintageMode?: string
  widthEnhancer?: number
  depthReverb?: number
  eqBypassAll?: boolean
}

interface MixTonePanelOnlyProps {
  initialMix?: any
  onCommit?: (params: any) => void
  onReset?: () => void
}

/**
 * MixTonePanelOnly
 *
 * 上部のプレビュー領域を完全に削除し、音質微調整パネルのみを描画するシンプル版。
 * デザイン/構成は既存のパネルと同じ (max-w-5xl + px-4 の横幅コンテナ)。
 *
 * 使い方:
 *   <MixTonePanelOnly />
 *
 * 必要に応じて initialMix / onCommit / onReset を props として渡せます。
 */
export default function MixTonePanelOnly({ initialMix = INITIAL_MIX, onCommit, onReset }: MixTonePanelOnlyProps) {
  // --- 単位変換ユーティリティ ---
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const invLerp = (a: number, b: number, v: number) => (v - a) / (b - a)
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

  // --- レンジ定義（正規化⇄実数） ---
  const ranges = useMemo(() => ({
    presenceDb: [-6, 6] as [number, number],
    spaceReverbSec: [0.2, 3.0] as [number, number],
    punchCompDb: [0, 6] as [number, number],
    airDb: [-6, 6] as [number, number],
    lowDb: [-6, 6] as [number, number],
    highDb: [-6, 6] as [number, number],
    deEssDb: [0, 12] as [number, number],
    satDb: [0, 12] as [number, number],
    stereoRatio: [0.5, 1.5] as [number, number],
    gateThreshDb: [-60, -20] as [number, number],
  }), [])

  // --- ノブUI内部値（0..1）を保持 ---
  const [knob, setKnob] = useState(() => normalizeFromMix(initialMix, ranges, invLerp))

  // initialMix 変更時は同期
  useEffect(() => {
    setKnob(normalizeFromMix(initialMix, ranges, invLerp))
  }, [initialMix])

  // 反映
  const handleCommit = () => {
    const next = {
      presenceDb: lerp(...ranges.presenceDb, knob.presence),
      spaceReverbSec: lerp(...ranges.spaceReverbSec, knob.space),
      punchCompDb: lerp(...ranges.punchCompDb, knob.punch),
      airDb: lerp(...ranges.airDb, knob.air),
      lowDb: lerp(...ranges.lowDb, knob.low),
      highDb: lerp(...ranges.highDb, knob.high),
      deEssDb: lerp(...ranges.deEssDb, knob.deEss),
      satDb: lerp(...ranges.satDb, knob.sat),
      stereoRatio: lerp(...ranges.stereoRatio, knob.stereo),
      gateThreshDb: lerp(...ranges.gateThreshDb, knob.gate),
      harmVol: initialMix?.harmVol ?? 0.6,
    }
    onCommit?.(next)
  }

  // リセット（UI を初期AI値へ）
  const handleReset = () => {
    setKnob(normalizeFromMix(initialMix, ranges, invLerp))
    onReset?.()
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl px-4">
        <Card className="border-zinc-700 bg-[#0e0f12]">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-100">音質微調整</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="bg-violet-500 text-white hover:bg-violet-600 border border-transparent shadow-sm focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5"/>
                微調整初期化
              </Button>
            </div>

            {/* 小型ノブ 4つ */}
            <div className="grid grid-cols-2 gap-4">
              <Dial
                label="前め"
                help="2–5kHz付近の存在感。+でボーカルが前に出る、-で後ろへ。"
                display={`${fixed(lerp(...ranges.presenceDb, knob.presence), 1)} dB`}
                value={knob.presence}
                onChange={(v: number) => setKnob((s) => ({ ...s, presence: clamp01(v) }))}
              />
              <Dial
                label="広がり"
                help="リバーブ残響長(T60)。長いほど広がり感が増します。"
                display={`${fixed(lerp(...ranges.spaceReverbSec, knob.space), 2)} s`}
                value={knob.space}
                onChange={(v: number) => setKnob((s) => ({ ...s, space: clamp01(v) }))}
              />
              <Dial
                label="パンチ"
                help="コンプの効きの目安。+でアタック/音圧が増えます。"
                display={`${fixed(lerp(...ranges.punchCompDb, knob.punch), 1)} dB`}
                value={knob.punch}
                onChange={(v: number) => setKnob((s) => ({ ...s, punch: clamp01(v) }))}
              />
              <Dial
                label="明るさ"
                help="高域シェルフの増減。+でブライト、-でダーク。"
                display={`${fixed(lerp(...ranges.airDb, knob.air), 1)} dB`}
                value={knob.air}
                onChange={(v: number) => setKnob((s) => ({ ...s, air: clamp01(v) }))}
              />
            </div>

            {/* 詳細スライダ */}
            <div className="mt-3 space-y-3">
              <UnitSlider
                label="低音"
                help="100Hz周辺の量感。+で太く、-で軽く。"
                unit="dB"
                min={ranges.lowDb[0]}
                max={ranges.lowDb[1]}
                step={0.5}
                value={lerp(...ranges.lowDb, knob.low)}
                onChange={(val: number) => setKnob((s) => ({ ...s, low: invLerp(...ranges.lowDb, val) }))}
              />
              <UnitSlider
                label="高音"
                help="8kHz以上の輝き。+で抜ける、-でやわらぐ。"
                unit="dB"
                min={ranges.highDb[0]}
                max={ranges.highDb[1]}
                step={0.5}
                value={lerp(...ranges.highDb, knob.high)}
                onChange={(val: number) => setKnob((s) => ({ ...s, high: invLerp(...ranges.highDb, val) }))}
              />
              <UnitSlider
                label="ディエッサー"
                help="歯擦音(S/SH)の抑制量の目安。"
                unit="dB"
                min={ranges.deEssDb[0]}
                max={ranges.deEssDb[1]}
                step={0.5}
                value={lerp(...ranges.deEssDb, knob.deEss)}
                onChange={(val: number) => setKnob((s) => ({ ...s, deEss: invLerp(...ranges.deEssDb, val) }))}
              />
              <UnitSlider
                label="サチュ"
                help="倍音付加。+で厚み/歪み感が増します。"
                unit="dB"
                min={ranges.satDb[0]}
                max={ranges.satDb[1]}
                step={0.5}
                value={lerp(...ranges.satDb, knob.sat)}
                onChange={(val: number) => setKnob((s) => ({ ...s, sat: invLerp(...ranges.satDb, val) }))}
              />
              <UnitSlider
                label="ステレオ感"
                help="左右の広がり倍率。1.0がAI基準。"
                unit="×"
                min={ranges.stereoRatio[0]}
                max={ranges.stereoRatio[1]}
                step={0.05}
                value={lerp(...ranges.stereoRatio, knob.stereo)}
                onChange={(val: number) => setKnob((s) => ({ ...s, stereo: invLerp(...ranges.stereoRatio, val) }))}
              />
              <UnitSlider
                label="ノイズゲート閾値"
                help="このレベル未満をミュート。高くするほど静音部が切られやすい。"
                unit="dB"
                min={ranges.gateThreshDb[0]}
                max={ranges.gateThreshDb[1]}
                step={1}
                value={lerp(...ranges.gateThreshDb, knob.gate)}
                onChange={(val: number) => setKnob((s) => ({ ...s, gate: invLerp(...ranges.gateThreshDb, val) }))}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button className="ml-auto" onClick={handleCommit}>設定を反映</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

// ---------------- Helper ----------------
function normalizeFromMix(mix: any, ranges: any, invLerp: any) {
  const base = mix || INITIAL_MIX
  return {
    presence: invLerp(...ranges.presenceDb, base.presenceDb),
    space: invLerp(...ranges.spaceReverbSec, base.spaceReverbSec),
    punch: invLerp(...ranges.punchCompDb, base.punchCompDb),
    air: invLerp(...ranges.airDb, base.airDb),
    low: invLerp(...ranges.lowDb, base.lowDb),
    high: invLerp(...ranges.highDb, base.highDb),
    deEss: invLerp(...ranges.deEssDb, base.deEssDb),
    sat: invLerp(...ranges.satDb, base.satDb),
    stereo: invLerp(...ranges.stereoRatio, base.stereoRatio),
    gate: invLerp(...ranges.gateThreshDb, base.gateThreshDb),
  }
}

function UnitSlider({ label, unit, value, onChange, min, max, step = 1, help }: {
  label: string
  unit?: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  help?: string
}) {
  const inv = (val: number) => (val - min) / (max - min)
  return (
    <div className="grid grid-cols-[140px_1fr_64px] items-center gap-3">
      <div className="flex items-center gap-1 text-sm text-zinc-300">
        {label}
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-zinc-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-[260px] text-xs">{help}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Slider value={[inv(value) * 100]} onValueChange={([v]) => onChange(min + (max - min) * (v / 100))} step={step} />
      <div className="text-right tabular-nums text-xs text-zinc-400">{fixed(value, step < 1 ? 2 : 1)} {unit}</div>
    </div>
  )
}

function Dial({ label, display, value, onChange, help }: {
  label: string
  display: string
  value: number
  onChange: (value: number) => void
  help?: string
}) {
  const [dragging, setDragging] = useState(false)
  const angle = -135 + value * 270

  const updateFromEvent = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const rad = Math.atan2(dy, dx)
    const deg = (rad * 180) / Math.PI
    const a = deg + 180 // 0..360
    let v = (a - 45) / 270 // 0..1
    v = Math.max(0, Math.min(1, v))
    onChange(v)
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-gradient-to-b from-[#101216] to-[#0e0f12] p-3">
      <div className="mb-1 flex items-center justify-center gap-1 text-sm text-zinc-200">
        {label}
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-zinc-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-[240px] text-xs">{help}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div
        className="relative mx-auto aspect-square w-28 select-none rounded-full bg-zinc-800 shadow-inner cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => { setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); updateFromEvent(e) }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerMove={(e) => { if (!dragging) return; updateFromEvent(e) }}
        role="slider" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} tabIndex={0}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 h-[36%] w-[2px] origin-bottom rounded-full bg-emerald-400"
          style={{ translateX: "-50%", translateY: "-100%" }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 240, damping: 20 }}
        />
        <div className="absolute inset-2 rounded-full border border-zinc-700/60"></div>
      </div>
      <div className="mt-2 text-center text-sm">
        <span className="tabular-nums text-xs text-zinc-300">{display}</span>
      </div>
      {/* キーボード操作/アクセシビリティ用の隠しスライダ（視覚はノブで） */}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="mt-2 w-full"
      />
    </div>
  )
}

function fixed(num: number, digits: number = 1) {
  const d = Math.max(0, digits)
  return Number(num).toFixed(d)
}

// ========================================================
// 初期値（AI推定）
// ========================================================
const INITIAL_MIX = {
  presenceDb: 1.5,
  spaceReverbSec: 1.2,
  punchCompDb: 2.5,
  airDb: 1.0,
  lowDb: 0.0,
  highDb: 0.0,
  deEssDb: 4.0,
  satDb: 3.0,
  stereoRatio: 1.0,
  gateThreshDb: -40,
  harmVol: 0.6,
}

// ========================================================
// 🧪 簡易テスト（自動で一度だけ実行）
// ========================================================
export function runMixTonePanelOnlyTests(){
  console.group("MixTonePanelOnly tests")
  try {
    // 1) コンポーネント定義
    console.assert(typeof MixTonePanelOnly === "function", "MixTonePanelOnly should be a component function")

    // 2) 初期ミックス値の妥当性
    const init = { ...INITIAL_MIX }
    const keys = [
      "presenceDb","spaceReverbSec","punchCompDb","airDb",
      "lowDb","highDb","deEssDb","satDb","stereoRatio",
      "gateThreshDb","harmVol"
    ]
    console.assert(keys.every(k => k in init), "INITIAL_MIX keys must exist")

    // 3) 正規化/逆変換の整合（代表値）
    const range = [-6, 6]
    const L = (a: number, b: number, t: number)=>a+(b-a)*t
    const I = (a: number, b: number, v: number)=>(v-a)/(b-a)
    const mid = L(range[0],range[1],0.5)
    console.assert(Math.abs(I(range[0],range[1],mid) - 0.5) < 1e-6, "normalize/denormalize consistency")

  } finally { console.groupEnd() }
}

if (typeof window !== "undefined" && !(window as any).__MIX_TONE_PANEL_ONLY_TESTED__) {
  (window as any).__MIX_TONE_PANEL_ONLY_TESTED__ = true
  try { runMixTonePanelOnlyTests() } catch {}
}
