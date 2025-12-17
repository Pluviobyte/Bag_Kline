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
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            我的袋子K线
          </h1>
          <p className="text-xl text-gray-400">
            BagKline
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">
              输入钱包地址
            </CardTitle>
            <CardDescription className="text-gray-400">
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
              className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
            />

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
        <div className="flex justify-center gap-4 text-gray-500 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Solana
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Ethereum
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            BSC
          </span>
        </div>

        {/* Disclaimer */}
        <p className="text-gray-600 text-xs text-center">
          仅供娱乐，不构成投资建议
        </p>
      </div>
    </main>
  );
}
