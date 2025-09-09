'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Volume2, Music, Sparkles, Settings } from 'lucide-react'

interface MixParams {
  vocalVolume: number
  instVolume: number
  reverb: number
  compression: number
  eq: {
    low: number
    mid: number
    high: number
  }
}

interface Props {
  params: MixParams
  onChange: (params: MixParams) => void
  disabled?: boolean
  planCode?: string
}

export default function MixAdjustmentPanel({ 
  params, 
  onChange, 
  disabled = false,
  planCode = 'lite' 
}: Props) {
  const [autoMode, setAutoMode] = useState(true)

  const handleParamChange = (key: string, value: number | any) => {
    if (disabled) return
    
    if (key.startsWith('eq.')) {
      const eqKey = key.split('.')[1]
      onChange({
        ...params,
        eq: {
          ...params.eq,
          [eqKey]: value
        }
      })
    } else {
      onChange({
        ...params,
        [key]: value
      })
    }
  }

  const canAdjust = ['standard', 'creator', 'freetrial'].includes(planCode)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          MIX調整
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 自動調整モード */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium">AI自動調整</span>
          </div>
          <Switch
            checked={autoMode}
            onCheckedChange={setAutoMode}
            disabled={disabled}
          />
        </div>

        {/* ボリューム調整 */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                ボーカル音量
              </label>
              <span className="text-sm text-gray-600">{params.vocalVolume}dB</span>
            </div>
            <Slider
              value={[params.vocalVolume]}
              onValueChange={([v]) => handleParamChange('vocalVolume', v)}
              min={-10}
              max={10}
              step={0.5}
              disabled={disabled || autoMode || !canAdjust}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Music className="w-4 h-4" />
                inst音量
              </label>
              <span className="text-sm text-gray-600">{params.instVolume}dB</span>
            </div>
            <Slider
              value={[params.instVolume]}
              onValueChange={([v]) => handleParamChange('instVolume', v)}
              min={-10}
              max={10}
              step={0.5}
              disabled={disabled || autoMode || !canAdjust}
              className="w-full"
            />
          </div>
        </div>

        {/* エフェクト調整（Standard/Creator限定） */}
        {canAdjust && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700">エフェクト</h3>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm">リバーブ</label>
                <span className="text-sm text-gray-600">{params.reverb}%</span>
              </div>
              <Slider
                value={[params.reverb]}
                onValueChange={([v]) => handleParamChange('reverb', v)}
                min={0}
                max={100}
                step={5}
                disabled={disabled || autoMode}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm">コンプレッション</label>
                <span className="text-sm text-gray-600">{params.compression}%</span>
              </div>
              <Slider
                value={[params.compression]}
                onValueChange={([v]) => handleParamChange('compression', v)}
                min={0}
                max={100}
                step={5}
                disabled={disabled || autoMode}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* EQ調整（Creator限定） */}
        {planCode === 'creator' || planCode === 'freetrial' ? (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700">イコライザー</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-600">低域</label>
                  <span className="text-xs text-gray-600">{params.eq.low}dB</span>
                </div>
                <Slider
                  value={[params.eq.low]}
                  onValueChange={([v]) => handleParamChange('eq.low', v)}
                  min={-12}
                  max={12}
                  step={1}
                  disabled={disabled || autoMode}
                  className="w-full"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-600">中域</label>
                  <span className="text-xs text-gray-600">{params.eq.mid}dB</span>
                </div>
                <Slider
                  value={[params.eq.mid]}
                  onValueChange={([v]) => handleParamChange('eq.mid', v)}
                  min={-12}
                  max={12}
                  step={1}
                  disabled={disabled || autoMode}
                  className="w-full"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-600">高域</label>
                  <span className="text-xs text-gray-600">{params.eq.high}dB</span>
                </div>
                <Slider
                  value={[params.eq.high]}
                  onValueChange={([v]) => handleParamChange('eq.high', v)}
                  min={-12}
                  max={12}
                  step={1}
                  disabled={disabled || autoMode}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ) : null}

        {!canAdjust && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            微調整機能はStandardプラン以上で利用可能です
          </div>
        )}
      </CardContent>
    </Card>
  )
}