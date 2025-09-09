'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import MixAdjustmentPanel from '@/components/mix/MixAdjustmentPanel';
import PreviewPlayer from '@/components/mix/PreviewPlayer';
import ExportOptions from '@/components/mix/ExportOptions';
import { AlertCircle, Crown, Download, CreditCard } from 'lucide-react';

export default function FreeTrialMixPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const supabase = createClientComponentClient();

  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [remainingDays, setRemainingDays] = useState(7);
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
    checkTrialStatus();
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

  const checkTrialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_started_at')
        .eq('id', user.id)
        .single();

      if (profile?.trial_started_at) {
        const trialStart = new Date(profile.trial_started_at);
        const now = new Date();
        const diffTime = 7 * 24 * 60 * 60 * 1000 - (now.getTime() - trialStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setRemainingDays(Math.max(0, diffDays));
      }
    } catch (err) {
      console.error('Trial status check error:', err);
    }
  };

  const handleExport = async (format: string, quality: string) => {
    // 無料トライアル中は実際にエクスポート処理を行う
    console.log(`Exporting with format: ${format}, quality: ${quality}`);
    // TODO: 実際のエクスポート処理を実装
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
      {/* トライアルバナー */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <span className="font-medium">
              無料トライアル期間中（残り{remainingDays}日）- Creator相当の全機能が利用可能
            </span>
          </div>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-white text-purple-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            プランを見る
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MIX調整（無料トライアル）
          </h1>
          <p className="text-gray-600">
            Creator相当の全機能でMIXを調整できます
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

            {/* 調整パネル - Creator相当の7軸調整 */}
            <MixAdjustmentPanel
              params={mixParams}
              onChange={setMixParams}
              disabled={jobData?.status === 'processing'}
              planCode="freetrial"
            />
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* エクスポートオプション */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">エクスポート</h3>
              <ExportOptions
                jobId={jobId}
                planCode="freetrial"
                onExport={handleExport}
                disabled={jobData?.status === 'processing'}
              />
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  ダウンロードにはクレジットまたはプラン加入が必要です
                </p>
              </div>
            </div>

            {/* トライアル特典 */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-semibold mb-3 text-purple-900">
                無料トライアル特典
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>Creator相当の全機能が利用可能</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>7軸調整＋参照曲解析</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>カスタムテーマ機能</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✓</span>
                  <span>無償1クレジット付与</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* アップグレードモーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              ダウンロードするには
            </h3>
            <p className="text-gray-600 mb-6">
              MIXデータのダウンロードには、クレジットの購入またはプランへの加入が必要です。
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/pricing?action=subscribe')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                プランに加入する
              </button>
              
              <button
                onClick={() => router.push('/pricing?action=credit')}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:border-gray-400 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                クレジットを購入する
              </button>
              
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-gray-500 py-2 hover:text-gray-700 transition-colors"
              >
                あとで
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}