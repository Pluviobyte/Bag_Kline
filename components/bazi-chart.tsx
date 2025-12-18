'use client';

import React from 'react';
import { BaZiResult, WuXing } from '@/lib/types';

interface BaZiChartProps {
  data: BaZiResult;
}

// 五行颜色映射
const WUXING_COLORS: Record<WuXing, string> = {
  金: 'text-yellow-400',
  木: 'text-green-400',
  水: 'text-blue-400',
  火: 'text-red-400',
  土: 'text-amber-600',
};

// 五行背景色
const WUXING_BG_COLORS: Record<WuXing, string> = {
  金: 'bg-yellow-500/20',
  木: 'bg-green-500/20',
  水: 'bg-blue-500/20',
  火: 'bg-red-500/20',
  土: 'bg-amber-600/20',
};

export function BaZiChart({ data }: BaZiChartProps) {
  const { chart, wuxing, mingge, liuNian } = data;

  // 计算五行最大值用于进度条
  const maxWuXing = Math.max(wuxing.金, wuxing.木, wuxing.水, wuxing.火, wuxing.土);

  return (
    <div className="w-full space-y-4">
      {/* 四柱八字 */}
      <div className="rounded-lg bg-gray-900/50 p-4">
        <h3 className="mb-3 text-center text-lg font-bold text-white">
          钱包命盘 <span className="text-sm font-normal text-gray-400">（基于首次交易时间）</span>
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* 时柱 */}
          <div className="rounded-lg bg-gray-800/50 p-3">
            <div className="text-xs text-gray-500">时柱</div>
            <div className="my-2 text-xl font-bold text-white">{chart.hour.label}</div>
            <div className="flex justify-center gap-1 text-xs">
              <span className={WUXING_COLORS[chart.hour.ganWuXing]}>{chart.hour.ganWuXing}</span>
              <span className={WUXING_COLORS[chart.hour.zhiWuXing]}>{chart.hour.zhiWuXing}</span>
            </div>
          </div>

          {/* 日柱（日主） */}
          <div className="rounded-lg bg-purple-900/30 p-3 ring-2 ring-purple-500/50">
            <div className="text-xs text-gray-500">日柱 ⭐</div>
            <div className="my-2 text-xl font-bold text-purple-300">{chart.day.label}</div>
            <div className="flex justify-center gap-1 text-xs">
              <span className={WUXING_COLORS[chart.day.ganWuXing]}>{chart.day.ganWuXing}</span>
              <span className={WUXING_COLORS[chart.day.zhiWuXing]}>{chart.day.zhiWuXing}</span>
            </div>
            <div className="mt-1 text-xs text-purple-400">日主</div>
          </div>

          {/* 月柱 */}
          <div className="rounded-lg bg-gray-800/50 p-3">
            <div className="text-xs text-gray-500">月柱</div>
            <div className="my-2 text-xl font-bold text-white">{chart.month.label}</div>
            <div className="flex justify-center gap-1 text-xs">
              <span className={WUXING_COLORS[chart.month.ganWuXing]}>{chart.month.ganWuXing}</span>
              <span className={WUXING_COLORS[chart.month.zhiWuXing]}>{chart.month.zhiWuXing}</span>
            </div>
          </div>

          {/* 年柱 */}
          <div className="rounded-lg bg-gray-800/50 p-3">
            <div className="text-xs text-gray-500">年柱</div>
            <div className="my-2 text-xl font-bold text-white">{chart.year.label}</div>
            <div className="flex justify-center gap-1 text-xs">
              <span className={WUXING_COLORS[chart.year.ganWuXing]}>{chart.year.ganWuXing}</span>
              <span className={WUXING_COLORS[chart.year.zhiWuXing]}>{chart.year.zhiWuXing}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 五行分布 */}
      <div className="rounded-lg bg-gray-900/50 p-4">
        <h3 className="mb-3 text-lg font-bold text-white">五行分布</h3>
        <div className="space-y-2">
          {(['金', '木', '水', '火', '土'] as WuXing[]).map((wx) => (
            <div key={wx} className="flex items-center gap-3">
              <div className={`w-12 text-center font-bold ${WUXING_COLORS[wx]}`}>{wx}</div>
              <div className="flex-1">
                <div className="h-6 rounded-full bg-gray-800/50 overflow-hidden">
                  <div
                    className={`h-full ${WUXING_BG_COLORS[wx]} flex items-center justify-end pr-2 transition-all`}
                    style={{ width: `${(wuxing[wx] / maxWuXing) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white">{wuxing[wx]}</span>
                  </div>
                </div>
              </div>
              {wuxing.strongest === wx && (
                <span className="text-xs text-yellow-400">最旺</span>
              )}
              {wuxing.weakest === wx && (
                <span className="text-xs text-gray-500">最弱</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-blue-900/20 p-3 text-center">
          <span className="text-sm text-gray-400">喜用神：</span>
          {wuxing.xiYong.map((wx, i) => (
            <span key={wx} className={`ml-2 font-bold ${WUXING_COLORS[wx]}`}>
              {wx}
              {i < wuxing.xiYong.length - 1 && '、'}
            </span>
          ))}
        </div>
      </div>

      {/* 命格分析 */}
      <div className="rounded-lg bg-gray-900/50 p-4">
        <h3 className="mb-3 text-lg font-bold text-white">命格分析</h3>
        <div className="space-y-3">
          <div className="rounded-lg bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-3 text-center">
            <div className="text-2xl font-bold text-white">{mingge.pattern}</div>
            <div className="mt-1 text-xs text-gray-400">
              财星状态：正财{mingge.wealthStar.zhengCai} 偏财{mingge.wealthStar.pianCai} -{' '}
              <span
                className={
                  mingge.wealthStar.status === '旺'
                    ? 'text-red-400'
                    : mingge.wealthStar.status === '弱'
                    ? 'text-blue-400'
                    : 'text-yellow-400'
                }
              >
                {mingge.wealthStar.status}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800/50 p-3">
            <div className="text-sm leading-relaxed text-gray-300">{mingge.description}</div>
          </div>

          <div className="rounded-lg bg-gray-800/50 p-3">
            <div className="text-xs text-gray-500">投资风格建议</div>
            <div className="mt-1 text-sm leading-relaxed text-gray-300">{mingge.tradingStyle}</div>
          </div>
        </div>
      </div>

      {/* 2025流年运势 */}
      <div className="rounded-lg bg-gradient-to-br from-orange-900/30 to-red-900/30 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
          <span>🔮</span>
          <span>
            {liuNian.year}年流年运势 <span className="text-sm font-normal">({liuNian.ganZhi}年)</span>
          </span>
        </h3>
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-900/40 p-3">
            <div className="text-sm leading-relaxed text-gray-300">{liuNian.analysis}</div>
          </div>

          <div className="rounded-lg bg-yellow-900/20 p-3">
            <div className="text-xs font-bold text-yellow-400">💰 投资建议</div>
            <div className="mt-1 text-sm leading-relaxed text-gray-300">
              {liuNian.recommendation}
            </div>
          </div>

          <div className="rounded-lg bg-purple-900/20 p-3">
            <div className="text-xs font-bold text-purple-400">📅 幸运月份</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {liuNian.luckyMonths.map((month) => (
                <span
                  key={month}
                  className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300"
                >
                  {month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 免责声明 */}
      <div className="text-center text-xs text-gray-600">
        八字命理仅供娱乐参考，投资需谨慎，DYOR
      </div>
    </div>
  );
}
