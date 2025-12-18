'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { KLineData } from '@/lib/types';
import * as echarts from 'echarts';

interface KLineChartProps {
  data: KLineData;
  height?: number;
}

// Helper to calculate Moving Averages
function calculateMA(dayCount: number, data: Array<{ close: number }>) {
  const result = [];
  for (let i = 0, len = data.length; i < len; i++) {
    if (i < dayCount - 1) {
      result.push('-');
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      sum += data[i - j].close;
    }
    result.push(parseFloat((sum / dayCount).toFixed(2)));
  }
  return result;
}

export function KLineChart({ data, height = 550 }: KLineChartProps) {
  const option = useMemo(() => {
    const { points } = data;

    // Filter out predictions for the main calculation context if needed, 
    // but typically we might want to show history + prediction in sequence.
    // The current data structure mixes them but marks type='prediction'.
    // We will treat them all as points to plot, maybe distinguishing visual style for prediction.
    
    // For a strict "Trading Chart" look, we usually just plot the data available.
    // If predictions are future data, they append to the right.
    
    const dates = points.map((p) => p.date);
    // [open, close, low, high]
    const values = points.map((p) => [p.open, p.close, p.low, p.high]);
    const volumes = points.map((p, index) => [index, p.volume || 0, p.close > p.open ? 1 : -1]);

    const dataMA5 = calculateMA(5, points);
    const dataMA10 = calculateMA(10, points);
    const dataMA30 = calculateMA(30, points);

    // Prediction boundary index
    const predictionStartIndex = points.findIndex(p => p.type === 'prediction');

    return {
      backgroundColor: '#fff',
      animation: false,
      title: {
        text: '我的袋子K线',
        left: 10,
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      legend: {
        bottom: 10,
        left: 'center',
        data: ['K线', 'MA5', 'MA10', 'MA30']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: {
          color: '#000'
        },
        position: function (pos: number[], params: any, el: any, elRect: any, size: any) {
          const obj: Record<string, number> = { top: 10 };
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
          return obj;
        }
        // formatter is auto-handled well by ECharts for candlesticks + lines usually, 
        // but we can customize if needed. Default is usually fine for "Trading View" style.
      },
      axisPointer: {
        link: [
          {
            xAxisIndex: 'all'
          }
        ],
        label: {
          backgroundColor: '#777'
        }
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: false
          },
          brush: {
            type: ['lineX', 'clear']
          }
        }
      },
      brush: {
        xAxisIndex: 'all',
        brushLink: 'all',
        outOfBrush: {
          colorAlpha: 0.1
        }
      },
      visualMap: {
        show: false,
        seriesIndex: 4, // Volume series
        dimension: 2,
        pieces: [
          {
            value: 1,
            color: '#22c55e' // Up: Green
          },
          {
            value: -1,
            color: '#ef4444' // Down: Red
          }
        ]
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          height: '50%'
        },
        {
          left: '10%',
          right: '8%',
          top: '63%',
          height: '16%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax',
          axisPointer: {
            z: 100
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: Math.max(0, 100 - (24 / points.length) * 100), // Zoom to last ~24 points
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '85%',
          start: Math.max(0, 100 - (24 / points.length) * 100),
          end: 100
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: '#22c55e',
            color0: '#ef4444',
            borderColor: '#22c55e',
            borderColor0: '#ef4444'
          },
          markPoint: {
            label: {
              formatter: function (param: any) {
                return param != null ? Math.round(param.value) + '' : '';
              }
            },
            data: [
              {
                name: 'highest value',
                type: 'max',
                valueDim: 'highest'
              },
              {
                name: 'lowest value',
                type: 'min',
                valueDim: 'lowest'
              },
              {
                name: 'average value',
                type: 'average',
                valueDim: 'close'
              }
            ],
            tooltip: {
              formatter: function (param: any) {
                return param.name + '<br>' + (param.data.coord || '');
              }
            }
          },
          markLine: {
            symbol: ['none', 'none'],
            data: [
              [
                {
                  name: 'from lowest to highest',
                  type: 'min',
                  valueDim: 'lowest',
                  symbol: 'circle',
                  symbolSize: 10,
                  label: {
                    show: false
                  },
                  emphasis: {
                    label: {
                      show: false
                    }
                  }
                },
                {
                  type: 'max',
                  valueDim: 'highest',
                  symbol: 'circle',
                  symbolSize: 10,
                  label: {
                    show: false
                  },
                  emphasis: {
                    label: {
                      show: false
                    }
                  }
                }
              ],
              {
                name: 'min line',
                type: 'min',
                valueDim: 'lowest'
              },
              {
                name: 'max line',
                type: 'max',
                valueDim: 'highest'
              }
            ]
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: dataMA5,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: dataMA10,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA30',
          type: 'line',
          data: dataMA30,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes
        },
        // Overlay prediction area if present
        ...(predictionStartIndex > -1 ? [{
            name: '预测',
            type: 'line',
            data: points.map((p, i) => i >= predictionStartIndex ? p.close : null),
            lineStyle: { type: 'dashed', color: '#9333ea' },
            itemStyle: { color: '#9333ea' },
            symbol: 'none'
        }] : [])
      ]
    };
  }, [data]);

  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-sm border border-gray-100">
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
      {/* Summary below chart */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4 border-t pt-4">
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">当前运势</div>
          <div
            className={`text-2xl font-bold ${
              data.summary.currentScore >= 60
                ? 'text-green-500'
                : data.summary.currentScore <= 40
                ? 'text-red-500'
                : 'text-yellow-500'
            }`}
          >
            {data.summary.currentScore}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">趋势</div>
          <div className="text-lg font-medium text-gray-800">
            {data.summary.trend === 'up'
              ? '📈 上升'
              : data.summary.trend === 'down'
              ? '📉 下跌'
              : '➡️ 横盘'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">最佳时期</div>
          <div className="text-base text-green-500 font-medium">{data.summary.bestPeriod}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">最差时期</div>
          <div className="text-base text-red-500 font-medium">{data.summary.worstPeriod}</div>
        </div>
      </div>
      {data.summary.nextPeak && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-md bg-purple-50 p-2 text-sm">
          <span className="text-purple-600">🔮 预测高点:</span>
          <span className="font-bold text-purple-700">{data.summary.nextPeak}</span>
          {data.summary.advice && (
            <span className="text-gray-500 border-l pl-2 border-gray-300">{data.summary.advice}</span>
          )}
        </div>
      )}
    </div>
  );
}