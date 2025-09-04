#!/usr/bin/env python3
"""
高度音声解析 - DTW・ピッチ検出・WORLD再合成対応
CLAUDE.md準拠の音声処理エンジン
"""
import argparse
import json
import numpy as np
import librosa as lb
import soundfile as sf
from scipy import signal
from scipy.spatial.distance import cdist
import warnings
warnings.filterwarnings('ignore')

# 依存関係チェック（オプション）
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
            y = y / np.max(np.abs(y)) * 0.95  # 正規化 + 余裕
        return y, sr
    except Exception as e:
        raise RuntimeError(f"Failed to load {path}: {e}")

def advanced_offset_detection(vocal, inst, sr):
    """
    高精度オフセット検出（±10ms目標）
    相互相関 + onset-based の組み合わせ
    """
    # オンセット強度ベース
    ov = lb.onset.onset_strength(y=vocal, sr=sr, hop_length=256)
    oi = lb.onset.onset_strength(y=inst, sr=sr, hop_length=256)
    
    n = min(len(ov), len(oi))
    if n < 32:
        return 0.0, 0.1
    
    ov, oi = ov[:n], oi[:n]
    
    # 正規化
    ov = (ov - ov.mean()) / (ov.std() + 1e-9)
    oi = (oi - oi.mean()) / (oi.std() + 1e-9)
    
    # 相互相関
    xcorr = np.correlate(ov, oi, mode='full')
    lag_samples = np.argmax(xcorr) - (n - 1)
    
    # サンプルからmsに変換（hop_length=256考慮）
    hop_time_ms = (256 / sr) * 1000
    offset_ms = lag_samples * hop_time_ms
    
    # 信頼度計算（ピーク強度とシャープネス）
    max_corr = np.max(xcorr)
    mean_corr = np.mean(xcorr)
    confidence = min(1.0, max((max_corr - mean_corr) / (np.std(xcorr) + 1e-9), 0.0))
    
    return float(np.clip(offset_ms, -2000, 2000)), float(confidence)

def dtw_tempo_analysis(vocal, inst, sr):
    """
    DTWベース可変テンポ解析
    ボーカル vs 伴奏の時間マップ生成
    """
    # クロマ特徴量で音楽的内容を比較
    chroma_v = lb.feature.chroma_cqt(y=vocal, sr=sr, hop_length=512)
    chroma_i = lb.feature.chroma_cqt(y=inst, sr=sr, hop_length=512)
    
    n = min(chroma_v.shape[1], chroma_i.shape[1])
    if n < 16:
        return [], 0.0, 0.0
    
    chroma_v, chroma_i = chroma_v[:, :n], chroma_i[:, :n]
    
    # コサイン距離行列
    cost_matrix = cdist(chroma_v.T, chroma_i.T, metric='cosine')
    
    # 簡易DTW（メモリ効率重視）
    def simple_dtw(cost):
        m, n = cost.shape
        if m > 500 or n > 500:  # 長すぎる場合は間引き
            step = max(m // 300, n // 300, 1)
            cost = cost[::step, ::step]
            m, n = cost.shape
            
        dtw_matrix = np.full((m, n), np.inf)
        dtw_matrix[0, 0] = cost[0, 0]
        
        for i in range(1, m):
            dtw_matrix[i, 0] = cost[i, 0] + dtw_matrix[i-1, 0]
        for j in range(1, n):
            dtw_matrix[0, j] = cost[0, j] + dtw_matrix[0, j-1]
            
        for i in range(1, m):
            for j in range(1, n):
                dtw_matrix[i, j] = cost[i, j] + min(
                    dtw_matrix[i-1, j],     # 削除
                    dtw_matrix[i, j-1],     # 挿入
                    dtw_matrix[i-1, j-1]    # マッチ
                )
        
        # パス復元（簡易）
        path = []
        i, j = m-1, n-1
        while i > 0 or j > 0:
            path.append((i, j))
            if i == 0:
                j -= 1
            elif j == 0:
                i -= 1
            else:
                moves = [
                    dtw_matrix[i-1, j-1],
                    dtw_matrix[i-1, j],
                    dtw_matrix[i, j-1]
                ]
                move = np.argmin(moves)
                if move == 0:
                    i, j = i-1, j-1
                elif move == 1:
                    i = i-1
                else:
                    j = j-1
        path.reverse()
        return path, dtw_matrix[-1, -1]
    
    try:
        path, dtw_cost = simple_dtw(cost_matrix)
        
        # テンポマップ生成（時間変換係数）
        time_map = []
        for i, (v_idx, i_idx) in enumerate(path):
            vocal_time = v_idx * (512 / sr)
            inst_time = i_idx * (512 / sr)
            ratio = inst_time / (vocal_time + 1e-6)
            time_map.append({
                'vocal_time': float(vocal_time),
                'inst_time': float(inst_time),
                'tempo_ratio': float(np.clip(ratio, 0.7, 1.3))
            })
        
        # 変動度計算
        ratios = [t['tempo_ratio'] for t in time_map]
        tempo_var = float(np.std(ratios)) if len(ratios) > 1 else 0.0
        
        # 改善度推定（低コスト = 良い同期）
        improvement = float(1.0 - min(dtw_cost / (len(path) + 1e-6), 1.0))
        
        return time_map, tempo_var, improvement
        
    except Exception as e:
        print(f"DTW error: {e}")
        return [], 0.0, 0.0

def pitch_analysis_crepe(vocal, sr, plan_code):
    """
    CREPE/pYINベースピッチ分析
    "1音だけ外れ" 検出
    """
    if not HAS_CREPE:
        return pitch_analysis_basic(vocal, sr, plan_code)
    
    try:
        # CREPE pitch tracking
        time, frequency, confidence, _ = crepe.predict(
            vocal, sr, 
            viterbi=True,
            step_size=10  # 10ms step
        )
        
        # 無音・低信頼度区間をフィルタ
        valid_mask = (confidence > 0.7) & (frequency > 80) & (frequency < 800)
        if not np.any(valid_mask):
            return []
        
        valid_f0 = frequency[valid_mask]
        valid_times = time[valid_mask]
        valid_conf = confidence[valid_mask]
        
        # ノート化（簡易）
        notes = []
        current_note = None
        
        for i, (t, f, c) in enumerate(zip(valid_times, valid_f0, valid_conf)):
            midi_note = 12 * np.log2(f / 440) + 69
            rounded_note = round(midi_note)
            cent_error = (midi_note - rounded_note) * 100
            
            if current_note is None or abs(rounded_note - current_note['note']) > 0.5:
                # 新しいノート
                if current_note and current_note['duration'] >= 0.08:  # 80ms以上
                    notes.append(current_note)
                
                current_note = {
                    'start_time': float(t),
                    'note': int(rounded_note),
                    'cent_errors': [cent_error],
                    'confidences': [c],
                    'duration': 0.01,
                    'f0_values': [f]
                }
            else:
                # 継続
                current_note['cent_errors'].append(cent_error)
                current_note['confidences'].append(c)
                current_note['f0_values'].append(f)
                current_note['duration'] = t - current_note['start_time']
        
        if current_note and current_note['duration'] >= 0.08:
            notes.append(current_note)
        
        # "外れ"検出
        correction_candidates = []
        for note in notes:
            avg_error = np.mean(note['cent_errors'])
            avg_conf = np.mean(note['confidences'])
            
            # 閾値：プラン別
            error_threshold = {
                'lite': 45.0,      # 提示のみ
                'standard': 35.0,  # ワンタップ修正
                'creator': 50.0    # 自動修正
            }.get(plan_code, 35.0)
            
            if abs(avg_error) > error_threshold and avg_conf > 0.75:
                correction_candidates.append({
                    'start_time': note['start_time'],
                    'duration': note['duration'],
                    'target_note': note['note'],
                    'current_cent_error': float(avg_error),
                    'confidence': float(avg_conf),
                    'recommended_correction': float(-avg_error),  # 逆方向に補正
                    'plan_action': {
                        'lite': 'suggest',
                        'standard': 'auto_with_confirmation', 
                        'creator': 'auto'
                    }.get(plan_code, 'suggest')
                })
        
        return correction_candidates
        
    except Exception as e:
        print(f"CREPE analysis error: {e}")
        return pitch_analysis_basic(vocal, sr, plan_code)

def pitch_analysis_basic(vocal, sr, plan_code):
    """
    基本的なピッチ分析（CREPE不使用時のフォールバック）
    """
    try:
        # librosa piptrack
        pitches, magnitudes = lb.piptrack(y=vocal, sr=sr, threshold=0.3)
        
        correction_candidates = []
        
        # 簡易処理（実用レベルではないが動作する）
        for t in range(0, pitches.shape[1], 50):  # 間引きサンプリング
            frame_pitches = pitches[:, t]
            frame_mags = magnitudes[:, t]
            
            if np.any(frame_mags > 0.1):
                max_idx = np.argmax(frame_mags)
                f0 = frame_pitches[max_idx]
                
                if 80 < f0 < 800:
                    midi_note = 12 * np.log2(f0 / 440) + 69
                    rounded_note = round(midi_note)
                    cent_error = (midi_note - rounded_note) * 100
                    
                    if abs(cent_error) > 30:
                        correction_candidates.append({
                            'start_time': float(t * 512 / sr),
                            'duration': 0.1,
                            'target_note': int(rounded_note),
                            'current_cent_error': float(cent_error),
                            'confidence': 0.6,
                            'recommended_correction': float(-cent_error * 0.8),
                            'plan_action': 'suggest'
                        })
        
        return correction_candidates[:10]  # 最大10個
        
    except Exception as e:
        print(f"Basic pitch analysis error: {e}")
        return []

def world_pitch_correction(vocal, sr, corrections):
    """
    WORLD vocoder による高品質ピッチ補正
    フォルマント保持
    """
    if not HAS_WORLD:
        return vocal  # WORLD未インストール時はそのまま返す
    
    try:
        # float64に変換（WORLD要求）
        x = vocal.astype(np.float64)
        
        # WORLD分析
        f0, sp, ap = pw.wav2world(x, sr)
        
        # ピッチ補正適用
        corrected_f0 = f0.copy()
        
        for corr in corrections:
            start_frame = int(corr['start_time'] * sr / pw.default_frame_period / 1000)
            duration_frames = int(corr['duration'] * sr / pw.default_frame_period / 1000)
            end_frame = min(start_frame + duration_frames, len(corrected_f0))
            
            if start_frame < len(corrected_f0) and corr['recommended_correction'] != 0:
                cent_shift = corr['recommended_correction']
                pitch_ratio = 2 ** (cent_shift / 1200)
                
                # スムーズな適用（エッジでフェード）
                fade_frames = min(5, duration_frames // 4)
                for i in range(start_frame, end_frame):
                    if corrected_f0[i] > 0:  # 有声区間のみ
                        fade_factor = 1.0
                        if i < start_frame + fade_frames:
                            fade_factor = (i - start_frame) / fade_frames
                        elif i > end_frame - fade_frames:
                            fade_factor = (end_frame - i) / fade_frames
                        
                        corrected_f0[i] *= (1.0 + (pitch_ratio - 1.0) * fade_factor)
        
        # WORLD再合成
        corrected_vocal = pw.synthesize(corrected_f0, sp, ap, sr)
        
        # 元の長さに調整・正規化
        corrected_vocal = corrected_vocal[:len(vocal)]
        if np.max(np.abs(corrected_vocal)) > 0:
            corrected_vocal = corrected_vocal / np.max(np.abs(corrected_vocal)) * 0.95
        
        return corrected_vocal.astype(np.float32)
        
    except Exception as e:
        print(f"WORLD correction error: {e}")
        return vocal

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--vocal', required=True, help='Vocal audio file')
    parser.add_argument('--inst', required=True, help='Instrumental audio file')
    parser.add_argument('--plan', default='standard', choices=['lite', 'standard', 'creator'])
    parser.add_argument('--mode', default='analysis', choices=['analysis', 'pitch_correct'])
    parser.add_argument('--corrections', help='JSON corrections for pitch_correct mode')
    parser.add_argument('--output', help='Output file for pitch_correct mode')
    
    args = parser.parse_args()
    
    # 音声読み込み
    vocal, sr = safe_load(args.vocal)
    inst, _ = safe_load(args.inst, sr)
    
    if args.mode == 'analysis':
        # 高度解析実行
        offset_ms, offset_conf = advanced_offset_detection(vocal, inst, sr)
        time_map, tempo_var, tempo_improvement = dtw_tempo_analysis(vocal, inst, sr)
        pitch_candidates = pitch_analysis_crepe(vocal, sr, args.plan)
        
        result = {
            'offset': {
                'offset_ms': offset_ms,
                'confidence': offset_conf
            },
            'tempo': {
                'time_map': time_map,
                'tempo_variability': tempo_var,
                'improvement_estimate': tempo_improvement,
                'dtw_applicable': len(time_map) > 10 and tempo_improvement > 0.3
            },
            'pitch': {
                'correction_candidates': pitch_candidates,
                'total_candidates': len(pitch_candidates)
            }
        }
        
        print(json.dumps(result, indent=2))
        
    elif args.mode == 'pitch_correct':
        if not args.corrections or not args.output:
            raise ValueError("pitch_correct mode requires --corrections and --output")
        
        corrections = json.loads(args.corrections)
        corrected_vocal = world_pitch_correction(vocal, sr, corrections)
        
        # 出力
        sf.write(args.output, corrected_vocal, sr)
        print(f"Pitch-corrected vocal saved to {args.output}")

if __name__ == '__main__':
    main()