// プラン料金ページ用の比較表Reactコンポーネント例

import React from 'react';
import { Check, X, Crown, Star, Info } from 'lucide-react';

// 案1: シンプル＆視覚的な実装例
export const SimplePricingTable = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* 料金ヘッダー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-bold mb-2">無料お試し</h3>
          <div className="text-3xl font-bold mb-4">¥0</div>
          <p className="text-sm text-gray-600">プレビューのみ</p>
        </div>
        
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-bold mb-2">Lite</h3>
          <div className="text-3xl font-bold mb-2">¥1,780</div>
          <p className="text-sm text-gray-600 mb-1">月3曲まで</p>
          <p className="text-xs text-green-600 font-semibold">1曲あたり約¥593</p>
        </div>
        
        <div className="border-2 border-blue-500 rounded-lg p-6 hover:shadow-lg transition-shadow relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              人気No.1
            </span>
          </div>
          <h3 className="text-lg font-bold mb-2">Standard</h3>
          <div className="text-3xl font-bold mb-2">¥3,980</div>
          <p className="text-sm text-gray-600 mb-1">月6曲まで</p>
          <p className="text-xs text-green-600 font-semibold">1曲あたり約¥663</p>
        </div>
        
        <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-center mb-2">
            <Crown className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-bold">Creator</h3>
          </div>
          <div className="text-3xl font-bold mb-2">¥7,380</div>
          <p className="text-sm text-gray-600 mb-1">月10曲まで</p>
          <p className="text-xs text-purple-600 font-semibold">プロ仕様・高品質</p>
        </div>
      </div>

      {/* 機能比較表 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2">
              <th className="text-left p-4">機能</th>
              <th className="text-center p-4">無料</th>
              <th className="text-center p-4">Lite</th>
              <th className="text-center p-4 bg-blue-50">Standard</th>
              <th className="text-center p-4 bg-purple-50">Creator</th>
            </tr>
          </thead>
          <tbody>
            {/* 基本機能 */}
            <tr className="border-b">
              <td colSpan={5} className="p-2 bg-gray-50 font-semibold">
                基本機能
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">🎵 楽曲アップロード</td>
              <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4 bg-blue-50/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4 bg-purple-50/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">📊 音質診断・解析</td>
              <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4 bg-blue-50/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4 bg-purple-50/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
            </tr>
            
            {/* MIX・マスタリング */}
            <tr className="border-b">
              <td colSpan={5} className="p-2 bg-gray-50 font-semibold">
                MIX・マスタリング
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">🎚️ フルMIX処理</td>
              <td className="text-center p-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
              <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4 bg-blue-50/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              <td className="text-center p-4 bg-purple-50/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">🎼 ハモリ自動生成</td>
              <td className="text-center p-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
              <td className="text-center p-4">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">無料</span>
              </td>
              <td className="text-center p-4 bg-blue-50/50">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">無料</span>
              </td>
              <td className="text-center p-4 bg-purple-50/50">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">無料</span>
              </td>
            </tr>
            
            {/* 高品質オプション */}
            <tr className="border-b">
              <td colSpan={5} className="p-2 bg-gray-50 font-semibold">
                高品質オプション
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4 flex items-center">
                ✨ HQマスタリング
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  <Info className="w-4 h-4" />
                </button>
              </td>
              <td className="text-center p-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
              <td className="text-center p-4">
                <span className="text-xs text-gray-500">+¥400</span>
              </td>
              <td className="text-center p-4 bg-blue-50/50">
                <span className="text-xs text-gray-500">+¥400</span>
              </td>
              <td className="text-center p-4 bg-purple-50/50">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">無料付帯</span>
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4 flex items-center">
                🔇 強力ノイズ除去
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  <Info className="w-4 h-4" />
                </button>
              </td>
              <td className="text-center p-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
              <td className="text-center p-4">
                <span className="text-xs text-gray-500">+¥400</span>
              </td>
              <td className="text-center p-4 bg-blue-50/50">
                <span className="text-xs text-gray-500">+¥400</span>
              </td>
              <td className="text-center p-4 bg-purple-50/50">
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">無料付帯</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Creatorプランの価値提案 */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
        <h3 className="text-lg font-bold mb-3 flex items-center">
          <Crown className="w-6 h-6 text-purple-600 mr-2" />
          Creator プランの隠れたお得ポイント
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm mb-2">通常オプション料金:</p>
            <ul className="text-sm space-y-1">
              <li>• HQマスタリング: +¥400/曲</li>
              <li>• 強力ノイズ除去: +¥400/曲</li>
            </ul>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">実質¥62お得</p>
              <p className="text-xs text-gray-600">毎曲あたり</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA ボタン */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <button className="py-3 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          無料で試す
        </button>
        <button className="py-3 px-6 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">
          Liteで始める
        </button>
        <button className="py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center">
          <Star className="w-4 h-4 mr-2" />
          Standardで始める
        </button>
        <button className="py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
          Creatorで始める
        </button>
      </div>
    </div>
  );
};

// 案2: ユーザーニーズ別カード表示の実装例
export const NeedBasedPricingCards = () => {
  const plans = [
    {
      emoji: '🎵',
      title: 'まずは試してみたい方',
      planName: '無料プラン',
      price: '¥0',
      features: [
        '楽曲の健康診断',
        '20秒プレビュー作成',
        '基本的な編集機能'
      ],
      buttonText: '無料で始める',
      buttonStyle: 'border'
    },
    {
      emoji: '🎤',
      title: '趣味で歌ってみた投稿する方',
      planName: 'Lite プラン',
      price: '¥1,780',
      badge: 'コスパ最高！',
      features: [
        '月3曲までMIX・マスタリング',
        'ハモリ生成が無料',
        'MP3高音質出力',
        '1曲約¥593'
      ],
      buttonText: 'Liteで始める',
      buttonStyle: 'dark'
    },
    {
      emoji: '🎧',
      title: '定期的に楽曲制作する方',
      planName: 'Standard プラン',
      price: '¥3,980',
      badge: '人気No.1',
      badgeColor: 'blue',
      features: [
        '月6曲までMIX・マスタリング',
        'ジャンル別の最適化',
        '15日間の長期保存',
        '優先処理で待ち時間短縮',
        '1曲約¥663'
      ],
      buttonText: 'Standardで始める',
      buttonStyle: 'primary'
    },
    {
      emoji: '🏆',
      title: 'プロ品質を求める方',
      planName: 'Creator プラン',
      price: '¥7,380',
      badge: '最高品質',
      badgeColor: 'purple',
      features: [
        '月10曲までMIX・マスタリング',
        'HQマスタリング自動適用（+¥400相当）',
        '強力ノイズ除去自動適用（+¥400相当）',
        '参照曲の特性を解析・模倣',
        '最高音質WAV出力（96kHz/24bit）',
        '30日間の長期保存',
        '実質1曲約¥738でプロ仕様'
      ],
      buttonText: 'Creatorで始める',
      buttonStyle: 'gradient'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-center mb-12">
        あなたにぴったりのプランを選ぼう
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, index) => (
          <div key={index} className="border rounded-xl p-6 hover:shadow-xl transition-shadow relative">
            {plan.badge && (
              <div className="absolute -top-3 right-4">
                <span className={`
                  px-3 py-1 rounded-full text-xs font-bold text-white
                  ${plan.badgeColor === 'blue' ? 'bg-blue-500' : 
                    plan.badgeColor === 'purple' ? 'bg-purple-500' : 'bg-green-500'}
                `}>
                  {plan.badge}
                </span>
              </div>
            )}
            
            <div className="text-4xl mb-4">{plan.emoji}</div>
            <p className="text-sm text-gray-600 mb-3">{plan.title}</p>
            <h3 className="text-xl font-bold mb-2">{plan.planName}</h3>
            <div className="text-3xl font-bold mb-4">{plan.price}<span className="text-sm font-normal">/月</span></div>
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="text-sm flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className={`
              w-full py-3 px-4 rounded-lg font-semibold transition
              ${plan.buttonStyle === 'border' ? 'border border-gray-300 hover:bg-gray-50' :
                plan.buttonStyle === 'dark' ? 'bg-gray-800 text-white hover:bg-gray-700' :
                plan.buttonStyle === 'primary' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'}
            `}>
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};