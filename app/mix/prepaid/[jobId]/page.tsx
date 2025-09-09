'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import MixAdjustmentPanel from '@/components/mix/MixAdjustmentPanel';
import PreviewPlayer from '@/components/mix/PreviewPlayer';
import ExportOptions from '@/components/mix/ExportOptions';
import { AlertCircle, Zap, CreditCard, Crown } from 'lucide-react';

export default function PrepaidMixPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const supabase = createClientComponentClient();

  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<'creator' | null>(null);
  const [mixParams, setMixParams] = useState({
    vocalVolume: 0,
    instVolume: 0,
    reverb: 20,
    compression: 30,
    eq: {
      low: 0,
      mid: 0,
      high: 0
    }
  });

  useEffect(() => {
    loadJobData();
    loadUserCredits();
  }, [jobId]);

  const loadJobData = async () => {
    try {
      setLoading(true);
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      if (!job) throw new Error('ジョブが見つかりません');

      setJobData(job);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCredits(profile.credits || 0);
      }
    } catch (err) {
      console.error('Credits load error:', err);
    }
  };

  const handleExport = async (format: string, quality: string) => {
    const requiredCredits = selectedUpgrade === 'creator' ? 1.5 : 1.0;
    
    if (credits < requiredCredits) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      // エクスポート処理
      const response = await fetch('/api/v1/mix/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          format,
          quality,
          upgrade: selectedUpgrade,
        }),
      });

      if (!response.ok) throw new Error('エクスポートに失敗しました');

      const data = await response.json();
      window.location.href = data.downloadUrl;
      
      // クレジット残高を更新
      setCredits(credits - requiredCredits);
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    }
  };

  const handleUpgradeToggle = () => {
    setSelectedUpgrade(selectedUpgrade === 'creator' ? null : 'creator');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* クレジット残高バー */}
      <div className="bg-gray-900 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">
              クレジット残高: {credits.toFixed(1)}C
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/pricing?action=credit')}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              クレジット購入
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              プラン加入
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MIX調整（都度購入）
          </h1>
          <p className="text-gray-600">
            Standard相当の機能でMIXを調整できます
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインパネル */}
          <div className="lg:col-span-2 space-y-6">
            {/* プレビュープレーヤー */}
            <PreviewPlayer
              jobId={jobId}
              audioUrl={jobData?.output_url}
              isProcessing={jobData?.status === 'processing'}
            />

            {/* 調整パネル - Standard相当の6軸調整 */}
            <MixAdjustmentPanel
              params={mixParams}
              onChange={setMixParams}
              disabled={jobData?.status === 'processing'}
              planCode="prepaid"
            />

            {/* Creator機能アップグレードオプション */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Creator機能アップグレード
                    </h4>
                    <p className="text-sm text-gray-600">
                      7軸調整・参照曲解析・超高精度処理（+0.5C）
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpgradeToggle}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedUpgrade === 'creator'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-600'
                  }`}
                >
                  {selectedUpgrade === 'creator' ? '適用中' : '適用する'}
                </button>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* エクスポートオプション */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">エクスポート</h3>
              
              {/* 必要クレジット表示 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">ベース処理</span>
                  <span className="font-medium">1.0C</span>
                </div>
                {selectedUpgrade === 'creator' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Creator機能</span>
                    <span className="font-medium">+0.5C</span>
                  </div>
                )}
                <div className="border-t mt-2 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold">合計</span>
                  <span className="font-bold text-lg">
                    {selectedUpgrade === 'creator' ? '1.5' : '1.0'}C
                  </span>
                </div>
              </div>

              <ExportOptions
                jobId={jobId}
                planCode={selectedUpgrade === 'creator' ? 'creator' : 'prepaid'}
                onExport={handleExport}
                disabled={jobData?.status === 'processing'}
              />
            </div>

            {/* 利用可能な機能 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-3">利用可能な機能</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>6軸調整（Standard相当）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>汎用3種＋ジャンル2種テーマ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>高精度処理</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={selectedUpgrade === 'creator' ? 'text-green-500' : 'text-gray-400'}>
                    {selectedUpgrade === 'creator' ? '✓' : '○'}
                  </span>
                  <span className={selectedUpgrade === 'creator' ? '' : 'text-gray-400'}>
                    7軸調整（+0.5C）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={selectedUpgrade === 'creator' ? 'text-green-500' : 'text-gray-400'}>
                    {selectedUpgrade === 'creator' ? '✓' : '○'}
                  </span>
                  <span className={selectedUpgrade === 'creator' ? '' : 'text-gray-400'}>
                    参照曲解析（+0.5C）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={selectedUpgrade === 'creator' ? 'text-green-500' : 'text-gray-400'}>
                    {selectedUpgrade === 'creator' ? '✓' : '○'}
                  </span>
                  <span className={selectedUpgrade === 'creator' ? '' : 'text-gray-400'}>
                    超高精度処理（+0.5C）
                  </span>
                </li>
              </ul>
            </div>

            {/* プラン加入の勧め */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <Crown className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                プランがお得！
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                月3曲以上なら、プラン加入の方がお得です
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                プランを見る
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* クレジット不足モーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              クレジットが不足しています
            </h3>
            <p className="text-gray-600 mb-2">
              必要クレジット: {selectedUpgrade === 'creator' ? '1.5' : '1.0'}C
            </p>
            <p className="text-gray-600 mb-6">
              現在の残高: {credits.toFixed(1)}C
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/pricing?action=credit')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                クレジットを購入
              </button>
              
              <button
                onClick={() => router.push('/pricing?action=subscribe')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                お得なプランに加入
              </button>
              
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-gray-500 py-2 hover:text-gray-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}