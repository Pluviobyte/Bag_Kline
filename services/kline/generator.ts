import { KLineData, KLinePoint, TokenHolding } from '@/lib/types';
import dayjs from 'dayjs';

interface Transaction {
  timestamp: number;
  type: 'buy' | 'sell' | 'transfer';
  valueUsd?: number;
  pnlPercent?: number;
}

interface MonthlyData {
  month: string;
  txCount: number;
  totalValueChange: number;
  pnlPercent: number;
  events: string[];
}

// 特殊事件日期
const CRYPTO_EVENTS: Record<string, string> = {
  '2024-04': 'BTC减半',
  '2024-01': 'ETF通过',
  '2023-10': '牛市启动',
  '2021-11': '历史高点',
  '2022-11': 'FTX暴雷',
  '2020-05': 'BTC减半',
  '2020-03': '312大跌',
};

/**
 * 根据盈亏百分比计算运势分数
 * 映射：-100% -> 10分, 0% -> 50分, +100% -> 90分
 */
function calculateFortuneScore(pnlPercent: number): number {
  // 限制范围 [-200%, +500%]
  const clampedPnl = Math.max(-200, Math.min(500, pnlPercent));

  // 非线性映射，让极端值更突出
  let score: number;
  if (clampedPnl >= 0) {
    // 正收益：50 + (pnl/100) * 40，上限90
    score = 50 + (clampedPnl / 100) * 40;
  } else {
    // 负收益：50 + (pnl/100) * 40，下限10
    score = 50 + (clampedPnl / 100) * 40;
  }

  return Math.max(10, Math.min(95, Math.round(score)));
}

/**
 * 根据分数变化判断标签
 */
function getScoreLabel(score: number, prevScore: number): string | undefined {
  const change = score - prevScore;

  if (score >= 80 && change > 10) return '主升浪';
  if (score >= 70 && change > 5) return '小牛市';
  if (score <= 30 && change < -10) return '至暗时刻';
  if (score <= 40 && change < -5) return '低谷期';
  if (Math.abs(change) <= 3) return '横盘震荡';

  return undefined;
}

/**
 * 生成模拟的月度数据（当没有详细交易记录时）
 */
function generateSimulatedMonthlyData(
  firstTxDate: string,
  currentPnlPercent: number,
  txCount30d: number
): MonthlyData[] {
  const startDate = dayjs(firstTxDate);
  const endDate = dayjs();
  const months: MonthlyData[] = [];

  let currentDate = startDate.startOf('month');
  const totalMonths = endDate.diff(startDate, 'month') + 1;

  // 生成从开始到现在的每月数据
  // 使用随机游走 + 最终收敛到当前PnL
  let runningPnl = 0;
  const targetPnl = currentPnlPercent;
  const monthlyDrift = (targetPnl - runningPnl) / totalMonths;

  let monthIndex = 0;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'month')) {
    const month = currentDate.format('YYYY-MM');
    const isLastMonth = currentDate.isSame(endDate, 'month');

    // 添加随机波动
    const volatility = 15 + Math.random() * 20; // 15-35%波动
    const randomChange = (Math.random() - 0.5) * volatility;

    // 如果是最后一个月，使用实际PnL
    if (isLastMonth) {
      runningPnl = targetPnl;
    } else {
      runningPnl += monthlyDrift + randomChange;
    }

    // 检查是否有重大事件
    const events: string[] = [];
    if (CRYPTO_EVENTS[month]) {
      events.push(CRYPTO_EVENTS[month]);
    }
    if (monthIndex === 0) {
      events.push('首次交易');
    }

    months.push({
      month,
      txCount: monthIndex === totalMonths - 1 ? txCount30d : Math.floor(Math.random() * 20) + 1,
      totalValueChange: runningPnl * 100, // 简化
      pnlPercent: runningPnl,
      events,
    });

    currentDate = currentDate.add(1, 'month');
    monthIndex++;
  }

  return months;
}

/**
 * 生成K线数据点
 */
function generateKLinePoints(monthlyData: MonthlyData[]): KLinePoint[] {
  const points: KLinePoint[] = [];
  let prevScore = 50; // 初始分数

  for (let i = 0; i < monthlyData.length; i++) {
    const data = monthlyData[i];
    const score = calculateFortuneScore(data.pnlPercent);

    // 生成OHLC数据
    // Open: 上一个月的close
    const open = prevScore;
    // Close: 当月最终分数
    const close = score;
    // High/Low: 基于波动范围
    const volatility = Math.abs(score - prevScore) * 0.3 + 5;
    const high = Math.min(95, Math.max(open, close) + Math.random() * volatility);
    const low = Math.max(5, Math.min(open, close) - Math.random() * volatility);

    const label = getScoreLabel(score, prevScore);
    const event = data.events.length > 0 ? data.events[0] : undefined;

    points.push({
      date: data.month,
      score,
      open: Math.round(open),
      close: Math.round(close),
      high: Math.round(high),
      low: Math.round(low),
      type: 'history',
      label,
      event,
      pnlPercent: Math.round(data.pnlPercent * 10) / 10,
      volume: data.txCount,
    });

    prevScore = score;
  }

  return points;
}

/**
 * 计算摘要信息
 */
function calculateSummary(points: KLinePoint[]): KLineData['summary'] {
  if (points.length === 0) {
    return {
      currentScore: 50,
      trend: 'sideways',
      bestPeriod: '-',
      worstPeriod: '-',
    };
  }

  const currentScore = points[points.length - 1].score;

  // 找最佳和最差时期
  let bestPoint = points[0];
  let worstPoint = points[0];

  for (const point of points) {
    if (point.score > bestPoint.score) bestPoint = point;
    if (point.score < worstPoint.score) worstPoint = point;
  }

  // 判断趋势（最近3个月）
  let trend: 'up' | 'down' | 'sideways' = 'sideways';
  if (points.length >= 3) {
    const recent = points.slice(-3);
    const avgChange = (recent[2].score - recent[0].score) / 2;
    if (avgChange > 3) trend = 'up';
    else if (avgChange < -3) trend = 'down';
  }

  return {
    currentScore,
    trend,
    bestPeriod: bestPoint.date,
    worstPeriod: worstPoint.date,
  };
}

/**
 * 主函数：生成K线数据
 */
export function generateKLineData(params: {
  transactions?: Transaction[];
  holdings: TokenHolding[];
  firstTxDate: string;
  totalValueUsd: number;
  currentPnlPercent: number;
  txCount30d: number;
}): KLineData {
  const { firstTxDate, currentPnlPercent, txCount30d } = params;

  // 如果没有详细交易记录，使用模拟数据
  // 实际场景中应该从链上解析详细的月度PnL
  const monthlyData = generateSimulatedMonthlyData(
    firstTxDate,
    currentPnlPercent,
    txCount30d
  );

  // 生成K线数据点
  const historyPoints = generateKLinePoints(monthlyData);

  // 计算摘要
  const summary = calculateSummary(historyPoints);

  return {
    points: historyPoints,
    summary,
  };
}

/**
 * 添加AI预测数据到K线
 */
export function addPredictionToKLine(
  klineData: KLineData,
  predictions: Array<{ date: string; score: number; label?: string }>
): KLineData {
  const lastHistoryPoint = klineData.points[klineData.points.length - 1];
  let prevScore = lastHistoryPoint?.score || 50;

  const predictionPoints: KLinePoint[] = predictions.map((pred) => {
    const open = prevScore;
    const close = pred.score;
    const volatility = Math.abs(pred.score - prevScore) * 0.3 + 5;
    const high = Math.min(95, Math.max(open, close) + volatility * 0.5);
    const low = Math.max(5, Math.min(open, close) - volatility * 0.5);

    prevScore = pred.score;

    return {
      date: pred.date,
      score: pred.score,
      open: Math.round(open),
      close: Math.round(close),
      high: Math.round(high),
      low: Math.round(low),
      type: 'prediction' as const,
      label: pred.label,
    };
  });

  // 找预测中的高点
  const peakPrediction = predictionPoints.reduce((max, p) =>
    p.score > max.score ? p : max, predictionPoints[0]);

  return {
    points: [...klineData.points, ...predictionPoints],
    summary: {
      ...klineData.summary,
      nextPeak: peakPrediction?.date,
    },
  };
}
