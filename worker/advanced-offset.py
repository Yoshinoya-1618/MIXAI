#!/usr/bin/env python3
"""
高度なオフセット検出スクリプト
相互相関 + onset-based で ±10ms目標の精度を実現
"""

import sys
import json
import numpy as np
import librosa
import scipy.signal
from scipy.stats import pearsonr
from pathlib import Path
import warnings

warnings.filterwarnings('ignore')

def load_audio_segment(file_path, duration=15.0, sr=22050):
    """
    音声ファイルの最初の部分を読み込み
    Args:
        file_path: 音声ファイルのパス
        duration: 読み込み時間（秒）
        sr: サンプリングレート
    Returns:
        numpy.array: オーディオデータ
    """
    try:
        y, _ = librosa.load(file_path, sr=sr, duration=duration)
        
        # 音量正規化
        if np.max(np.abs(y)) > 0:
            y = y / np.max(np.abs(y))
        
        return y, sr
    except Exception as e:
        raise Exception(f"Failed to load audio {file_path}: {str(e)}")

def extract_onset_strength(y, sr):
    """
    オンセット強度を抽出
    """
    # スペクトログラム計算
    S = np.abs(librosa.stft(y, hop_length=512))
    
    # オンセット強度抽出（複数の手法を組み合わせ）
    onset_strength_spectral = librosa.onset.onset_strength(
        S=S, sr=sr, feature=librosa.feature.spectral_centroid
    )
    
    onset_strength_melspec = librosa.onset.onset_strength(
        y=y, sr=sr, aggregate=np.median
    )
    
    # 2つの手法を重み付き平均
    onset_strength = 0.6 * onset_strength_spectral + 0.4 * onset_strength_melspec
    
    return onset_strength

def cross_correlation_analysis(inst_path, vocal_path):
    """
    クロス相関による高精度オフセット検出
    """
    try:
        # 音声データロード
        inst_y, inst_sr = load_audio_segment(inst_path)
        vocal_y, vocal_sr = load_audio_segment(vocal_path)
        
        if inst_sr != vocal_sr:
            # サンプリングレート統一
            vocal_y = librosa.resample(vocal_y, orig_sr=vocal_sr, target_sr=inst_sr)
            vocal_sr = inst_sr
        
        # オンセット強度抽出
        inst_onset = extract_onset_strength(inst_y, inst_sr)
        vocal_onset = extract_onset_strength(vocal_y, vocal_sr)
        
        # 長さを統一（短い方に合わせる）
        min_length = min(len(inst_onset), len(vocal_onset))
        inst_onset = inst_onset[:min_length]
        vocal_onset = vocal_onset[:min_length]
        
        # クロス相関計算
        correlation = scipy.signal.correlate(inst_onset, vocal_onset, mode='full')
        correlation = correlation / np.max(np.abs(correlation))  # 正規化
        
        # 相関の中心位置を計算
        center = len(correlation) // 2
        
        # 検索範囲を制限（±2秒程度）
        hop_length = 512
        max_offset_samples = int(2.0 * inst_sr / hop_length)  # 2秒分
        search_start = max(0, center - max_offset_samples)
        search_end = min(len(correlation), center + max_offset_samples)
        
        # 検索範囲内で最大相関値を探索
        search_correlation = correlation[search_start:search_end]
        max_corr_idx = np.argmax(search_correlation)
        global_max_idx = search_start + max_corr_idx
        
        # オフセット計算（ミリ秒）
        offset_samples = global_max_idx - center
        offset_ms = int(offset_samples * hop_length * 1000 / inst_sr)
        
        # 信頼度スコア計算
        max_correlation = correlation[global_max_idx]
        mean_correlation = np.mean(np.abs(correlation))
        confidence = max_correlation / (mean_correlation + 1e-8)
        
        # 結果の妥当性チェック
        if abs(offset_ms) > 2000:  # ±2秒を超える場合は無効
            offset_ms = 0
            confidence = 0.0
        
        return {
            'offset_ms': offset_ms,
            'confidence': float(confidence),
            'max_correlation': float(max_correlation),
            'method': 'cross_correlation_onset'
        }
        
    except Exception as e:
        return {
            'offset_ms': 0,
            'confidence': 0.0,
            'error': str(e),
            'method': 'cross_correlation_onset'
        }

def spectral_analysis_method(inst_path, vocal_path):
    """
    スペクトル解析によるオフセット検出（補助手法）
    """
    try:
        # 音声データロード
        inst_y, inst_sr = load_audio_segment(inst_path)
        vocal_y, vocal_sr = load_audio_segment(vocal_path)
        
        if inst_sr != vocal_sr:
            vocal_y = librosa.resample(vocal_y, orig_sr=vocal_sr, target_sr=inst_sr)
        
        # MFCC特徴量抽出
        inst_mfcc = librosa.feature.mfcc(y=inst_y, sr=inst_sr, n_mfcc=13)
        vocal_mfcc = librosa.feature.mfcc(y=vocal_y, sr=vocal_sr, n_mfcc=13)
        
        # 時間軸平均でスペクトル特徴を比較
        inst_spectral = np.mean(inst_mfcc, axis=0)
        vocal_spectral = np.mean(vocal_mfcc, axis=0)
        
        # 長さを統一
        min_length = min(len(inst_spectral), len(vocal_spectral))
        inst_spectral = inst_spectral[:min_length]
        vocal_spectral = vocal_spectral[:min_length]
        
        # クロス相関
        correlation = scipy.signal.correlate(inst_spectral, vocal_spectral, mode='full')
        correlation = correlation / np.max(np.abs(correlation))
        
        center = len(correlation) // 2
        max_corr_idx = np.argmax(correlation)
        
        # オフセット計算
        offset_samples = max_corr_idx - center
        hop_length = 512
        offset_ms = int(offset_samples * hop_length * 1000 / inst_sr)
        
        confidence = correlation[max_corr_idx]
        
        if abs(offset_ms) > 2000:
            offset_ms = 0
            confidence = 0.0
        
        return {
            'offset_ms': offset_ms,
            'confidence': float(confidence),
            'method': 'spectral_mfcc'
        }
        
    except Exception as e:
        return {
            'offset_ms': 0,
            'confidence': 0.0,
            'error': str(e),
            'method': 'spectral_mfcc'
        }

def main():
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: python advanced-offset.py <inst_path> <vocal_path>'}))
        sys.exit(1)
    
    inst_path = sys.argv[1]
    vocal_path = sys.argv[2]
    
    # ファイル存在チェック
    if not Path(inst_path).exists():
        print(json.dumps({'error': f'Instrumental file not found: {inst_path}'}))
        sys.exit(1)
    
    if not Path(vocal_path).exists():
        print(json.dumps({'error': f'Vocal file not found: {vocal_path}'}))
        sys.exit(1)
    
    try:
        # 複数手法で解析
        result1 = cross_correlation_analysis(inst_path, vocal_path)
        result2 = spectral_analysis_method(inst_path, vocal_path)
        
        # 信頼度に基づいて最適な結果を選択
        if result1['confidence'] > result2['confidence']:
            best_result = result1
        else:
            best_result = result2
        
        # 両手法の結果を含める
        output = {
            'best_result': best_result,
            'onset_method': result1,
            'spectral_method': result2,
            'timestamp': librosa.util.__time_to_frames(1, sr=22050)[0]  # メタデータ
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        error_output = {
            'error': f'Analysis failed: {str(e)}',
            'best_result': {'offset_ms': 0, 'confidence': 0.0, 'method': 'fallback'}
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == '__main__':
    main()