'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisResult } from '@/lib/types';

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!address.trim()) {
      setError('请输入钱包地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '分析失败');
      }

      // Store result in localStorage for the result page
      const result = data as AnalysisResult;
      localStorage.setItem(`analysis_${result.id}`, JSON.stringify(result));

      // Navigate to result page
      router.push(`/analyze/${result.id}`);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAnalyze();
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">
            袋子K线
          </h1>
          <p className="text-lg text-gray-600 font-medium mb-4">
            看看你的袋子有多绿
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>🎭 你是什么币圈物种？鲸鱼、海豚还是虾米？</p>
            <p>📉 你的运势K线，下一个主升浪什么时候来？</p>
            <p>🀄 链上八字命盘，2026流年运势抢先看</p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-white border-gray-200 shadow-xl rounded-lg backdrop-blur-md">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 text-2xl font-bold">
              输入钱包地址
            </CardTitle>
            <CardDescription className="text-gray-500 text-base">
              基于链上数据分析你的持仓画像
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="输入 Solana 或 EVM 钱包地址"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="bg-gray-100 border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
            />

            {error && (
              <p className="text-red-600 text-sm text-center font-medium">{error}</p>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  分析中...
                </span>
              ) : (
                '开始分析'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Supported Chains */}
        <div className="flex justify-center gap-4 text-gray-500 text-sm font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Solana
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Ethereum
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            BSC
          </span>
        </div>

        {/* Disclaimer */}
        <div className="text-center space-y-1">
          <p className="text-gray-500 text-xs">
            仅限链上钱包，CEX用户请先提到链上再来算命
          </p>
          <p className="text-gray-400 text-xs">
            纯属娱乐，DYOR
          </p>
        </div>
      </div>
    </main>
  );
}
