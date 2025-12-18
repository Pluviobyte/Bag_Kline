import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AnalysisFooterProps {
  roastLine: string;
  onShare: () => void;
  onDownload: () => void;
  onNewAnalysis: () => void;
  isCopied: boolean;
  isDownloading: boolean;
  authorAddress: string;
  authorXUrl: string;
}

export function AnalysisFooter({
  roastLine,
  onShare,
  onDownload,
  onNewAnalysis,
  isCopied,
  isDownloading,
  authorAddress,
  authorXUrl,
}: AnalysisFooterProps) {
  const [addressCopied, setAddressCopied] = React.useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(authorAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-8 mt-12 pb-12">
      {/* Roast Line - Featured prominently */}
      <div className="relative">
        <div className="absolute inset-0 bg-yellow-400 blur opacity-20 rounded-xl"></div>
        <Card className="relative bg-yellow-50 border-yellow-200 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <span className="text-4xl block mb-4">🎭</span>
            <p className="text-2xl text-yellow-900 italic font-serif font-medium leading-relaxed">
              "{roastLine}"
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={onShare}
          className="h-14 text-lg bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isCopied ? '✨ 链接已复制' : '🔗 分享结果'}
        </Button>
        <Button
          onClick={onDownload}
          disabled={isDownloading}
          className="h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isDownloading ? '📥 生成中...' : '🖼️ 保存图片'}
        </Button>
        <Button
          onClick={onNewAnalysis}
          variant="outline"
          className="h-14 text-lg border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          🔍 再测一个
        </Button>
      </div>

      {/* Author Support - Clean & Modern */}
      <div className="border-t border-gray-200 pt-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🔥</span>
            <span>维护不易，经费在燃烧，请作者喝杯咖啡</span>
          </h3>

          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 pr-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <span className="text-lg">💎</span>
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="text-xs text-gray-400 font-medium mb-0.5">EVM (ETH/BASE/BNB)</div>
                <code className="text-sm font-mono text-gray-700 block truncate select-all">
                  {authorAddress}
                </code>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyAddress}
                className={addressCopied ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-gray-900"}
              >
                {addressCopied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>

          {/* X Link - Enlarged */}
          <a
            href={authorXUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
              <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
            </svg>
            <span className="text-lg font-semibold">@Pluvio9yte</span>
            <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
          </a>

          <p className="text-xs text-gray-400 mt-4">
            仅供娱乐，不构成投资建议
          </p>
        </div>
      </div>
    </div>
  );
}
