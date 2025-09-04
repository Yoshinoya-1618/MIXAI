#!/usr/bin/env python3
"""
ハモリ生成システム
上3度・下3度・完全5度のハーモニー生成
CLAUDE.md準拠のハモリ機能
"""
import argparse
import json
import numpy as np
import librosa as lb
import soundfile as sf
from scipy import signal

# ピッチシフト関係のインポート
try:
    import crepe
    HAS_CREPE = True
except ImportError:
    HAS_CREPE = False

try:
    import pyworld as pw
    HAS_WORLD = True
except ImportError:
    HAS_WORLD = False

def safe_load(path, sr=44100):
    """安全な音声ファイル読み込み"""
    try:
        y, _ = lb.load(path, sr=sr, mono=True)
        if np.max(np.abs(y)) > 0:
            y = y / np.max(np.abs(y)) * 0.95
        return y, sr
    except Exception as e:
        raise RuntimeError(f"Failed to load {path}: {e}")

def detect_vocal_regions(vocal, sr, min_duration=0.2):
    """
    ボーカル区間検出
    ハモリを適用する区間を特定
    """
    # 短時間エネルギーとスペクトル重心で判定
    hop_length = 512
    frame_length = 2048
    
    # エネルギー計算
    energy = np.array([
        np.sum(np.abs(vocal[i:i+frame_length]**2))
        for i in range(0, len(vocal) - frame_length, hop_length)
    ])
    
    # スペクトル重心
    spectral_centroids = lb.feature.spectral_centroid(
        y=vocal, sr=sr, hop_length=hop_length
    )[0]
    
    # 正規化
    energy = energy / (np.max(energy) + 1e-9)
    centroids_norm = spectral_centroids / (np.max(spectral_centroids) + 1e-9)
    
    # ボーカル区間判定（エネルギー + スペクトル特徴）
    energy_threshold = 0.15
    centroid_threshold = 0.3
    
    vocal_mask = (energy > energy_threshold) & (centroids_norm > centroid_threshold)
    
    # 時間軸に変換
    times = lb.frames_to_time(np.arange(len(vocal_mask)), sr=sr, hop_length=hop_length)
    
    # 連続区間の抽出
    regions = []
    start_time = None
    
    for i, (time, is_vocal) in enumerate(zip(times, vocal_mask)):
        if is_vocal and start_time is None:
            start_time = time
        elif not is_vocal and start_time is not None:
            duration = time - start_time
            if duration >= min_duration:
                regions.append({
                    'start': float(start_time),
                    'end': float(time),
                    'duration': float(duration)
                })
            start_time = None
    
    # 最後の区間処理
    if start_time is not None:
        duration = times[-1] - start_time
        if duration >= min_duration:
            regions.append({
                'start': float(start_time),
                'end': float(times[-1]),
                'duration': float(duration)
            })
    
    return regions

def pitch_shift_world(audio, sr, semitones):
    """
    WORLD vocoder によるピッチシフト
    フォルマント保持で自然なハモリ生成
    """
    if not HAS_WORLD:
        return pitch_shift_basic(audio, sr, semitones)
    
    try:
        # float64変換
        x = audio.astype(np.float64)
        
        # WORLD分析
        f0, sp, ap = pw.wav2world(x, sr)
        
        # ピッチシフト（セント単位）
        pitch_ratio = 2 ** (semitones / 12)
        shifted_f0 = f0 * pitch_ratio
        
        # フォルマント周波数は維持（スペクトル包絡はそのまま）
        # 音質向上のため、わずかにスペクトル調整
        if semitones > 0:  # 上行
            # 高音での鋭さを少し抑制
            for i in range(sp.shape[1]):
                if i > sp.shape[1] * 0.7:  # 高域
                    sp[:, i] *= 0.95
        else:  # 下行
            # 低音での厚みを少し追加
            for i in range(sp.shape[1]):
                if i < sp.shape[1] * 0.3:  # 低域
                    sp[:, i] *= 1.05
        
        # WORLD再合成
        shifted_audio = pw.synthesize(shifted_f0, sp, ap, sr)
        
        # 長さ調整・正規化
        shifted_audio = shifted_audio[:len(audio)]
        if np.max(np.abs(shifted_audio)) > 0:
            shifted_audio = shifted_audio / np.max(np.abs(shifted_audio)) * 0.9
        
        return shifted_audio.astype(np.float32)
        
    except Exception as e:
        print(f"WORLD pitch shift error: {e}")
        return pitch_shift_basic(audio, sr, semitones)

def pitch_shift_basic(audio, sr, semitones):
    """
    基本的なピッチシフト（librosa使用）
    WORLD未使用時のフォールバック
    """
    try:
        shifted = lb.effects.pitch_shift(audio, sr=sr, n_steps=semitones)
        # 正規化
        if np.max(np.abs(shifted)) > 0:
            shifted = shifted / np.max(np.abs(shifted)) * 0.9
        return shifted
    except Exception as e:
        print(f"Basic pitch shift error: {e}")
        return audio

def apply_harmony_eq(harmony_audio, sr, harmony_type):
    """
    ハモリ専用EQ処理
    メインボーカルとの棲み分けのための音質調整
    """
    try:
        # EQ設定（ハモリタイプ別）
        eq_settings = {
            'up_m3': {
                # 上3度：少し控えめに、高域を少しカット
                'high_cut': {'freq': 8000, 'q': 0.7, 'gain': -1.5},
                'presence': {'freq': 3000, 'q': 1.0, 'gain': -0.8},
                'low_cut': {'freq': 120, 'q': 0.5, 'gain': 0.0}
            },
            'down_m3': {
                # 下3度：温かみを強調、低域を少し抑制
                'high_cut': {'freq': 6000, 'q': 0.6, 'gain': -1.0},
                'presence': {'freq': 2500, 'q': 1.0, 'gain': -0.5},
                'low_cut': {'freq': 150, 'q': 0.5, 'gain': -1.0}
            },
            'perfect_5th': {
                # 完全5度：透明感を重視、中域を少し控えめ
                'high_cut': {'freq': 7000, 'q': 0.8, 'gain': -0.8},
                'presence': {'freq': 2800, 'q': 1.0, 'gain': -1.2},
                'low_cut': {'freq': 100, 'q': 0.5, 'gain': -0.5}
            }
        }
        
        settings = eq_settings.get(harmony_type, eq_settings['up_m3'])
        
        # 簡易EQフィルタ適用（バイクアッド）
        audio_processed = harmony_audio.copy()
        
        # High Cut
        hc = settings['high_cut']
        sos = signal.butter(2, hc['freq'] / (sr/2), btype='low', output='sos')
        audio_processed = signal.sosfilt(sos, audio_processed)
        
        # Low Cut  
        lc = settings['low_cut']
        if lc['gain'] < -0.1:
            sos = signal.butter(1, lc['freq'] / (sr/2), btype='high', output='sos')
            audio_processed = signal.sosfilt(sos, audio_processed)
        
        # ゲイン調整（全体音量）
        overall_gain = {
            'up_m3': 0.85,      # 上3度は少し控えめ
            'down_m3': 0.90,    # 下3度は標準
            'perfect_5th': 0.80  # 5度は最も控えめ
        }.get(harmony_type, 0.85)
        
        audio_processed *= overall_gain
        
        return audio_processed
        
    except Exception as e:
        print(f"Harmony EQ error: {e}")
        return harmony_audio * 0.8  # フォールバック

def generate_harmony(vocal, sr, harmony_type='up_m3', vocal_regions=None):
    """
    ハモリ生成メイン関数
    """
    # セミトーン設定
    semitone_map = {
        'up_m3': 4,       # 上3度（長3度）
        'down_m3': -4,    # 下3度
        'perfect_5th': 7   # 完全5度
    }
    
    semitones = semitone_map.get(harmony_type, 4)
    
    # ピッチシフト実行
    if HAS_WORLD:
        harmony_audio = pitch_shift_world(vocal, sr, semitones)
    else:
        harmony_audio = pitch_shift_basic(vocal, sr, semitones)
    
    # ハモリ専用EQ
    harmony_audio = apply_harmony_eq(harmony_audio, sr, harmony_type)
    
    # ボーカル区間のみに制限（指定があれば）
    if vocal_regions:
        masked_harmony = np.zeros_like(harmony_audio)
        
        for region in vocal_regions:
            start_sample = int(region['start'] * sr)
            end_sample = int(region['end'] * sr)
            end_sample = min(end_sample, len(harmony_audio))
            
            if start_sample < len(harmony_audio):
                # フェードイン・アウト（自然な繋ぎ）
                fade_samples = min(int(0.05 * sr), (end_sample - start_sample) // 4)
                
                region_audio = harmony_audio[start_sample:end_sample].copy()
                
                # フェードイン
                if fade_samples > 0:
                    fade_in = np.linspace(0, 1, fade_samples)
                    region_audio[:fade_samples] *= fade_in
                
                # フェードアウト
                if fade_samples > 0 and len(region_audio) > fade_samples:
                    fade_out = np.linspace(1, 0, fade_samples)
                    region_audio[-fade_samples:] *= fade_out
                
                masked_harmony[start_sample:end_sample] = region_audio
        
        harmony_audio = masked_harmony
    
    return harmony_audio

def generate_all_harmonies(vocal, sr, vocal_regions=None):
    """
    全ハモリタイプを生成
    プレビュー用
    """
    harmonies = {}
    
    harmony_types = ['up_m3', 'down_m3', 'perfect_5th']
    
    for harmony_type in harmony_types:
        try:
            harmony_audio = generate_harmony(vocal, sr, harmony_type, vocal_regions)
            harmonies[harmony_type] = {
                'audio': harmony_audio,
                'description': {
                    'up_m3': '上3度（明るく華やか）',
                    'down_m3': '下3度（温かく厚み）', 
                    'perfect_5th': '完全5度（透明で広がり）'
                }.get(harmony_type, harmony_type),
                'recommended_for': {
                    'up_m3': ['ポップス', 'アイドル楽曲', '明るいバラード'],
                    'down_m3': ['R&B', 'ソウル', '温かいバラード'],
                    'perfect_5th': ['ゴスペル', 'ロック', '壮大な楽曲']
                }.get(harmony_type, [])
            }
        except Exception as e:
            print(f"Error generating {harmony_type}: {e}")
            harmonies[harmony_type] = {
                'audio': np.zeros_like(vocal),
                'error': str(e)
            }
    
    return harmonies

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--vocal', required=True, help='Vocal audio file')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    parser.add_argument('--harmony-type', choices=['up_m3', 'down_m3', 'perfect_5th', 'all'], 
                       default='all', help='Harmony type to generate')
    parser.add_argument('--detect-regions', action='store_true', 
                       help='Auto-detect vocal regions')
    parser.add_argument('--format', choices=['wav', 'mp3'], default='wav', 
                       help='Output format')
    
    args = parser.parse_args()
    
    # 音声読み込み
    vocal, sr = safe_load(args.vocal)
    
    # ボーカル区間検出
    vocal_regions = None
    if args.detect_regions:
        vocal_regions = detect_vocal_regions(vocal, sr)
        print(f"Detected {len(vocal_regions)} vocal regions")
    
    import os
    os.makedirs(args.output_dir, exist_ok=True)
    
    if args.harmony_type == 'all':
        # 全ハモリ生成
        harmonies = generate_all_harmonies(vocal, sr, vocal_regions)
        
        results = {}
        for harmony_type, harmony_data in harmonies.items():
            if 'audio' in harmony_data:
                # ファイル出力
                output_path = os.path.join(
                    args.output_dir, 
                    f"harmony_{harmony_type}.{args.format}"
                )
                
                if args.format == 'wav':
                    sf.write(output_path, harmony_data['audio'], sr)
                else:
                    # MP3出力は外部エンコーダ使用を想定
                    wav_path = output_path.replace('.mp3', '.wav')
                    sf.write(wav_path, harmony_data['audio'], sr)
                    print(f"WAV saved to {wav_path} (MP3 conversion needed)")
                
                results[harmony_type] = {
                    'file': output_path,
                    'description': harmony_data.get('description', ''),
                    'recommended_for': harmony_data.get('recommended_for', [])
                }
        
        # プレビュー情報出力
        preview_info = {
            'vocal_regions': vocal_regions,
            'harmonies': results,
            'usage_note': 'プレビュー後、1つを選択して適用してください'
        }
        
        with open(os.path.join(args.output_dir, 'harmony_preview.json'), 'w', encoding='utf-8') as f:
            json.dump(preview_info, f, indent=2, ensure_ascii=False)
        
        print(f"All harmonies generated in {args.output_dir}")
        
    else:
        # 単一ハモリ生成
        harmony_audio = generate_harmony(vocal, sr, args.harmony_type, vocal_regions)
        
        output_path = os.path.join(
            args.output_dir, 
            f"harmony_{args.harmony_type}.{args.format}"
        )
        
        if args.format == 'wav':
            sf.write(output_path, harmony_audio, sr)
        else:
            wav_path = output_path.replace('.mp3', '.wav')
            sf.write(wav_path, harmony_audio, sr)
            
        print(f"Harmony generated: {output_path}")

if __name__ == '__main__':
    main()