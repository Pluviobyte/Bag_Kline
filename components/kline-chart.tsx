'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { KLineData } from '@/lib/types';

interface KLineChartProps {
  data: KLineData;
  height?: number;
}

export function KLineChart({ data, height = 400 }: KLineChartProps) {
  const option = useMemo(() => {
    const { points } = data;

    // Split history and prediction points
    const predictionPoints = points.filter((p) => p.type === 'prediction');

    // Prepare data for candlestick chart
    // Format: [open, close, low, high]
    const candlestickData = points.map((p) => [p.open, p.close, p.low, p.high]);
    const dates = points.map((p) => p.date);

    // Find points with events for marking
    const markPointData = points
      .filter((p) => p.event)
      .map((p) => ({
        coord: [p.date, p.high + 5],
        name: p.event,
        value: p.event,
        itemStyle: { color: '#ff9800' },
      }));

    // Build series array
    const series: object[] = [
      {
        name: 'K线',
        type: 'candlestick',
        data: candlestickData,
        itemStyle: {
          color: '#ef4444',
          color0: '#22c55e',
          borderColor: '#ef4444',
          borderColor0: '#22c55e',
        },
        markPoint: {
          data: markPointData,
          symbol: 'pin',
          symbolSize: 40,
          label: {
            show: true,
            fontSize: 10,
            color: '#fff',
          },
        },
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          lineStyle: {
            color: '#666',
            type: 'dashed',
          },
          data: [
            {
              yAxis: 50,
              label: {
                formatter: '中性线',
                color: '#888',
              },
            },
          ],
        },
      },
    ];

    // Add prediction line if there are predictions
    if (predictionPoints.length > 0) {
      series.push({
        name: '预测区间',
        type: 'line',
        data: points.map((p) => (p.type === 'prediction' ? p.score : null)),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: 'rgba(147, 51, 234, 0.8)',
          width: 2,
          type: 'dashed',
        },
        itemStyle: {
          color: '#9333ea',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(147, 51, 234, 0.3)' },
              { offset: 1, color: 'rgba(147, 51, 234, 0)' },
            ],
          },
        },
        connectNulls: false,
      });
    }

    // Add labels for special periods
    const labelData = points
      .filter((p) => p.label)
      .map((p) => ({
        value: [p.date, p.low - 8],
        label: p.label,
      }));

    if (labelData.length > 0) {
      series.push({
        name: '阶段标签',
        type: 'scatter',
        data: labelData,
        symbol: 'rect',
        symbolSize: [40, 16],
        itemStyle: {
          color: 'rgba(59, 130, 246, 0.8)',
        },
        label: {
          show: true,
          formatter: (params: { data: { label: string } }) => params.data.label,
          fontSize: 10,
          color: '#fff',
        },
      });
    }

    return {
      backgroundColor: 'transparent',
      title: {
        text: '我的袋子K线',
        subtext: '运势分 1-100 | 红涨绿跌',
        left: 'center',
        top: 10,
        textStyle: {
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold' as const,
        },
        subtextStyle: {
          color: '#888',
          fontSize: 12,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: {
          color: '#fff',
        },
        formatter: (params: unknown) => {
          const paramArr = params as Array<{ dataIndex: number }>;
          if (!paramArr || paramArr.length === 0) return '';
          const index = paramArr[0].dataIndex;
          const point = points[index];

          const typeLabel = point.type === 'prediction' ? '🔮 预测' : '📊 历史';
          const pnlText =
            point.pnlPercent !== undefined
              ? `<br/>盈亏: ${point.pnlPercent > 0 ? '+' : ''}${point.pnlPercent}%`
              : '';
          const labelText = point.label ? `<br/>阶段: ${point.label}` : '';
          const eventText = point.event ? `<br/>事件: ${point.event}` : '';

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${point.date} ${typeLabel}</div>
              <div>运势分: ${point.score}</div>
              <div>开: ${point.open} | 收: ${point.close}</div>
              <div>高: ${point.high} | 低: ${point.low}</div>
              ${pnlText}${labelText}${eventText}
            </div>
          `;
        },
      },
      legend: {
        data: ['历史', '预测'],
        top: 50,
        textStyle: {
          color: '#888',
        },
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#333',
          },
        },
        axisLabel: {
          color: '#888',
          rotate: 45,
          fontSize: 10,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            color: '#333',
          },
        },
        axisLabel: {
          color: '#888',
          formatter: '{value}分',
        },
        splitLine: {
          lineStyle: {
            color: '#222',
            type: 'dashed',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: Math.max(0, 100 - (12 / points.length) * 100),
          end: 100,
        },
        {
          type: 'slider',
          show: true,
          bottom: '2%',
          height: 20,
          borderColor: '#333',
          backgroundColor: '#111',
          dataBackground: {
            lineStyle: { color: '#333' },
            areaStyle: { color: '#222' },
          },
          selectedDataBackground: {
            lineStyle: { color: '#666' },
            areaStyle: { color: '#333' },
          },
          textStyle: {
            color: '#888',
          },
        },
      ],
      visualMap: {
        show: false,
        seriesIndex: 0,
        dimension: 1,
        pieces: [
          {
            value: 1,
            color: '#ef4444',
          },
          {
            value: -1,
            color: '#22c55e',
          },
        ],
      },
      series,
    };
  }, [data]);

  return (
    <div className="w-full rounded-lg bg-black/50 p-4">
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        theme="dark"
        opts={{ renderer: 'canvas' }}
      />
      {/* Summary below chart */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div className="rounded-lg bg-gray-800/50 p-3 text-center">
          <div className="text-gray-400">当前运势</div>
          <div
            className={`text-2xl font-bold ${
              data.summary.currentScore >= 60
                ? 'text-red-500'
                : data.summary.currentScore <= 40
                ? 'text-green-500'
                : 'text-yellow-500'
            }`}
          >
            {data.summary.currentScore}分
          </div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3 text-center">
          <div className="text-gray-400">趋势</div>
          <div className="text-xl">
            {data.summary.trend === 'up'
              ? '📈 上升'
              : data.summary.trend === 'down'
              ? '📉 下跌'
              : '➡️ 横盘'}
          </div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3 text-center">
          <div className="text-gray-400">最佳时期</div>
          <div className="text-lg text-red-400">{data.summary.bestPeriod}</div>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-3 text-center">
          <div className="text-gray-400">最差时期</div>
          <div className="text-lg text-green-400">{data.summary.worstPeriod}</div>
        </div>
      </div>
      {data.summary.nextPeak && (
        <div className="mt-3 rounded-lg bg-purple-900/30 p-3 text-center">
          <span className="text-purple-400">🔮 预测高点: </span>
          <span className="font-bold text-purple-300">{data.summary.nextPeak}</span>
          {data.summary.advice && (
            <span className="ml-2 text-gray-400">| {data.summary.advice}</span>
          )}
        </div>
      )}
    </div>
  );
}
