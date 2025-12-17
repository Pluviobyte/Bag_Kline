'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalysisResult } from '@/lib/types';
import { KLineChart } from '@/components/kline-chart';

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
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w-2xl mx-auto space-y-6 py-8">
          <Skeleton className="h-32 bg-gray-700" />
          <Skeleton className="h-24 bg-gray-700" />
          <Skeleton className="h-48 bg-gray-700" />
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/50 border-gray-700 p-8 text-center">
          <p className="text-red-400 mb-4">{error || '未找到分析结果'}</p>
          <Button onClick={handleNewAnalysis} variant="outline">
            返回首页
          </Button>
        </Card>
      </main>
    );
  }

  const pnlColor = result.pnl.totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlSign = result.pnl.totalPnlPercent >= 0 ? '+' : '';

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">分析结果</h1>
          <p className="text-gray-500 text-sm font-mono">
            {result.address.slice(0, 6)}...{result.address.slice(-4)}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            {result.chain.toUpperCase()} · {new Date(result.analyzedAt).toLocaleString()}
          </p>
        </div>

        {/* Main Tags */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              {result.personality.tags.join(' + ')}
            </h2>
            <p className="text-gray-400 leading-relaxed">
              {result.aiContent.description}
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Value */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-sm mb-1">总资产</p>
              <p className="text-2xl font-bold text-cyan-400">
                ${result.portfolio.totalValueUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </CardContent>
          </Card>

          {/* PnL */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-sm mb-1">盈亏</p>
              <p className={`text-2xl font-bold ${pnlColor}`}>
                {pnlSign}{result.pnl.totalPnlPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* K-Line Chart */}
        {result.klineData && (
          <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <span>我的袋子K线</span>
                <span className="text-xs font-normal text-gray-500">运势预测 · 红涨绿跌</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <KLineChart data={result.klineData} height={350} />
            </CardContent>
          </Card>
        )}

        {/* Six Dimensions */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">六维画像</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">交易风格</span>
              <span className="text-white">
                {getDimensionLabel('tradingStyle', result.personality.tradingStyle)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">代币偏好</span>
              <span className="text-white">
                {getDimensionLabel('tokenPreference', result.personality.tokenPreference)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">资金规模</span>
              <span className="text-white">
                {getDimensionLabel('portfolioSize', result.personality.portfolioSize)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">盈亏状态</span>
              <span className="text-white">
                {getDimensionLabel('pnlStatus', result.personality.pnlStatus)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">持仓集中度</span>
              <span className="text-white">
                {getDimensionLabel('concentration', result.personality.concentration)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">钱包年龄</span>
              <span className="text-white">
                {getDimensionLabel('walletAge', result.personality.walletAge)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings */}
        {result.portfolio.holdings.length > 0 && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">主要持仓</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.portfolio.holdings.slice(0, 5).map((holding, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{holding.symbol}</span>
                    {holding.isMeme && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                        Meme
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white">
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
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-xl text-yellow-400 italic">
              "{result.aiContent.roastLine}"
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handleShare}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {copied ? '已复制!' : '分享图片链接'}
          </Button>
          <Button
            onClick={handleNewAnalysis}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            再来一次
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-gray-600 text-xs text-center">
          仅供娱乐，不构成投资建议
        </p>
      </div>
    </main>
  );
}
