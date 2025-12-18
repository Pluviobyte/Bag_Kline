'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalysisResult } from '@/lib/types';
import { KLineChart } from '@/components/kline-chart';
import { BaZiChart } from '@/components/bazi-chart';
import { RadarChart } from '@/components/radar-chart';

// Dimension label mapping
const dimensionLabels: Record<string, Record<string, string>> = {
  tradingStyle: {
    hodler: 'HODLer 🏔️',
    swing: '波段选手 🌊',
    frequent: '高频玩家 🎰',
  },
  tokenPreference: {
    mainstream: '主流派 🏛️',
    meme: '土狗猎人 🐕',
    diversified: '多元玩家 🎨',
  },
  portfolioSize: {
    whale: '鲸鱼 🐋',
    dolphin: '海豚 🐬',
    fish: '小鱼 🐟',
    shrimp: '虾米 🦐',
  },
  pnlStatus: {
    winner: '人生赢家 👑',
    profit: '小有盈余 😊',
    breakeven: '原地踏步 😐',
    loss: '浮亏中 😰',
    rekt: '深度被套 😭',
  },
  concentration: {
    yolo: '梭哈战士 🚀',
    heavy: '重仓玩家 💰',
    diversified: '分散投资 🎯',
  },
  walletAge: {
    og: 'OG玩家 🏆',
    veteran: '老韭菜 🌿',
    newbie: '新手上路 🐣',
  },
};

function getDimensionLabel(dimension: string, value: string): string {
  return dimensionLabels[dimension]?.[value] || value;
}

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Try to get from localStorage first
    const cached = localStorage.getItem(`analysis_${id}`);
    if (cached) {
      try {
        setResult(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {
        // Invalid cache, fetch from API
      }
    }

    // Fetch from API if not in cache
    fetch(`/api/result/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
          localStorage.setItem(`analysis_${id}`, JSON.stringify(data));
        }
      })
      .catch(() => {
        setError('获取结果失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleShare = async () => {
    if (!result) return;

    const shareUrl = `${window.location.origin}/api/image/${id}?tags=${encodeURIComponent(result.personality.tags.join(' + '))}&pnl=${result.pnl.totalPnlPercent}&roast=${encodeURIComponent(result.aiContent.roastLine)}&value=${result.portfolio.totalValueUsd}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNewAnalysis = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-3xl mx-auto space-y-6 py-8">
          <Skeleton className="h-40 bg-gray-200 rounded-lg" />
          <Skeleton className="h-28 bg-gray-200 rounded-lg" />
          <Skeleton className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="bg-white border-gray-200 shadow-xl rounded-lg p-8 text-center">
          <p className="text-red-600 mb-4 font-medium">{error || '未找到分析结果'}</p>
          <Button onClick={handleNewAnalysis} variant="outline" className="text-gray-800 border-gray-300 hover:bg-gray-100">
            返回首页
          </Button>
        </Card>
      </main>
    );
  }

  const pnlColor = result.pnl.totalPnlPercent >= 0 ? 'text-green-600' : 'text-red-600';
  const pnlSign = result.pnl.totalPnlPercent >= 0 ? '+' : '';

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">分析结果</h1>
          <p className="text-gray-500 font-mono">
            {result.address.slice(0, 6)}...{result.address.slice(-4)}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {result.chain.toUpperCase()} · {new Date(result.analyzedAt).toLocaleString()}
          </p>
        </div>

        {/* Main Tags */}
        <Card className="bg-white border-gray-200 shadow-lg rounded-lg">
          <CardContent className="p-6 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {result.personality.tags.join(' + ')}
            </h2>
            <p className="text-gray-600 leading-relaxed max-w-xl mx-auto">
              {result.aiContent.description}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Value */}
          <Card className="bg-white border-gray-200 shadow-lg rounded-lg">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 text-base mb-1">总资产</p>
              <p className="text-4xl font-bold text-blue-600">
                ${result.portfolio.totalValueUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </CardContent>
          </Card>

          {/* PnL */}
          <Card className="bg-white border-gray-200 shadow-lg rounded-lg">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 text-base mb-1">盈亏</p>
              <p className={`text-4xl font-bold ${pnlColor}`}>
                {pnlSign}{result.pnl.totalPnlPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* K-Line Chart */}
        {result.klineData && (
          <Card className="bg-white border-gray-200 shadow-lg rounded-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-gray-900 text-xl font-bold flex items-center gap-2">
                <span>我的袋子K线</span>
                <span className="text-sm font-normal text-gray-500">运势预测 · 红涨绿跌</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <KLineChart data={result.klineData} height={350} />
            </CardContent>
          </Card>
        )}

        {/* BaZi Chart (八字命盘) */}
        {result.baziResult && (
          <Card className="bg-white border-gray-200 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 text-xl font-bold flex items-center gap-2">
                <span>钱包命理</span>
                <span className="text-sm font-normal text-gray-500">基于首次交易时间排盘</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <BaZiChart data={result.baziResult} />
            </CardContent>
          </Card>
        )}

        {/* Six Dimensions Radar Chart */}
        {result.personality.dimensions && (
          <Card className="bg-white border-gray-200 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 text-xl font-bold flex items-center gap-2">
                <span>六维画像</span>
                <span className="text-sm font-normal text-gray-500">综合评分 · 雷达图</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <RadarChart dimensions={result.personality.dimensions} height={320} />
            </CardContent>
          </Card>
        )}

        {/* Top Holdings */}
        {result.portfolio.holdings.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 text-xl font-bold">主要持仓</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.portfolio.holdings.slice(0, 5).map((holding, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800 text-base">{holding.symbol}</span>
                    {holding.isMeme && (
                      <span className="text-xs bg-yellow-300/50 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                        Meme
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      ${holding.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {holding.percentOfPortfolio.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Roast Line */}
        <Card className="bg-yellow-100 border-yellow-200 shadow-lg rounded-lg">
          <CardContent className="p-6 text-center">
            <p className="text-xl text-yellow-800 italic font-medium">
              "{result.aiContent.roastLine}"
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            onClick={handleShare}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {copied ? '已复制!' : '分享图片链接'}
          </Button>
          <Button
            onClick={handleNewAnalysis}
            variant="outline"
            className="flex-1 border-gray-300 text-gray-800 hover:bg-gray-100 font-semibold py-3 text-lg"
          >
            再来一次
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-gray-400 text-xs text-center pt-4">
          仅供娱乐，不构成投资建议
        </p>
      </div>
    </main>
  );
}
