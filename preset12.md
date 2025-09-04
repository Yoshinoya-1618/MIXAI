package.json
{
  "name": "uta-seion",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "render": "node dist/cli.js"
  },
  "dependencies": {
    "execa": "^8.0.1",
    "fs-extra": "^11.2.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^22.5.0",
    "typescript": "^5.5.4"
  }
}

tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}

requirements.txt（Python）
librosa>=0.10.1
numpy>=1.26
soundfile>=0.12

TypeScript 側
src/types.ts
export type PlanCode = 'lite' | 'standard' | 'creator';

export type ThemeKey =
  | 'clean_light' | 'soft_room' | 'vocal_lift_lite'
  | 'wide_pop' | 'warm_ballad' | 'rap_tight' | 'idol_bright'
  | 'studio_shine' | 'airy_sparkle' | 'live_stage' | 'vintage_warm' | 'night_chill';

export interface Theme {
  key: ThemeKey;
  displayName: string;
  // 目標ベクトル（0..1）
  targets: {
    brightness: number;   // 高域量（8–14k）
    presence: number;     // 2–5k の輪郭
    air: number;          // 12–18k の空気感
    warmth: number;       // 120–300Hz の厚み（高いほど低域寄り）
    space: number;        // 残響感
    forward: number;      // 前後感（amixの声の重み）
    tightness: number;    // ダイナミクスの固さ（コンプ強度）
    sibilanceGuard: number; // S音ガード（De-esser意欲）
    vintage: number;      // ヴィンテージ傾向（トップ控えめ＆ロー厚）
  };
  notes?: string;
}

export interface VoiceProfile {
  // Python解析の出力（正規化済み 0..1）
  hfRatio: number;         // 8–14k / 全体
  sibRatio: number;        // 5–9k / 全体
  lowMidRatio: number;     // 120–300Hz / 全体
  centroid: number;        // スペクトル重心（正規化）
  noiseFloor: number;      // dBFS換算を0..1に正規化（高いほどノイジー）
  crest: number;           // クレスト係数（正規化）
  dynRange: number;        // ダイナミックレンジ（正規化）
  vibratoRate: number;     // 目安（0..1）
  hnr: number;             // Harmonic-to-Noise Ratio（0..1）
}

export interface InstProfile {
  density: number;         // 伴奏の密度（0..1）
  lowEnergy: number;       // 低域量（0..1）
  brightness: number;      // 高域量（0..1）
  loudnessVsVocal: number; // ボーカル比での相対ラウドネス（>0 でinstが大きい）
}

export interface AlignInfo {
  offsetMs: number;        // 推定頭出し差
  tempoVar: number;        // テンポ変動度（0..1）
  beatDevMs: number;       // 平均拍ズレ
}

export interface AnalysisResult {
  voice: VoiceProfile;
  inst: InstProfile;
  align: AlignInfo;
}

export interface MicroAdjust {
  forwardness?: number; // -1..+1
  space?: number;       // -1..+1
  brightness?: number;  // -1..+1
}

export interface MixParams {
  // Vocal chain
  hpfHz: number | null;
  lpfHz: number | null;
  deesser: number | null;     // ffmpeg deesser i= の目安（3〜7）
  comp: { thr: number; ratio: number; atk: number; rel: number; makeup: number; };
  eq: Array<{ f: number; q: number; g: number }>;
  reverb: { predelayMs: number; amount: number }; // amount 0..0.5 目安

  // Mix
  vocalWeight: number;
  instWeight: number;

  // Rescue（サイドチェイン）
  rescue: { enabled: boolean; thr: number; ratio: number; atk: number; rel: number };

  // Loudness
  loudnorm: { I: number; LRA: number; TP: number };
}

src/themes.ts
import { Theme } from './types.js';

export const THEMES: Theme[] = [
  { key: 'clean_light', displayName: 'Clean Light',
    targets: { brightness: 0.55, presence: 0.55, air: 0.45, warmth: 0.35, space: 0.20, forward: 0.60, tightness: 0.45, sibilanceGuard: 0.55, vintage: 0.20 },
    notes: 'クセを抑えフラットに'
  },
  { key: 'soft_room', displayName: 'Soft Room',
    targets: { brightness: 0.50, presence: 0.50, air: 0.35, warmth: 0.40, space: 0.35, forward: 0.55, tightness: 0.40, sibilanceGuard: 0.50, vintage: 0.25 },
    notes: '薄い部屋鳴り'
  },
  { key: 'vocal_lift_lite', displayName: 'Vocal Lift Lite',
    targets: { brightness: 0.60, presence: 0.70, air: 0.45, warmth: 0.30, space: 0.10, forward: 0.75, tightness: 0.55, sibilanceGuard: 0.60, vintage: 0.15 },
    notes: '前に出す・輪郭'
  },
  { key: 'wide_pop', displayName: 'Wide Pop',
    targets: { brightness: 0.65, presence: 0.65, air: 0.55, warmth: 0.30, space: 0.30, forward: 0.70, tightness: 0.50, sibilanceGuard: 0.60, vintage: 0.20 },
    notes: '広がりと抜け'
  },
  { key: 'warm_ballad', displayName: 'Warm Ballad',
    targets: { brightness: 0.45, presence: 0.55, air: 0.35, warmth: 0.55, space: 0.40, forward: 0.55, tightness: 0.40, sibilanceGuard: 0.45, vintage: 0.35 },
    notes: 'やわらかく温かい'
  },
  { key: 'rap_tight', displayName: 'Rap Tight',
    targets: { brightness: 0.55, presence: 0.75, air: 0.30, warmth: 0.20, space: 0.05, forward: 0.85, tightness: 0.70, sibilanceGuard: 0.70, vintage: 0.10 },
    notes: '近接・タイト'
  },
  { key: 'idol_bright', displayName: 'Idol Bright',
    targets: { brightness: 0.70, presence: 0.75, air: 0.65, warmth: 0.25, space: 0.25, forward: 0.72, tightness: 0.55, sibilanceGuard: 0.65, vintage: 0.15 },
    notes: '明るくキラッと'
  },
  { key: 'studio_shine', displayName: 'Studio Shine',
    targets: { brightness: 0.68, presence: 0.70, air: 0.70, warmth: 0.30, space: 0.28, forward: 0.68, tightness: 0.60, sibilanceGuard: 0.65, vintage: 0.20 },
    notes: '艶と奥行き'
  },
  { key: 'airy_sparkle', displayName: 'Airy Sparkle',
    targets: { brightness: 0.70, presence: 0.65, air: 0.80, warmth: 0.25, space: 0.32, forward: 0.62, tightness: 0.50, sibilanceGuard: 0.55, vintage: 0.15 },
    notes: '空気感と透明'
  },
  { key: 'live_stage', displayName: 'Live Stage',
    targets: { brightness: 0.55, presence: 0.60, air: 0.45, warmth: 0.40, space: 0.55, forward: 0.55, tightness: 0.45, sibilanceGuard: 0.50, vintage: 0.25 },
    notes: '会場感'
  },
  { key: 'vintage_warm', displayName: 'Vintage Warm',
    targets: { brightness: 0.40, presence: 0.50, air: 0.30, warmth: 0.65, space: 0.25, forward: 0.58, tightness: 0.40, sibilanceGuard: 0.45, vintage: 0.75 },
    notes: 'レトロで太い'
  },
  { key: 'night_chill', displayName: 'Night Chill',
    targets: { brightness: 0.50, presence: 0.60, air: 0.35, warmth: 0.35, space: 0.10, forward: 0.82, tightness: 0.60, sibilanceGuard: 0.60, vintage: 0.20 },
    notes: '落ち着いた近接'
  },
];

src/analyzer.ts
import { execa } from 'execa';
import { z } from 'zod';
import path from 'node:path';

const Schema = z.object({
  voice: z.object({
    hfRatio: z.number(), sibRatio: z.number(), lowMidRatio: z.number(),
    centroid: z.number(), noiseFloor: z.number(), crest: z.number(),
    dynRange: z.number(), vibratoRate: z.number(), hnr: z.number(),
  }),
  inst: z.object({
    density: z.number(), lowEnergy: z.number(), brightness: z.number(), loudnessVsVocal: z.number(),
  }),
  align: z.object({
    offsetMs: z.number(), tempoVar: z.number(), beatDevMs: z.number(),
  })
});

export async function analyze(vocalPath: string, instPath: string): Promise<z.infer<typeof Schema>> {
  const script = path.resolve(new URL('.', import.meta.url).pathname, 'analyze.py');
  const { stdout } = await execa('python3', [script, '--vocal', vocalPath, '--inst', instPath], { stdout: 'pipe' });
  const json = JSON.parse(stdout);
  return Schema.parse(json);
}

src/solver.ts
import { AnalysisResult, MicroAdjust, MixParams, PlanCode, Theme } from './types.js';

// clamp
const cl = (x:number, a:number, b:number)=> Math.min(b, Math.max(a, x));
// map 0..1 -> [lo..hi]
const map = (v:number, lo:number, hi:number)=> lo + (hi-lo)*cl(v,0,1);

// 差分をもとに数値を決める（テーマ目標 - 実測）
// ここで「固定値」は使わず、範囲だけ定義して毎回解く
export function solveParams(theme: Theme, ar: AnalysisResult, plan: PlanCode, micro: MicroAdjust = {}): MixParams {
  const t = theme.targets;
  const v = ar.voice;
  const i = ar.inst;

  // --- 明るさ/存在感/空気感の不足量（+なら不足）
  const brightLack = cl(t.brightness - v.hfRatio, -1, 1);
  const presenceLack = cl(t.presence - v.centroid, -1, 1);
  const airLack = cl(t.air - v.hfRatio, -1, 1) + (t.air - t.brightness)*0.3;

  // 温かさ（ローの出し引き）
  const warmthDelta = cl(t.warmth - v.lowMidRatio, -1, 1);

  // De-esserは S 比とガードの複合
  const deessIntent = cl((v.sibRatio*0.6 + t.sibilanceGuard*0.6) - 0.6, 0, 1);
  const deesser = map(deessIntent, 3.2, 6.8);

  // HPF/LPF（vintageが高いほどLPFを下げ、warmthが高いほどHPFを下げる）
  const hpf = Math.round(cl(90 + (v.lowMidRatio - 0.35)*120 - t.warmth*40, 60, 120));
  const lpf = Math.round(cl(20000 - t.vintage*6000 - airLack*2000, 15000, 20000));

  // EQバンド（存在感 2.5–4k / 空気感 10–14k / ロー整理 120–250）
  const eq: MixParams['eq'] = [];
  // ロー整理 or 低域ブースト
  eq.push({ f: 160, q: 1.0, g: cl(-2.5* (v.lowMidRatio - t.warmth), -3, 3) });
  // プレゼンス
  const presF = map(t.presence, 1800, 4200);
  eq.push({ f: presF, q: 1.0, g: cl(3.0*presenceLack, -2.5, 3.0) });
  // エア
  const airF = map(t.air, 9000, 14000);
  eq.push({ f: airF, q: 0.8, g: cl(2.8*airLack, -2.0, 3.0) });

  // Comp（tightness で強さ。crestが大きいほど必要）
  const needComp = cl( (t.tightness*0.6 + v.crest*0.5), 0, 1);
  const ratio = map(needComp, 1.8, 3.5);
  const thr = -map(needComp, 14, 22);
  const atk = Math.round(map(needComp, 4, 10));
  const rel = Math.round(map(needComp, 90, 180));
  const makeup = map(needComp, 3, 5);

  // Reverb（noiseFloorが高いほど抑制）
  const baseSpace = t.space + (micro.space ?? 0)*0.15;
  const space = cl(baseSpace*(1 - v.noiseFloor*0.6), 0, 0.55);
  const predelay = Math.round(map(t.forward, 60, 120));

  // Forwardness → amixの重み
  const baseFwd = t.forward + (micro.forwardness ?? 0)*0.15;
  const vocalW = cl(map(baseFwd, 1.1, 1.45), 1.05, 1.5);
  const instW  = 1.0 * (1 - (baseFwd-0.5)*0.1);

  // Rescue（埋もれ度：伴奏の相対ラウド＋前後感不足）
  const buried = cl(i.loudnessVsVocal*0.6 + (0.75 - baseFwd)*0.8 + i.density*0.4, 0, 1);
  const rescueEnabled =
    plan === 'creator' ? buried > 0.35 :
    plan === 'standard' ? false : false; // Liteは常にOFF、Standardは手動ONを想定（ここはfalse）

  const rescue = {
    enabled: rescueEnabled,
    thr: -14,
    ratio: 1.3,
    atk: 10,
    rel: 120
  };

  // Loudness（ジャンルで軽く調整。vintage高→少し緩め）
  const I = -14;
  const LRA = Math.round(map(t.vintage, 7, 10));
  const TP = -1.2;

  // 微調整：明るさ（3.5k/12kは上のeqで既に反映。補助で全体ゲイン微推し）
  if (micro.brightness) {
    const delta = cl(micro.brightness, -1, 1);
    eq.push({ f: 3500, q: 1.0, g: delta * 1.2 });
    eq.push({ f: 12000, q: 0.8, g: delta * 1.0 });
  }

  return {
    hpfHz: hpf,
    lpfHz: lpf,
    deesser,
    comp: { thr, ratio, atk, rel, makeup },
    eq,
    reverb: { predelayMs: predelay, amount: space },
    vocalWeight: Number(vocalW.toFixed(2)),
    instWeight: Number(cl(instW, 0.9, 1.1).toFixed(2)),
    rescue,
    loudnorm: { I, LRA, TP }
  };
}

src/ffmpegGraph.ts
import { MixParams, PlanCode } from './types.js';

export function buildFiltergraph(p: MixParams, plan: PlanCode) {
  const v: string[] = [];
  if (p.hpfHz) v.push(`highpass=f=${p.hpfHz}`);
  if (p.lpfHz) v.push(`lowpass=f=${p.lpfHz}`);
  if (p.deesser) v.push(`deesser=i=${p.deesser.toFixed(1)}`);
  const c = p.comp;
  v.push(`acompressor=threshold=${c.thr.toFixed(1)}dB:ratio=${c.ratio.toFixed(2)}:attack=${c.atk}:release=${c.rel}:makeup=${c.makeup.toFixed(1)}`);
  p.eq.forEach(b => v.push(`equalizer=f=${Math.round(b.f)}:t=q:w=${b.q.toFixed(2)}:g=${b.g.toFixed(1)}`));
  // aecho でプレディレイ相当＋弱残響（簡易、Rubber Bandやladspaのfreeverb等に差し替え可）
  const dec = p.reverb.amount;
  if (dec > 0.01) v.push(`aecho=0.7:0.6:${Math.round(p.reverb.predelayMs)}:${dec.toFixed(2)}`);

  const vChain = v.length ? `[0:a]${v.join(',')}[vv];` : `[0:a]anull[vv];`;

  // inst（既定BYPASS）
  let instLabel = 'ii';
  let iChain = `[1:a]anull[${instLabel}];`;

  // Rescue（Creator自動のみここでON）
  if (p.rescue.enabled) {
    iChain = `[1:a]anull[im];[vv]anull[vkey];` +
      `[im][vkey]sidechaincompress=threshold=${p.rescue.thr}dB:ratio=${p.rescue.ratio}:attack=${p.rescue.atk}:release=${p.rescue.rel}:makeup=0[${instLabel}];`;
  }

  const amix = `[vv][${instLabel}]amix=inputs=2:weights=${p.vocalWeight}\\|${p.instWeight}:normalize=0`;
  const ln = `loudnorm=I=${p.loudnorm.I}:LRA=${p.loudnorm.LRA}:TP=${p.loudnorm.TP}:measured_I=-99:print_format=summary`;
  const lim = `alimiter=limit=0.98`;
  return vChain + iChain + `${amix},${ln},${lim}[out]`;
}

src/render.ts
import { execa } from 'execa';
import { analyze } from './analyzer.js';
import { THEMES } from './themes.js';
import { solveParams } from './solver.js';
import { MicroAdjust, PlanCode, ThemeKey } from './types.js';
import fs from 'fs-extra';

export async function renderMix(args: {
  vocalPath: string;
  instPath: string;
  outPath: string;
  theme: ThemeKey;
  plan: PlanCode;
  micro?: MicroAdjust;
  codec?: 'wav'|'mp3';
}) {
  const { vocalPath, instPath, outPath, theme, plan, micro = {}, codec = 'wav' } = args;

  // 1) 解析
  const ar = await analyze(vocalPath, instPath);

  // 2) テーマ選択 → パラメータ解決
  const th = THEMES.find(t => t.key === theme)!;
  const params = solveParams(th, ar, plan, micro);

  // 3) FFmpeg Filtergraph
  const { buildFiltergraph } = await import('./ffmpegGraph.js');
  const fg = buildFiltergraph(params, plan);

  // 4) 実行
  await fs.ensureDir(fs.dirname(outPath));
  const commonArgs = ['-y', '-i', instPath, '-i', vocalPath, '-filter_complex', fg, '-map', '[out]'];
  if (codec === 'wav') {
    await execa('ffmpeg', [...commonArgs, '-c:a', 'pcm_s16le', outPath], { stdio: 'inherit' });
  } else {
    await execa('ffmpeg', [...commonArgs, '-c:a', 'libmp3lame', '-q:a', '0', outPath], { stdio: 'inherit' });
  }

  return { params, analysis: ar, theme: th };
}

src/cli.ts
#!/usr/bin/env node
import { renderMix } from './render.js';

async function main() {
  const vocal = process.argv[2];
  const inst = process.argv[3];
  const out = process.argv[4] ?? 'out.wav';
  const theme = (process.argv[5] ?? 'clean_light') as any;
  const plan = (process.argv[6] ?? 'standard') as any;

  if (!vocal || !inst) {
    console.error('usage: render <vocal.wav> <inst.wav> [out.wav] [themeKey] [plan: lite|standard|creator]');
    process.exit(1);
  }

  const { params, analysis, theme: th } = await renderMix({
    vocalPath: vocal, instPath: inst, outPath: out, theme, plan, codec: 'mp3'
  });

  console.log('=== THEME ===', th.displayName);
  console.log('=== ANALYSIS ===', JSON.stringify(analysis, null, 2));
  console.log('=== SOLVED PARAMS ===', JSON.stringify(params, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

Python 側（特徴量抽出）
src/analyze.py
#!/usr/bin/env python3
import argparse, json, numpy as np, librosa as lb, soundfile as sf

def safe_load(path, sr=44100):
  y, _ = lb.load(path, sr=sr, mono=True)
  # 正規化（安全）
  if np.max(np.abs(y)) > 0: y = y / np.max(np.abs(y))
  return y, sr

def band_energy(y, sr, lo, hi):
  S = np.abs(lb.stft(y, n_fft=2048, hop_length=512))**2
  freqs = lb.fft_frequencies(sr=sr, n_fft=2048)
  mask = (freqs >= lo) & (freqs <= hi)
  if not np.any(mask): return 0.0
  e = S[mask].sum()
  return float(e)

def energy_ratios(y, sr):
  total = band_energy(y, sr, 20, 20000) + 1e-9
  hf = band_energy(y, sr, 8000, 14000) / total
  sib = band_energy(y, sr, 5000, 9000) / total
  lowmid = band_energy(y, sr, 120, 300) / total
  return float(hf), float(sib), float(lowmid)

def spectral_centroid_norm(y, sr):
  sc = lb.feature.spectral_centroid(y=y, sr=sr)[0]
  v = np.nanmean(sc) / (sr/2.0)  # 0..1 正規化
  return float(np.clip(v, 0, 1))

def crest_factor(y):
  rms = np.sqrt(np.mean(y**2)+1e-9)
  peak = np.max(np.abs(y))+1e-9
  cf = peak/(rms+1e-9)
  # 1.0〜∞を 0..1 正規化（対数）
  v = (np.log10(cf)-0.1)/1.2
  return float(np.clip(v, 0, 1))

def dyn_range(y):
  # レベル分布の95% - 5%（dB）→ 0..1
  eps=1e-9
  db = 20*np.log10(np.abs(y)+eps)
  p95, p05 = np.percentile(db, 95), np.percentile(db, 5)
  dr = p95 - p05
  v = (dr-15)/25  # 15..40dB を 0..1
  return float(np.clip(v, 0, 1))

def noise_floor(y):
  # 無音近傍の最小10%の平均レベル
  eps=1e-9
  db = 20*np.log10(np.abs(y)+eps)
  mn = np.mean(np.sort(db)[:max(1,int(0.1*len(db)))])
  # -80..-30dBを 0..1
  v = (mn + 80)/50
  return float(np.clip(v, 0, 1))

def vibrato_rate(y, sr):
  # 簡易：f0は使わずAM/FM様のゼロ交差で推定（粗いが相対指標には使える）
  zc = lb.feature.zero_crossing_rate(y, frame_length=1024, hop_length=256)[0]
  rate = np.mean(zc) * (sr/256) / 1000.0  # kHz換算の擬似レート
  v = np.clip(rate/6.0, 0, 1)  # 0..6 を 0..1
  return float(v)

def hnr_proxy(y):
  # 簡易HNR: スペクトル平坦度の反転
  sfm = np.mean(lb.feature.spectral_flatness(y=y))
  return float(np.clip(1.0 - sfm, 0, 1))

def density_inst(y, sr):
  # 伴奏の密度＝オンセット強度の平均＋広帯域エネルギ
  on = lb.onset.onset_strength(y=y, sr=sr)
  v = np.clip(np.mean(on)/5.0, 0, 1)
  return float(v)

def brightness_inst(y, sr):
  sc = lb.feature.spectral_centroid(y=y, sr=sr)[0]
  v = np.nanmean(sc)/(sr/2)
  return float(np.clip(v, 0, 1))

def low_energy_inst(y, sr):
  total = band_energy(y, sr, 20, 20000)+1e-9
  low = band_energy(y, sr, 20, 120)+band_energy(y, sr, 120, 300)
  v = (low/total)
  return float(np.clip(v*2.0, 0, 1))  # 強調

def loudness_vs(vocal, inst):
  # 粗いRMS比（instが大きいと +、vocalが大きいと -）
  rv = np.sqrt(np.mean(vocal**2)+1e-9)
  ri = np.sqrt(np.mean(inst**2)+1e-9)
  return float(np.clip(np.log10(ri/(rv+1e-9))*2.0, -1, 1))

def align(vocal, inst, sr):
  # オンセット強度の相互相関でオフセット
  ov = lb.onset.onset_strength(y=vocal, sr=sr)
  oi = lb.onset.onset_strength(y=inst, sr=sr)
  n = min(len(ov), len(oi))
  if n < 16:
    return 0.0, 0.2, 50.0
  ov = ov[:n]; oi = oi[:n]
  xcorr = np.correlate(ov - ov.mean(), oi - oi.mean(), mode='full')
  lag = np.argmax(xcorr) - (n-1)
  hop = 512
  offset = lag * hop / sr * 1000.0

  # テンポ変動（Beattrackの信頼度の反転を仮の指標に）
  _, bt = lb.beat.beat_track(y=inst, sr=sr, trim=False)
  tempoVar = float(np.clip(1.0 - len(bt)/(n/4+1e-9), 0, 1))
  # 拍ズレ（粗い）：ボーカルのピークとinstビートのズレ
  beat_t = lb.frames_to_time(bt, sr=sr)
  on_t = lb.onset.onset_detect(y=vocal, sr=sr, units='time')
  if len(beat_t) and len(on_t):
    dev = []
    for t in on_t:
      j = np.argmin(np.abs(beat_t - t))
      dev.append(abs(beat_t[j]-t))
    beatDevMs = float(np.mean(dev)*1000.0)
  else:
    beatDevMs = 60.0

  return float(offset), float(tempoVar), float(beatDevMs)

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--vocal', required=True)
  ap.add_argument('--inst', required=True)
  args = ap.parse_args()

  v, sr = safe_load(args.vocal)
  i, _ = safe_load(args.inst, sr=sr)

  # voice
  hf, sib, lowmid = energy_ratios(v, sr)
  voice = {
    "hfRatio": float(np.clip(hf, 0, 1)),
    "sibRatio": float(np.clip(sib*1.4, 0, 1)),
    "lowMidRatio": float(np.clip(lowmid*1.8, 0, 1)),
    "centroid": spectral_centroid_norm(v, sr),
    "noiseFloor": noise_floor(v),
    "crest": crest_factor(v),
    "dynRange": dyn_range(v),
    "vibratoRate": vibrato_rate(v, sr),
    "hnr": hnr_proxy(v),
  }

  # inst
  inst = {
    "density": density_inst(i, sr),
    "lowEnergy": low_energy_inst(i, sr),
    "brightness": brightness_inst(i, sr),
    "loudnessVsVocal": loudness_vs(v, i)
  }

  # align
  offsetMs, tempoVar, beatDevMs = align(v, i, sr)
  align_info = { "offsetMs": offsetMs, "tempoVar": tempoVar, "beatDevMs": beatDevMs }

  print(json.dumps({ "voice": voice, "inst": inst, "align": align_info }))
if __name__ == '__main__':
  main()

使い方（例）
# 依存インストール
pip3 install -r requirements.txt
npm i
npm run build

# レンダリング（標準プラン・テーマ=wide_pop）
node dist/cli.js vocal.wav inst.wav out.mp3 wide_pop standard


12テーマは themes.ts で目標ベクトルとして定義。

analyze.py がボーカル/伴奏を解析して**特徴量（0..1）**を返します。

solver.ts が 「目標 − 実測」 を解いて、HPF/LPF、De-esser、EQ、Comp、Reverb、前後感、Rescue、Loudnessの数値をその都度算出。

固定パラメータのプリセットは存在しません。素材・テーマ・プラン・（任意）微調整によって毎回最適化されます。

instは原則BYPASS、Creatorのみ自動Rescueが状況に応じて軽く入ります（Standardは手動ON想定 ↔ 実装フラグで切替可）。