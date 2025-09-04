import { MIX_PRESETS, getPresetParams, getPresetsForPlan, applyMicroAdjustments } from '../../worker/presets'
import type { PresetKey, MicroAdjustments } from '../../worker/presets'

describe('worker/presets', () => {
  describe('MIX_PRESETS', () => {
    it('12個のプリセットが定義されている', () => {
      const presetKeys = Object.keys(MIX_PRESETS)
      expect(presetKeys).toHaveLength(12)
    })

    it('各プリセットに必要なパラメータが含まれている', () => {
      Object.values(MIX_PRESETS).forEach(preset => {
        expect(preset.category).toBeDefined()
        expect(preset.displayName).toBeDefined()
        expect(preset.highpass).toBeGreaterThan(0)
        expect(preset.compThreshold).toBeLessThan(0)
        expect(preset.compRatio).toBeGreaterThan(1)
        expect(preset.eq).toBeDefined()
        expect(preset.reverb).toBeDefined()
      })
    })

    it('カテゴリが適切に設定されている', () => {
      const categories = Object.values(MIX_PRESETS).map(p => p.category)
      expect(categories.filter(c => c === 'basic')).toHaveLength(3)
      expect(categories.filter(c => c === 'pop')).toHaveLength(4)
      expect(categories.filter(c => c === 'studio')).toHaveLength(5)
    })
  })

  describe('getPresetParams', () => {
    it('有効なプリセットキーでパラメータを取得', () => {
      const params = getPresetParams('clean_light')
      expect(params).toBeDefined()
      expect(params.category).toBe('basic')
      expect(params.displayName).toBe('Clean Light')
    })

    it('無効なプリセットキーでデフォルトを返す', () => {
      const params = getPresetParams('invalid_key' as PresetKey)
      expect(params).toEqual(MIX_PRESETS.clean_light)
    })
  })

  describe('getPresetsForPlan', () => {
    it('liteプランは3つのプリセット', () => {
      const presets = getPresetsForPlan('lite')
      expect(presets).toHaveLength(3)
      expect(presets.every(p => p.category === 'basic')).toBe(true)
    })

    it('standardプランは7つのプリセット', () => {
      const presets = getPresetsForPlan('standard')
      expect(presets).toHaveLength(7)
      
      const categories = presets.map(p => p.category)
      expect(categories.filter(c => c === 'basic')).toHaveLength(3)
      expect(categories.filter(c => c === 'pop')).toHaveLength(4)
    })

    it('creatorプランは全12プリセット', () => {
      const presets = getPresetsForPlan('creator')
      expect(presets).toHaveLength(12)
      
      const categories = presets.map(p => p.category)
      expect(categories.filter(c => c === 'basic')).toHaveLength(3)
      expect(categories.filter(c => c === 'pop')).toHaveLength(4)
      expect(categories.filter(c => c === 'studio')).toHaveLength(5)
    })

    it('無効なプランはliteプランとして扱う', () => {
      const presets = getPresetsForPlan('invalid' as any)
      expect(presets).toHaveLength(3)
    })
  })

  describe('applyMicroAdjustments', () => {
    it('微調整なしの場合は元のパラメータを返す', () => {
      const basePreset = MIX_PRESETS.clean_light
      const result = applyMicroAdjustments(basePreset, {})
      expect(result).toEqual(basePreset)
    })

    it('フォワードネス調整が適用される', () => {
      const basePreset = MIX_PRESETS.clean_light
      const microAdjust: MicroAdjustments = { forwardness: 20 }
      const result = applyMicroAdjustments(basePreset, microAdjust)
      
      expect(result.eq.highMid).toBe(basePreset.eq.highMid + 0.4) // 20 * 0.02
      expect(result.eq.treble).toBe(basePreset.eq.treble + 0.2) // 20 * 0.01
    })

    it('空間感調整が適用される', () => {
      const basePreset = MIX_PRESETS.clean_light
      const microAdjust: MicroAdjustments = { space: -15 }
      const result = applyMicroAdjustments(basePreset, microAdjust)
      
      expect(result.reverb.roomSize).toBe(Math.max(0, basePreset.reverb.roomSize - 0.15)) // -15 * 0.01
      expect(result.reverb.wetLevel).toBe(Math.max(0, basePreset.reverb.wetLevel - 0.045)) // -15 * 0.003
    })

    it('明るさ調整が適用される', () => {
      const basePreset = MIX_PRESETS.clean_light
      const microAdjust: MicroAdjustments = { brightness: 10 }
      const result = applyMicroAdjustments(basePreset, microAdjust)
      
      expect(result.eq.treble).toBe(basePreset.eq.treble + 0.2) // 10 * 0.02
      expect(result.eq.highMid).toBe(basePreset.eq.highMid + 0.1) // 10 * 0.01
    })

    it('複数の微調整が同時に適用される', () => {
      const basePreset = MIX_PRESETS.clean_light
      const microAdjust: MicroAdjustments = {
        forwardness: 10,
        space: 5,
        brightness: -5
      }
      const result = applyMicroAdjustments(basePreset, microAdjust)
      
      // フォワードネスとブライトネスの影響を受けるtreble
      const expectedTreble = basePreset.eq.treble + (10 * 0.01) + (-5 * 0.02)
      expect(result.eq.treble).toBe(expectedTreble)
    })

    it('範囲外の調整値が制限される', () => {
      const basePreset = MIX_PRESETS.clean_light
      const microAdjust: MicroAdjustments = {
        forwardness: 200, // 範囲外
        space: -200, // 範囲外
        brightness: 200 // 範囲外
      }
      const result = applyMicroAdjustments(basePreset, microAdjust)
      
      // 値が負にならないことを確認
      expect(result.reverb.roomSize).toBeGreaterThanOrEqual(0)
      expect(result.reverb.wetLevel).toBeGreaterThanOrEqual(0)
    })
  })
})