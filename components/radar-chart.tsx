'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { PersonalityResult } from '@/lib/types';

interface RadarChartProps {
  dimensions: PersonalityResult['dimensions'];
  height?: number;
}

export function RadarChart({ dimensions, height = 320 }: RadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Prepare radar indicator data (6 axes for hexagon)
    const indicators = [
      { name: '交易活跃', max: 100 },
      { name: '风险偏好', max: 100 },
      { name: '资产规模', max: 100 },
      { name: '投资收益', max: 100 },
      { name: '持仓集中', max: 100 },
      { name: '钱包年龄', max: 100 },
    ];

    // Prepare data values (must match indicator order)
    const values = [
      dimensions.tradingStyle.score,
      dimensions.tokenPreference.score,
      dimensions.portfolioSize.score,
      dimensions.pnlStatus.score,
      dimensions.concentration.score,
      dimensions.walletAge.score,
    ];

    // Prepare labels for tooltip
    const labels = [
      `${dimensions.tradingStyle.label} ${dimensions.tradingStyle.emoji}`,
      `${dimensions.tokenPreference.label} ${dimensions.tokenPreference.emoji}`,
      `${dimensions.portfolioSize.label} ${dimensions.portfolioSize.emoji}`,
      `${dimensions.pnlStatus.label} ${dimensions.pnlStatus.emoji}`,
      `${dimensions.concentration.label} ${dimensions.concentration.emoji}`,
      `${dimensions.walletAge.label} ${dimensions.walletAge.emoji}`,
    ];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { value: number[] };
          if (!p.value) return '';
          return indicators.map((ind, i) =>
            `${ind.name}: ${p.value[i]}分 - ${labels[i]}`
          ).join('<br/>');
        },
      },
      radar: {
        shape: 'polygon', // Hexagon shape
        splitNumber: 4,
        indicator: indicators,
        center: ['50%', '52%'],
        radius: '68%',
        axisName: {
          color: '#4b5563',
          fontSize: 12,
          fontWeight: 500,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(156, 163, 175, 0.3)',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.02)', 'rgba(59, 130, 246, 0.05)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(156, 163, 175, 0.4)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: '#3b82f6',
          },
          areaStyle: {
            color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.4)' },
            ]),
          },
          itemStyle: {
            color: '#3b82f6',
            borderColor: '#fff',
            borderWidth: 2,
          },
          data: [
            {
              value: values,
              name: '六维画像',
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [dimensions]);

  return (
    <div className="w-full">
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />

      {/* Legend showing all dimensions with scores */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 px-2">
        {[
          { name: '交易活跃', dim: dimensions.tradingStyle },
          { name: '风险偏好', dim: dimensions.tokenPreference },
          { name: '资产规模', dim: dimensions.portfolioSize },
          { name: '投资收益', dim: dimensions.pnlStatus },
          { name: '持仓集中', dim: dimensions.concentration },
          { name: '钱包年龄', dim: dimensions.walletAge },
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">{item.name}</span>
              <span className="text-sm font-medium text-gray-800">
                {item.dim.label} {item.dim.emoji}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-blue-600">{item.dim.score}</span>
              <span className="text-xs text-gray-400">分</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
