#!/usr/bin/env python3
"""
Reference Track Analysis Script for MIXAI
Creator専用の参照曲解析機能

Usage:
python reference-analysis.py --input path/to/reference.wav --format json

Dependencies:
pip install librosa numpy scipy soundfile argparse
"""

import argparse
import json
import sys
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path
from scipy import signal
from scipy.stats import pearsonr

def load_audio(file_path, sr=44100, duration=60):
    """
    音声ファイルを読み込む（最初の60秒）
    """
    try:
        y, sr = librosa.load(file_path, sr=sr, duration=duration)
        return y, sr
    except Exception as e:
        raise Exception(f"Audio loading failed: {e}")

def analyze_tonal_characteristics(y, sr):
    """
    トーナル特性の解析
    """
    # スペクトラム解析
    D = librosa.stft(y)
    magnitude = np.abs(D)
    freqs = librosa.fft_frequencies(sr=sr)
    
    # 周波数帯域別のエネルギー計算
    low_freq_mask = (freqs >= 80) & (freqs <= 350)    # 低域
    mid_freq_mask = (freqs >= 350) & (freqs <= 4000)  # 中域
    high_freq_mask = (freqs >= 4000) & (freqs <= 16000)  # 高域
    
    low_energy = np.mean(magnitude[low_freq_mask, :])
    mid_energy = np.mean(magnitude[mid_freq_mask, :])
    high_energy = np.mean(magnitude[high_freq_mask, :])
    
    # エネルギーバランスからEQ特性を推定
    total_energy = low_energy + mid_energy + high_energy
    
    if total_energy == 0:
        return {
            'low_shelf': 0.0,
            'mid_boost': 0.0,
            'high_shelf': 0.0
        }
    
    # 相対的なエネルギー比率を計算
    low_ratio = low_energy / total_energy
    mid_ratio = mid_energy / total_energy
    high_ratio = high_energy / total_energy
    
    # 理想的なバランス（参考値）との差分
    ideal_low = 0.3
    ideal_mid = 0.4
    ideal_high = 0.3
    
    low_shelf = (low_ratio - ideal_low) * 10  # -3.0 ~ +3.0 dB 範囲
    mid_boost = (mid_ratio - ideal_mid) * 5   # -2.0 ~ +2.0 dB 範囲
    high_shelf = (high_ratio - ideal_high) * 10  # -3.0 ~ +3.0 dB 範囲
    
    # 範囲クランプ
    low_shelf = np.clip(low_shelf, -3.0, 3.0)
    mid_boost = np.clip(mid_boost, -2.0, 2.0)
    high_shelf = np.clip(high_shelf, -3.0, 3.0)
    
    return {
        'low_shelf': float(low_shelf),
        'mid_boost': float(mid_boost),
        'high_shelf': float(high_shelf)
    }

def analyze_dynamics(y, sr):
    """
    ダイナミクス特性の解析
    """
    # RMS計算（フレーム単位）
    frame_length = int(sr * 0.025)  # 25ms
    hop_length = int(sr * 0.010)    # 10ms
    
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    
    # Crest Factor計算
    peak_amplitude = np.max(np.abs(y))
    rms_avg = np.sqrt(np.mean(y**2))
    
    if rms_avg == 0:
        crest_factor = 20.0  # デフォルト値
    else:
        crest_factor = 20 * np.log10(peak_amplitude / rms_avg)
    
    # Peak-to-Loudness Ratio (PLR)
    # LUFS推定（簡易版）
    lufs_estimate = -23 + 20 * np.log10(rms_avg + 1e-10)
    true_peak_db = 20 * np.log10(peak_amplitude + 1e-10)
    plr = true_peak_db - lufs_estimate
    
    return {
        'crest_factor': float(np.clip(crest_factor, 0, 25)),
        'plr': float(np.clip(plr, 0, 25)),
        'rms_variation': float(np.std(rms))
    }

def analyze_stereo_characteristics(y, sr):
    """
    ステレオ特性の解析
    """
    if len(y.shape) < 2:
        # モノラル音源の場合
        return {
            'width': 0.0,
            'correlation': 1.0,
            'balance': 0.0
        }
    
    # ステレオの場合
    left = y[0, :] if len(y.shape) == 2 else y
    right = y[1, :] if len(y.shape) == 2 else y
    
    # ステレオ幅計算（Mid/Side解析）
    mid = (left + right) / 2
    side = (left - right) / 2
    
    mid_energy = np.mean(mid**2)
    side_energy = np.mean(side**2)
    
    if mid_energy + side_energy == 0:
        width = 0.0
    else:
        width = side_energy / (mid_energy + side_energy)
    
    # チャンネル相関
    if len(left) == len(right) and len(left) > 1:
        correlation, _ = pearsonr(left, right)
        correlation = np.clip(correlation, -1.0, 1.0)
    else:
        correlation = 1.0
    
    # L/Rバランス
    left_energy = np.mean(left**2)
    right_energy = np.mean(right**2)
    
    if left_energy + right_energy == 0:
        balance = 0.0
    else:
        balance = (right_energy - left_energy) / (left_energy + right_energy)
    
    return {
        'width': float(np.clip(width, 0.0, 1.0)),
        'correlation': float(correlation),
        'balance': float(np.clip(balance, -1.0, 1.0))
    }

def calculate_adjustment_weights(tonal, dynamics, stereo):
    """
    調整の重み付け計算
    """
    # トーナル特性の重要度
    tonal_importance = abs(tonal['low_shelf']) + abs(tonal['mid_boost']) + abs(tonal['high_shelf'])
    tonal_weight = min(1.0, tonal_importance / 3.0)
    
    # ダイナミクス特性の重要度
    dynamics_importance = abs(dynamics['crest_factor'] - 12) / 10 + abs(dynamics['plr'] - 15) / 10
    dynamics_weight = min(1.0, dynamics_importance)
    
    # ステレオ特性の重要度
    stereo_importance = abs(stereo['width'] - 0.7) + abs(1 - stereo['correlation'])
    stereo_weight = min(1.0, stereo_importance)
    
    return {
        'tonal': float(tonal_weight),
        'dynamics': float(dynamics_weight),
        'stereo': float(stereo_weight)
    }

def calculate_suggested_adjustments(tonal, dynamics, stereo, weights):
    """
    MIXパラメータの調整提案を計算
    """
    suggestions = {
        'air': 0.0,
        'body': 0.0,
        'punch': 0.0,
        'width': 0.0,
        'vocal': 0.0,
        'clarity': 0.0,
        'presence': 0.0
    }
    
    # トーナル特性に基づく提案
    if tonal['high_shelf'] > 0.5:
        suggestions['air'] = min(1.0, 0.5 + tonal['high_shelf'] * 0.1) * weights['tonal']
    elif tonal['high_shelf'] < -0.5:
        suggestions['air'] = max(0.0, 0.5 + tonal['high_shelf'] * 0.1) * weights['tonal']
    
    if tonal['low_shelf'] > 0.3:
        suggestions['body'] = min(1.0, 0.3 + tonal['low_shelf'] * 0.1) * weights['tonal']
    elif tonal['low_shelf'] < -0.3:
        suggestions['body'] = max(0.0, 0.3 + tonal['low_shelf'] * 0.1) * weights['tonal']
    
    if tonal['mid_boost'] > 0.5:
        suggestions['vocal'] = min(1.0, 0.6 + tonal['mid_boost'] * 0.1) * weights['tonal']
        suggestions['clarity'] = min(1.0, 0.4 + tonal['mid_boost'] * 0.05) * weights['tonal']
    
    # ダイナミクス特性に基づく提案
    if dynamics['crest_factor'] > 15:
        suggestions['punch'] = max(0.0, 0.5 - (dynamics['crest_factor'] - 15) * 0.02) * weights['dynamics']
    elif dynamics['crest_factor'] < 8:
        suggestions['punch'] = min(1.0, 0.5 + (8 - dynamics['crest_factor']) * 0.03) * weights['dynamics']
    
    # ステレオ特性に基づく提案
    if stereo['width'] > 0.8:
        suggestions['width'] = min(1.0, 0.2 + (stereo['width'] - 0.8) * 0.5) * weights['stereo']
    elif stereo['width'] < 0.5:
        suggestions['width'] = max(0.0, 0.2 - (0.5 - stereo['width']) * 0.4) * weights['stereo']
    
    # Presence（倍音強調）の提案
    if tonal['high_shelf'] > 1.0 and dynamics['crest_factor'] > 12:
        suggestions['presence'] = min(0.3, tonal['high_shelf'] * 0.1) * weights['tonal']
    
    return suggestions

def analyze_reference_track(file_path):
    """
    参照曲の統合解析
    """
    try:
        # 音声読み込み
        y, sr = load_audio(file_path)
        
        # 各特性を解析
        tonal = analyze_tonal_characteristics(y, sr)
        dynamics = analyze_dynamics(y, sr)
        stereo = analyze_stereo_characteristics(y, sr)
        
        # 重み付け計算
        weights = calculate_adjustment_weights(tonal, dynamics, stereo)
        
        # 調整提案計算
        suggest_diff = calculate_suggested_adjustments(tonal, dynamics, stereo, weights)
        
        return {
            'tonal': tonal,
            'dynamics': dynamics,
            'stereo': stereo,
            'weights': weights,
            'suggest_diff': suggest_diff,
            'analyzed_at': None  # フロントエンドで設定
        }
        
    except Exception as e:
        raise Exception(f"Reference analysis failed: {e}")

def main():
    parser = argparse.ArgumentParser(description='MIXAI Reference Track Analysis')
    parser.add_argument('--input', required=True, help='Input audio file path')
    parser.add_argument('--format', default='json', choices=['json'], help='Output format')
    parser.add_argument('--output', help='Output file path (default: stdout)')
    
    args = parser.parse_args()
    
    try:
        # 入力ファイル検証
        input_path = Path(args.input)
        if not input_path.exists():
            raise Exception(f"Input file not found: {args.input}")
        
        # 解析実行
        result = analyze_reference_track(args.input)
        
        # 結果出力
        if args.format == 'json':
            output_data = json.dumps(result, indent=2)
            
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(output_data)
            else:
                print(output_data)
        
        sys.exit(0)
        
    except Exception as e:
        error_data = {
            'error': str(e),
            'success': False
        }
        
        print(json.dumps(error_data), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()