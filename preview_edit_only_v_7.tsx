import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Pause, Play, SkipBack, Scissors, HelpCircle, RotateCcw, RotateCw, Square, Plus, Minus, Volume2, VolumeX, Wand2 } from "lucide-react"

// ========== Helpers ==========
function clamp01(n: number){ return Math.max(0, Math.min(1, n)) }
const fmt = (s: number)=>{ const m = Math.floor(s/60); const ss = Math.floor(s%60).toString().padStart(2,"0"); return `${m}:${ss}` }

// Downsample PCM to vertical bars (0..1)
function downsampleToBars(data: Float32Array, bars: number){
  if (!data || data.length===0) return new Array(bars).fill(0)
  const len = data.length
  const seg = len / bars
  const out = new Array(bars)
  for (let i=0;i<bars;i++){
    const start = Math.floor(i*seg)
    const end   = Math.min(len, Math.floor((i+1)*seg))
    let sum = 0
    for (let j=start;j<end;j++){ sum += Math.abs(data[j]) }
    const avg = (end>start) ? (sum/(end-start)) : 0
    out[i] = Math.min(1, avg*2.5)
  }
  return out
}

function barsFromAudioBuffer(buf: AudioBuffer, bars: number){
  const len = buf.length
  const seg = len / bars
  const out = new Array(bars).fill(0)
  const chs = buf.numberOfChannels
  const chData: Float32Array[] = []
  for(let c=0;c<chs;c++) chData.push(buf.getChannelData(c))
  for(let i=0;i<bars;i++){
    const start = Math.floor(i*seg)
    const end   = Math.min(len, Math.floor((i+1)*seg))
    let sumSq = 0
    for(let c=0;c<chs;c++){
      const arr = chData[c]
      for(let j=start;j<end;j++){
        const v = arr[j]
        sumSq += v*v
      }
    }
    const n = Math.max(1, (end-start)*chs)
    const rms = Math.sqrt(sumSq / n)
    out[i] = Math.min(1, rms*3)
  }
  return out
}

// Resample a subrange [startPct,endPct] of bars to fixed length
function resampleRange(values:number[], startPct:number, endPct:number, outCount:number){
  const n = values.length
  const start = clamp01(startPct) * (n - 1)
  const end   = clamp01(endPct)   * (n - 1)
  const span  = Math.max(1e-6, end - start)
  const out:number[] = new Array(outCount)
  for(let i=0;i<outCount;i++){
    const t = (outCount===1) ? 0 : i/(outCount-1)
    const pos = start + span*t
    const i0 = Math.floor(pos)
    const i1 = Math.min(n-1, i0+1)
    const a = values[i0]
    const b = values[i1]
    const f = pos - i0
    out[i] = a*(1-f) + b*f
  }
  return out
}

// Page-follow helper (unit-tested)
export function computeNextPageStart(
  vis:number,
  startVisible:number,
  viewWidth:number,
  maxViewStart:number
){
  const rightEdge = startVisible + viewWidth
  const eps = 1e-4
  // When the playhead hits the right edge of the current page, flip the page
  // and make the playhead become the left edge of the new page.
  if (vis >= rightEdge - eps){
    let nextStart = vis
    // Clamp to the last valid page start so the final page shows the tail
    if (nextStart > maxViewStart) nextStart = maxViewStart
    if (nextStart < 0) nextStart = 0
    return nextStart
  }
  return startVisible
}

// Lightweight tests (run once in browser)
if (typeof window !== 'undefined' && !(window as any).__mixaiPagingTests){
  (window as any).__mixaiPagingTests = true
  const approx = (a:number,b:number)=> Math.abs(a-b) < 1e-6
  // 1) 2x: right-edge hit from page0 (start=0, width=0.5) -> nextStart = 0.5
  console.assert(approx(computeNextPageStart(0.5, 0.0, 0.5, 0.5), 0.5), 'Test1 fail')
  // 2) Not yet at edge -> stay
  console.assert(approx(computeNextPageStart(0.49, 0.0, 0.5, 0.5), 0.0), 'Test2 fail')
  // 3) Last page: rightEdge=1.0 at 2x -> clamp to maxViewStart (0.5)
  console.assert(approx(computeNextPageStart(0.99, 0.5, 0.5, 0.5), 0.5), 'Test3 fail (clamp at last page)')
  // 4) 4x: page width=0.25, from start=0.50 -> right-edge=0.75 -> nextStart=0.75
  console.assert(approx(computeNextPageStart(0.75, 0.50, 0.25, 0.75), 0.75), 'Test4 fail (4x edge)')
  // 5) Clamp beyond maxViewStart
  console.assert(approx(computeNextPageStart(0.99, 0.70, 0.25, 0.75), 0.75), 'Test5 fail (clamp)')
  // 6) Negative safety
  console.assert(approx(computeNextPageStart(-0.1, 0.0, 0.5, 0.5), 0.0), 'Test6 fail (neg)')
  // 7) Edge just over last page start (2x): vis=0.51, start=0.5 -> clamp to 0.5
  console.assert(approx(computeNextPageStart(0.51, 0.50, 0.50, 0.50), 0.50), 'Test7 fail (clamp at boundary)')
}

// ========== Constants ==========
const ZOOMS = [1, 1.5, 2, 3, 4]

const INITIAL = {
  fadeCurve: 'linear' as 'linear'|'log'|'exp',
  fadeEnabled: true,
  cutMode: false,
  harmVol: 0.6,
}

const MIN_PLATEAU = 0.05 // for fade overlap margins
const MIN_REGION  = 0.01 // min kept region length for cuts

// Auto-follow tuning (page-follow only)

// ========== Component ==========
export default function PreviewEditOnly(){
  // Duration is dynamic (AudioBuffer.duration). Fallback: 68s.
  const [totalSec, setTotalSec] = useState(68)

  // Preview states
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)
  const [previewVol, setPreviewVol] = useState(1)
  const [harmOn, setHarmOn] = useState(true)
  const [harmSolo, setHarmSolo] = useState(false)
  
  // Fade params (relative to *kept region*)
  const [fiWidthPct, setFiWidthPct] = useState(0.05) // init dummy, will be set to 3s
  const [foWidthPct, setFoWidthPct] = useState(0.05)
  const [fadeCurve, setFadeCurve] = useState<'linear'|'log'|'exp'>(INITIAL.fadeCurve)
  const [fadeEnabled, setFadeEnabled] = useState(INITIAL.fadeEnabled)
  const [fadeInitialized, setFadeInitialized] = useState(false)

  // Cut range (two-sided)
  const [cutMode, setCutMode] = useState(INITIAL.cutMode)
  const [cutLeftPct, setCutLeftPct]   = useState(0)   // keep from here (abs 0..1)
  const [cutRightPct, setCutRightPct] = useState(1)   // ...to here   (abs 0..1)
  const showCutButtons = cutMode && !playing

  // Undo/Redo stack for cuts (store pair states)
  type CutAction = { prevLeft:number, prevRight:number, nextLeft:number, nextRight:number }
  const [cutUndo, setCutUndo] = useState<CutAction[]>([])
  const [cutRedo, setCutRedo] = useState<CutAction[]>([])

  // Zoom & horizontal pan over *display space* (0..1)
  const [zoomIdx, setZoomIdx] = useState(0)
  const zoom = ZOOMS[zoomIdx]
  const [viewStartPct, setViewStartPct] = useState(0)
  const maxViewStart = Math.max(0, 1 - 1/zoom)
  useEffect(()=>{ setViewStartPct(v=>Math.min(v, maxViewStart)) }, [zoom])

  // Refs for ticker to avoid stale closures
  const viewStartRef = useRef(viewStartPct)
  const zoomRef = useRef(zoom)
  const maxViewStartRef = useRef(maxViewStart)
  useEffect(()=>{ viewStartRef.current = viewStartPct }, [viewStartPct])
  useEffect(()=>{ zoomRef.current = zoom }, [zoom])
  useEffect(()=>{ maxViewStartRef.current = maxViewStart }, [maxViewStart])
  
  // Waveform data
  const [wavePCM, setWavePCM] = useState<Float32Array | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)

  // WebAudio graph
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const startedAtCtxRef = useRef<number>(0)
  const offsetSecRef = useRef<number>(0)
  const pausedAtSecRef = useRef<number>(0)

  // Playhead (absolute 0..1 over full audio)
  const [playheadAbsPct, setPlayheadAbsPct] = useState(0)

  // Global APIs to feed data in from AIMIX
  useEffect(()=>{
    const g = window as any
    g.mixaiSetWaveform = (bufferLike: Float32Array | number[] )=>{
      try{ setWavePCM(bufferLike instanceof Float32Array ? bufferLike : new Float32Array(bufferLike)) }catch{}
    }
    g.mixaiSetAudioBuffer = (buf: AudioBuffer)=>{
      setAudioBuffer(buf)
      setTotalSec(buf.duration)
      try{ setWavePCM(new Float32Array(barsFromAudioBuffer(buf, 44100))) }catch{}
      // reset playhead and fades on new audio
      setPlayheadAbsPct(0)
      setFadeInitialized(false)
    }
    g.mixaiDecodeAndSetAudio = async (arrayBuffer: ArrayBuffer)=>{
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if(!audioCtxRef.current) audioCtxRef.current = new Ctx()
      const ctx = audioCtxRef.current
      if (!ctx) throw new Error('AudioContext not initialized')
      const buf: AudioBuffer = await new Promise((resolve, reject)=>{
        ctx.decodeAudioData(arrayBuffer.slice(0), (b)=>resolve(b), (e)=>reject(e))
      })
      g.mixaiSetAudioBuffer(buf)
    }
  }, [])

  // Bars (prefer AudioBuffer-derived, fallback to provided PCM, finally a synthetic demo)
  const BARS_FULL = 1200
  const bars = useMemo(()=>{
    if (audioBuffer) return barsFromAudioBuffer(audioBuffer, BARS_FULL)
    if (wavePCM)     return downsampleToBars(wavePCM, BARS_FULL)
    // synthetic
    const len = 44100
    const arr = new Float32Array(len)
    for (let i=0;i<len;i++){
      const t = i/len
      arr[i] = 0.6*Math.sin(2*Math.PI*2*t) + 0.3*Math.sin(2*Math.PI*13*t) + 0.1*Math.sin(2*Math.PI*33*t)
    }
    return downsampleToBars(arr, BARS_FULL)
  }, [audioBuffer, wavePCM])

  // ===== Display-space mapping =====
  const effStartPct = cutLeftPct
  const effEndPct   = cutRightPct
  const effSpanPct  = Math.max(0, effEndPct - effStartPct)

  // View is normalized to the kept region when NOT in cut mode (i.e., after cuts)
  const normalizedView = !cutMode && effSpanPct > 0

  // convert abs <-> view
  const toViewPct = (abs:number)=> normalizedView ? clamp01((abs - effStartPct)/Math.max(1e-6, effSpanPct)) : clamp01(abs)
  const fromViewPct = (view:number)=> normalizedView ? clamp01(effStartPct + view*Math.max(1e-6, effSpanPct)) : clamp01(view)

  // total seconds shown on ruler
  const displayTotalSec = normalizedView ? effSpanPct*totalSec : totalSec

  // bars for display (crop & stretch to full width when normalized)
  const barsDisplay = useMemo(()=>{
    if (normalizedView) return resampleRange(bars, effStartPct, effEndPct, BARS_FULL)
    return bars
  }, [normalizedView, bars, effStartPct, effEndPct])

  // Initialize fade handles to 3s from start/end of *displayed* region (once per audio)
  useEffect(()=>{
    if (fadeInitialized) return
    if (displayTotalSec <= 0) return
    const threeSecFrac = Math.min(0.9, 3 / Math.max(0.001, displayTotalSec))
    // also ensure plateau
    const maxFrac = 1 - MIN_PLATEAU
    const w = Math.min(threeSecFrac, maxFrac)
    setFiWidthPct(w)
    setFoWidthPct(w)
    setFadeInitialized(true)
  }, [displayTotalSec, fadeInitialized])

  // Timeline coordinate helpers (input in viewport pixels -> view pct -> abs pct)
  const timelineRef = useRef<HTMLDivElement>(null)
  function pxToViewPct(clientX:number){
    const el = timelineRef.current; if(!el) return 0
    const r = el.getBoundingClientRect()
    const pViewport = clamp01((clientX - r.left) / r.width)
    const pView   = clamp01(viewStartRef.current + pViewport*(1/zoomRef.current))
    return pView
  }

  // Fade line geometry in *view space* (0..1000)
  const V = 1000
  const xFiStartV = 0
  const xFiEndV   = fiWidthPct * V
  const xFoStartV = (1 - foWidthPct) * V
  const xFoEndV   = V

  function fadePathIn(){
    if (effSpanPct<=0) return ""
    return fadeCurve==='linear' ? `M${xFiStartV},100 L${xFiEndV},0`
      : fadeCurve==='exp'      ? `M${xFiStartV},100 Q${xFiStartV+(xFiEndV-xFiStartV)*0.3},90 ${xFiEndV},0`
                               : `M${xFiStartV},100 Q${xFiStartV+(xFiEndV-xFiStartV)*0.7},20 ${xFiEndV},0`
  }
  function fadePathOut(){
    if (effSpanPct<=0) return ""
    return fadeCurve==='linear' ? `M${xFoStartV},0 L${xFoEndV},100`
      : fadeCurve==='exp'      ? `M${xFoStartV},0 Q${xFoStartV+(xFoEndV-xFoStartV)*0.7},10 ${xFoEndV},100`
                               : `M${xFoStartV},0 Q${xFoStartV+(xFoEndV-xFoStartV)*0.3},80 ${xFoEndV},100`
  }

  // Ensure playhead inside kept region when leaving cut mode (cropped view)
  useEffect(()=>{
    if (!cutMode){
      setPlayheadAbsPct(p=> clamp01(Math.max(p, effStartPct)))
      setPlayheadAbsPct(p=> clamp01(Math.min(p, effEndPct)))
    }
  }, [cutMode, effStartPct, effEndPct])

  // Audio graph helpers
  function ensureCtxAndGain(){
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
    const ctx = audioCtxRef.current!
    if (ctx.state === 'suspended') ctx.resume()
    if (!gainRef.current){
      gainRef.current = ctx.createGain()
      gainRef.current.connect(ctx.destination)
      gainRef.current.gain.value = 0
    }
    return ctx
  }
  function stopSource(){
    if (sourceRef.current){
      try{ sourceRef.current.onended = null; sourceRef.current.stop() }catch{}
      try{ sourceRef.current.disconnect() }catch{}
      sourceRef.current = null
    }
  }
  function currentSec(){
    const ctx = audioCtxRef.current
    if (!ctx || !playing) return playheadAbsPct*totalSec
    let t = (ctx.currentTime - startedAtCtxRef.current) + offsetSecRef.current
    if (loop){
      const ls = effStartPct * totalSec
      const le = effEndPct   * totalSec
      const len = Math.max(0.001, le - ls)
      // Wrap into [ls, le)
      if (t < ls || t >= le){
        const d = t - ls
        t = ls + ((d % len) + len) % len
      }
    }
    return t
  }
  function scheduleFades(ctx: AudioContext, startAtSec:number){
    const gain = gainRef.current!
    const rangeStartSec = effStartPct * totalSec
    const rangeEndSec   = effEndPct   * totalSec
    const fiEndSec = rangeStartSec + fiWidthPct * (rangeEndSec - rangeStartSec)
    const foStartSec = rangeEndSec - foWidthPct * (rangeEndSec - rangeStartSec)

    const now = ctx.currentTime

    const gainAt = (tAbs:number)=>{
      if (!fadeEnabled) return previewVol
      const clamp = (x:number)=> Math.max(0, Math.min(1, x))
      if (tAbs <= fiEndSec){
        const p = clamp((tAbs - rangeStartSec)/Math.max(0.0001, fiEndSec - rangeStartSec))
        if (fadeCurve==='linear') return previewVol * p
        if (fadeCurve==='exp')    return previewVol * (1 - Math.exp(-5*p))
        return previewVol * Math.pow(p, 0.4)
      } else if (tAbs < foStartSec){
        return previewVol
      } else {
        const p = clamp((rangeEndSec - tAbs)/Math.max(0.0001, rangeEndSec - foStartSec))
        if (fadeCurve==='linear') return previewVol * p
        if (fadeCurve==='exp')    return previewVol * (1 - Math.exp(-5*(1-p)))
        return previewVol * Math.pow(p, 0.4)
      }
    }

    const g0 = gainAt(startAtSec)
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(g0, now)

    if (!fadeEnabled){
      gain.gain.setValueAtTime(previewVol, now)
      return
    }

    if (startAtSec < fiEndSec){
      const tToFiEnd = fiEndSec - startAtSec
      gain.gain.linearRampToValueAtTime(previewVol, now + Math.max(0.0001, tToFiEnd))
    }
    const tToFoStart = Math.max(0, foStartSec - startAtSec)
    if (tToFoStart > 0){
      gain.gain.setValueAtTime(previewVol, now + tToFoStart)
      const tToEnd = (rangeEndSec - foStartSec)
      gain.gain.linearRampToValueAtTime(0.0001, now + tToFoStart + Math.max(0.0001, tToEnd))
    }else{
      const tRemain = Math.max(0.001, (rangeEndSec - startAtSec))
      gain.gain.linearRampToValueAtTime(0.0001, now + tRemain)
    }
  }
  function startPlayback(atSec:number){
    const ctx = ensureCtxAndGain()
    stopSource()

    const ls = effStartPct * totalSec
    const le = effEndPct   * totalSec
    const effEnd = Math.max(ls, le)
    // clamp start within region
    let startAt = clamp01(atSec / totalSec) * totalSec
    startAt = Math.min(effEnd - 0.001, Math.max(ls, startAt))

    if (audioBuffer){
      const src = ctx.createBufferSource()
      src.buffer = audioBuffer
      // NOTE: don't use native looping; we manually stop at region end and restart to make fades consistent
      src.loop = false
      src.connect(gainRef.current!)

      scheduleFades(ctx, startAt)

      startedAtCtxRef.current = ctx.currentTime
      offsetSecRef.current = startAt
      pausedAtSecRef.current = 0

      const dur = Math.max(0.001, effEnd - startAt)
      src.start(0, startAt)
      src.stop(ctx.currentTime + dur)
      src.onended = () => {
        stopSource()
        if (loop){
          startPlayback(ls)
        }else{
          setPlaying(false)
          pausedAtSecRef.current = effEnd
          setPlayheadAbsPct(effEnd/totalSec)
        }
      }
      sourceRef.current = src

    }else{
      // Fallback oscillator tone preview when no audio loaded
      const src = ctx.createOscillator()
      const gain = gainRef.current!
      src.type = 'sawtooth'; src.frequency.value = 220
      src.connect(gain)
      scheduleFades(ctx, startAt)

      startedAtCtxRef.current = ctx.currentTime
      offsetSecRef.current = startAt
      pausedAtSecRef.current = 0

      const dur = Math.max(0.001, effEnd - startAt)
      src.start()
      src.stop(ctx.currentTime + dur)
      ;(src as any).onended = () => { stopSource(); if(loop){ startPlayback(ls) } else { setPlaying(false); pausedAtSecRef.current = effEnd; setPlayheadAbsPct(effEnd/totalSec) } }
      // @ts-ignore
      sourceRef.current = src
    }
  }
  function pausePlayback(){
    const pos = currentSec()
    pausedAtSecRef.current = pos
    stopSource()
    setPlaying(false)
  }
  function togglePlay(){
    if (playing){
      pausePlayback()
    }else{
      const at = (pausedAtSecRef.current ?? 0) || (effStartPct * totalSec)
      setPlaying(true)
      startPlayback(at)
    }
  }

  // Ruler ticks in display space
  const markerCount = Math.max(4, Math.round(8 * zoom))
  const markers = useMemo(()=> Array.from({length: markerCount+1}).map((_,i)=>({ pct: i/markerCount, label: fmt(displayTotalSec*(i/markerCount)) })), [markerCount, displayTotalSec])

  // Global ticker: compute from absolute time, then map to view for auto-follow
  useEffect(()=>{
    if(!playing) return
    let raf = 0
    const tick = () => {
      const abs = clamp01(currentSec()/totalSec)
      setPlayheadAbsPct(abs)

      const vis = toViewPct(abs)
      const startVisible = viewStartRef.current
      const z = zoomRef.current
      const maxV = maxViewStartRef.current

      if (maxV > 0 && !isUserPanningRef.current){
        const viewWidth = 1 / z
        const nextStart = computeNextPageStart(vis, startVisible, viewWidth, maxV)
        if (Math.abs(nextStart - startVisible) > 1e-6){
          setViewStartPct(nextStart)
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return ()=> cancelAnimationFrame(raf)
  }, [playing, totalSec])

  // Re-apply envelopes seamlessly when params change during playback
  useEffect(()=>{
    if (playing){ const at = currentSec(); startPlayback(at) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiWidthPct, foWidthPct, fadeCurve, fadeEnabled, cutLeftPct, cutRightPct, loop])

  // Interactions
  function resetPreview(){
    pausePlayback()
    setPlayheadAbsPct(0)
    setFadeEnabled(INITIAL.fadeEnabled)
    setFadeCurve(INITIAL.fadeCurve)
    setCutMode(INITIAL.cutMode)
    setCutLeftPct(0); setCutRightPct(1)
    setZoomIdx(0); setViewStartPct(0)
    setCutUndo([]); setCutRedo([])
    setFadeInitialized(false)
  }

  function seekFromClientX(clientX:number){
    const pView = pxToViewPct(clientX)
    const pAbs = fromViewPct(pView)
    const atSec = pAbs * totalSec
    if (playing){
      startPlayback(atSec)
    }else{
      setPlayheadAbsPct(pAbs)
      pausedAtSecRef.current = atSec
    }
  }

  const maxView = Math.max(0, 1 - 1/zoom)
  const scrollNorm = maxView>0 ? (viewStartPct / maxView) : 0
  const isUserPanningRef = useRef(false)
  function setScrollNorm(n:number){ if (maxView<=0){ setViewStartPct(0); return } setViewStartPct(clamp01(n) * maxView) }

  // Cut actions helpers
  function pushCutState(nextLeft:number, nextRight:number){
    const act: CutAction = { prevLeft: cutLeftPct, prevRight: cutRightPct, nextLeft, nextRight }
    setCutUndo((s)=>[...s, act])
    setCutRedo([])
    setCutLeftPct(nextLeft)
    setCutRightPct(nextRight)
  }
  function applyCutLeft(pct:number){
    const nextLeft = clamp01(Math.min(pct, cutRightPct - MIN_REGION))
    pushCutState(nextLeft, cutRightPct)
  }
  function applyCutRight(pct:number){
    const nextRight = clamp01(Math.max(pct, cutLeftPct + MIN_REGION))
    pushCutState(cutLeftPct, nextRight)
  }
  function undoCut(){
    setCutUndo((s)=>{
      if(!s.length) return s
      const last = s[s.length-1]
      setCutRedo((r)=>[...r, last])
      setCutLeftPct(last.prevLeft)
      setCutRightPct(last.prevRight)
      return s.slice(0,-1)
    })
  }
  function redoCut(){
    setCutRedo((r)=>{
      if(!r.length) return r
      const last = r[r.length-1]
      setCutUndo((u)=>[...u, last])
      setCutLeftPct(last.nextLeft)
      setCutRightPct(last.nextRight)
      return r.slice(0,-1)
    })
  }

  // Drag handlers for green circle vertices (HTML buttons, fixed px size)
  function startDragFiHandle(e: React.PointerEvent){
    (e.target as HTMLElement).setPointerCapture((e as any).pointerId)
    const move = (ev: PointerEvent)=>{
      const vView = pxToViewPct(ev.clientX)
      const vAbs  = fromViewPct(vView)
      // convert to relative within kept region
      const rel = (vAbs - effStartPct)/Math.max(0.0001, effSpanPct)
      const maxFi = 1 - foWidthPct - MIN_PLATEAU
      setFiWidthPct(clamp01(Math.min(rel, maxFi)))
    }
    const up = ()=>{ window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  function startDragFoHandle(e: React.PointerEvent){
    (e.target as HTMLElement).setPointerCapture((e as any).pointerId)
    const move = (ev: PointerEvent)=>{
      const vView = pxToViewPct(ev.clientX)
      const vAbs  = fromViewPct(vView)
      const relFromEnd = (effEndPct - vAbs)/Math.max(0.0001, effSpanPct)
      const maxFo = 1 - fiWidthPct - MIN_PLATEAU
      setFoWidthPct(clamp01(Math.min(relFromEnd, maxFo)))
    }
    const up = ()=>{ window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Styles for purple gradient: hide outside kept range while in cut mode; full when normalized
  const gradientClipStyle = cutMode
    ? { clipPath: `polygon(${effStartPct*100}% 0, ${effEndPct*100}% 0, ${effEndPct*100}% 100%, ${effStartPct*100}% 100%)` }
    : undefined

  // Playhead for UI (view space)
  const playheadViewPct = toViewPct(playheadAbsPct)

  return (
    <TooltipProvider>
      <div className="min-h-[100vh] w-full bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(16,185,129,0.08),transparent),linear-gradient(180deg,#0b0c0e,#0e0f12)] text-zinc-200">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">プレビュー・編集（単体）</h1>
            <Button variant="outline" size="sm" onClick={resetPreview} className="bg-violet-500 text-white hover:bg-violet-600 border border-transparent shadow-sm focus-visible:ring-2 focus-visible:ring-violet-400"><RotateCcw className="mr-1 h-4 w-4"/>プレビュー初期化</Button>
          </header>

          <Card className="border-zinc-700 bg-[#0e0f12]">
            <CardContent className="p-4">
              {/* Toolbar: Fade / Cut */}
              <div className="mb-2 flex items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={fadeEnabled} onCheckedChange={setFadeEnabled} />
                  <span className="text-xs text-zinc-300">フェード</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[260px] text-xs">緑の丸（頂点）をドラッグしてフェード長さを調整。初期位置は開始から3秒／終了の3秒前に設定されます。</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" aria-pressed={cutMode} className={`h-6 px-2 ${cutMode ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-white text-black hover:bg-zinc-100'} focus-visible:ring-2 focus-visible:ring-sky-400`} onClick={()=>setCutMode(v=>!v)}>
                    <Scissors className="mr-1 h-3.5 w-3.5"/>カットモード
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[420px] text-xs">停止中にプレイヘッド位置にハサミが出ます。左＝この位置より前をカット、右＝この位置より後をカット。前後2箇所で範囲を残し、カット中は紫背景も範囲外から消えます。カットモードを終了すると残す範囲だけを**プレビューいっぱい**に再レイアウト（左端が0秒／右端が終了）し、そこから拡大縮小できます。↺取り消し／↻やり直し可。</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Timeline container */}
              <div ref={timelineRef} className="relative mb-2 h-36 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
                {/* Zoom +/- */}
                <div className="absolute right-2 top-1 z-50 flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="text-white/90 hover:bg-transparent" onClick={()=>setZoomIdx(i=>Math.max(0,i-1))} title="縮小"><Minus className="h-4 w-4"/></Button>
                  <Button size="icon" variant="ghost" className="text-white/90 hover:bg-transparent" onClick={()=>setZoomIdx(i=>Math.min(ZOOMS.length-1,i+1))} title="拡大"><Plus className="h-4 w-4"/></Button>
                </div>

                {/* Ruler (seek while playing keeps playing) */}
                <div className="absolute left-0 right-0 top-0 h-9 overflow-hidden border-b border-zinc-700 bg-zinc-950/80"
                  onPointerDown={(e)=>{ (e.target as HTMLElement).setPointerCapture((e as any).pointerId); seekFromClientX(e.clientX) }}
                  onPointerMove={(e)=>{ if((e as any).buttons===1) seekFromClientX(e.clientX) }}
                >
                  <div className="relative h-full" style={{ width: `${zoom*100}%`, transform: `translateX(-${scrollNorm*100}%)` }}>
                    <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.10) 0 1px, transparent 1px 40px)` }} />
                    {markers.map((m,i)=> (
                      <div key={i} className="absolute top-0 text-[10px] text-zinc-300" style={{ left: `${m.pct*100}%`, transform: "translateX(-50%)" }}>{m.label}</div>
                    ))}
                  </div>
                </div>

                {/* Track base (no purple). We'll add purple as a clipped layer below. */}
                <div className="absolute left-0 right-0 bottom-0 top-9 overflow-hidden bg-zinc-900">
                  <div className="relative h-full" style={{ width: `${zoom*100}%`, transform: `translateX(-${scrollNorm*100}%)` }}>

                    {/* Purple gradient layer: clipped to kept range while cutting, full when normalized */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#6d28d9] to-[#5b21b6]" style={gradientClipStyle as any} />

                    {/* Bars (either full or cropped+stretched) */}
                    <div className="absolute inset-0 z-0 grid gap-px opacity-90" style={{ gridTemplateColumns: `repeat(${BARS_FULL}, minmax(0,1fr))` }}>
                      {barsDisplay.map((amp, i) => (
                        <div key={i} className="mx-auto self-center rounded-sm" style={{ width: '2px', height: `${Math.max(10, amp*95)}%`, backgroundColor: '#1a0b2e' }} />
                      ))}
                    </div>

                    {/* Darken when in cut mode only (visual aid) */}
                    {cutMode && (
                      <>
                        {(cutLeftPct>0) && (
                          <div className="absolute top-0 bottom-0 z-10 left-0 bg-black/60" style={{ width: `${cutLeftPct*100}%` }} />
                        )}
                        {(cutRightPct<1) && (
                          <div className="absolute top-0 bottom-0 z-10 right-0 bg-black/60" style={{ width: `${(1-cutRightPct)*100}%` }} />
                        )}
                      </>
                    )}

                    {/* Fade lines in view space */}
                    {fadeEnabled && effSpanPct>0 && (
                      <div className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden">
                        <svg className="relative h-full w-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
                          <path d={fadePathIn()} stroke="rgba(16,185,129,0.95)" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke"/>
                          <line x1={xFiEndV} y1={0} x2={xFoStartV} y2={0} stroke="rgba(16,185,129,0.95)" strokeWidth={2} vectorEffect="non-scaling-stroke"/>
                          <path d={fadePathOut()} stroke="rgba(16,185,129,0.95)" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke"/>
                        </svg>
                      </div>
                    )}

                    {/* Fixed-size HTML handles for fade vertices (view space) */}
                    {fadeEnabled && effSpanPct>0 && (
                      <div className="absolute left-0 right-0 top-0 bottom-0 z-40 overflow-hidden">
                        <div className="relative h-full">
                          <button aria-label="フェードイン頂点" onPointerDown={startDragFiHandle}
                                  className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border border-white shadow cursor-grab"
                                  style={{ left: `${fiWidthPct*100}%`, top: 0 }} />
                          <button aria-label="フェードアウト頂点" onPointerDown={startDragFoHandle}
                                  className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border border-white shadow cursor-grab"
                                  style={{ left: `${(1-foWidthPct)*100}%`, top: 0 }} />
                        </div>
                      </div>
                    )}

                    {/* Cut action buttons (cut mode + paused) */}
                    {showCutButtons && (
                      <div className="absolute z-40 -translate-x-1/2 flex gap-1" style={{ left: `${toViewPct(playheadAbsPct)*100}%`, top: 12 }}>
                        <button onPointerDown={(e)=>e.stopPropagation()} onClick={()=>applyCutLeft(playheadAbsPct)} className="rounded-full bg-sky-600/90 p-1.5 text-white shadow hover:bg-sky-500" title="この位置より前をカット">
                          <Scissors className="h-3.5 w-3.5" style={{ transform: 'scaleX(-1)' }} />
                        </button>
                        <button onPointerDown={(e)=>e.stopPropagation()} onClick={()=>applyCutRight(playheadAbsPct)} className="rounded-full bg-sky-600/90 p-1.5 text-white shadow hover:bg-sky-500" title="この位置より後をカット">
                          <Scissors className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Playhead (view space) */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
                  <div className="relative h-full" style={{ width: `${zoom*100}%`, transform: `translateX(-${scrollNorm*100}%)` }}>
                    <div className="absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: `${playheadViewPct*100}%` }} />
                    <div className="absolute top-0 -translate-x-1/2 -translate-y-full rounded-sm px-1 text-[10px] font-medium bg-white text-black" style={{ left: `${playheadViewPct*100}%` }}>{fmt(displayTotalSec*playheadViewPct)}</div>
                  </div>
                </div>
              </div>

              {/* Horizontal scroll bar (only at zoom>1) */}
              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <span className="w-12 text-xs text-zinc-400">表示位置</span>
                  <div className="flex-1" onPointerDown={()=>{ isUserPanningRef.current = true; const up=()=>{ isUserPanningRef.current=false; window.removeEventListener('pointerup', up) }; window.addEventListener('pointerup', up) }}>
                    <Slider value={[scrollNorm*100]} onValueChange={([v])=>setScrollNorm(v/100)} disabled={maxViewStart===0} />
                  </div>
                </div>
              </div>

              {/* Transport */}
              <div className="mt-3 flex items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                {/* Undo/Redo in cut mode */}
                {cutMode && (
                  <>
                    <Button variant="ghost" size="icon" onClick={undoCut} title="取り消し" className="text-white hover:bg-transparent"><RotateCcw className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" onClick={redoCut} title="やり直し" className="text-white hover:bg-transparent"><RotateCw className="h-5 w-5"/></Button>
                  </>
                )}

                {/* To start (always reset next play to region start) */}
                <Button variant="ghost" size="icon" onClick={()=>{ const startAbs = effStartPct; pausePlayback(); pausedAtSecRef.current = startAbs*totalSec; setPlayheadAbsPct(startAbs); setScrollNorm(0); }} title="最初へ" className="text-white hover:bg-transparent"><SkipBack className="h-5 w-5"/></Button>

                {/* Play/Pause toggle */}
                <Button variant="ghost" size="icon" onClick={togglePlay} title={playing? '一時停止':'再生'} className="text-white hover:bg-transparent">{playing ? <Pause className="h-6 w-6"/> : <Play className="h-6 w-6"/>}</Button>

                {/* Stop = reset next play to region start */}
                <Button variant="ghost" size="icon" onClick={()=>{ const startAbs = effStartPct; pausePlayback(); pausedAtSecRef.current = startAbs*totalSec; setPlayheadAbsPct(startAbs); setScrollNorm(0); }} title="停止" className="text-white hover:bg-transparent"><Square className="h-5 w-5"/></Button>

                <div className="ml-3 text-xs tabular-nums text-white/90">{fmt(displayTotalSec*playheadViewPct)} / {fmt(displayTotalSec)}</div>
              </div>

              {/* Extras: loop & preview volume & harmonies */}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={loop} onCheckedChange={(v)=>{ setLoop(v); if(sourceRef.current){ const at = currentSec(); startPlayback(at) } }} /><span className="text-xs text-zinc-300">ループ再生</span></div>
                <div className="flex items-center gap-2"><span className="text-xs text-zinc-300">プレビュー音量</span><div className="min-w-[160px]"><Slider value={[previewVol*100]} onValueChange={([v])=>{ setPreviewVol(v/100); const g=gainRef.current; if(g){ g.gain.setValueAtTime((v/100), (audioCtxRef.current?.currentTime||0)) } }} /></div></div>
                <div className="flex items-center gap-2"><Switch checked={harmOn} onCheckedChange={setHarmOn} /><span className="text-sm text-zinc-200">ハモリを重ねる</span></div>
                <Button size="icon" onClick={()=>setHarmSolo(v=>!v)} aria-pressed={harmSolo} className={`${harmSolo ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-black hover:bg-zinc-100'} border border-transparent shadow-sm`}>
                  {harmSolo ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}
                </Button>
                <div className="min-w-[160px] flex-1"><Slider value={[INITIAL.harmVol*100]} onValueChange={()=>{}} disabled /></div>
                <Button size="sm" className="bg-violet-500 text-white hover:bg-violet-600 border border-transparent shadow-sm"><Wand2 className="mr-1 h-4 w-4"/>ハモリ再生成</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
