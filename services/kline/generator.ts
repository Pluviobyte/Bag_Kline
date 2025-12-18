import { KLineData, KLinePoint, TokenHolding } from '@/lib/types';
import { getTokenOHLC, getTokenInfo } from '../price/coingecko';
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

// Special event dates for simulation fallback
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
 * Calculate score based on PnL percent (for simulation)
 */
function calculateFortuneScore(pnlPercent: number): number {
  const clampedPnl = Math.max(-200, Math.min(500, pnlPercent));
  let score: number;
  if (clampedPnl >= 0) {
    score = 50 + (clampedPnl / 100) * 40;
  } else {
    score = 50 + (clampedPnl / 100) * 40;
  }
  return Math.max(10, Math.min(95, Math.round(score)));
}

/**
 * Get label based on score change
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
 * Generate simulated monthly data (Fallback)
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

  let runningPnl = 0;
  const targetPnl = currentPnlPercent;
  const monthlyDrift = (targetPnl - runningPnl) / totalMonths;

  let monthIndex = 0;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'month')) {
    const month = currentDate.format('YYYY-MM');
    const isLastMonth = currentDate.isSame(endDate, 'month');

    const volatility = 15 + Math.random() * 20;
    const randomChange = (Math.random() - 0.5) * volatility;

    if (isLastMonth) {
      runningPnl = targetPnl;
    } else {
      runningPnl += monthlyDrift + randomChange;
    }

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
      totalValueChange: runningPnl * 100,
      pnlPercent: runningPnl,
      events,
    });

    currentDate = currentDate.add(1, 'month');
    monthIndex++;
  }

  return months;
}

/**
 * Generate K-Line points from simulated data
 */
function generateSimulatedPoints(monthlyData: MonthlyData[]): KLinePoint[] {
  const points: KLinePoint[] = [];
  let prevScore = 50;

  for (let i = 0; i < monthlyData.length; i++) {
    const data = monthlyData[i];
    const score = calculateFortuneScore(data.pnlPercent);

    const open = prevScore;
    const close = score;
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
 * Generate K-Line points from Real OHLC data
 */
function generateRealPoints(ohlc: number[][]): KLinePoint[] {
  if (!ohlc || ohlc.length === 0) return [];

  // Calculate min/max for score normalization
  const prices = ohlc.map(p => p[4]); // close prices
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  return ohlc.map((p, index) => {
    const [timestamp, open, high, low, close] = p;
    const date = dayjs(timestamp).format('YYYY-MM-DD');
    
    // Normalize price to 0-100 for score usage (though we display real price)
    // 10-90 range to avoid extremes
    const score = 10 + ((close - minPrice) / range) * 80;

    let prevScore = 50;
    if (index > 0) {
      const prevClose = ohlc[index - 1][4];
      prevScore = 10 + ((prevClose - minPrice) / range) * 80;
    }

    const label = getScoreLabel(score, prevScore);

    return {
      date,
      score: Math.round(score),
      open,
      close,
      high,
      low,
      type: 'history',
      label,
      volume: 100 // Placeholder or normalize real volume if available
    };
  });
}

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

  let bestPoint = points[0];
  let worstPoint = points[0];

  for (const point of points) {
    if (point.score > bestPoint.score) bestPoint = point;
    if (point.score < worstPoint.score) worstPoint = point;
  }

  let trend: 'up' | 'down' | 'sideways' = 'sideways';
  if (points.length >= 3) {
    const recent = points.slice(-3);
    const change = (recent[2].close - recent[0].close) / recent[0].close;
    if (change > 0.05) trend = 'up';
    else if (change < -0.05) trend = 'down';
  }

  return {
    currentScore,
    trend,
    bestPeriod: bestPoint.date,
    worstPeriod: worstPoint.date,
  };
}

/**
 * Main function: Generate K-Line Data (Async)
 */
export async function generateKLineData(params: {
  transactions?: Transaction[];
  holdings: TokenHolding[];
  firstTxDate: string;
  totalValueUsd: number;
  currentPnlPercent: number;
  txCount30d: number;
}): Promise<KLineData> {
  const { holdings, firstTxDate, currentPnlPercent, txCount30d } = params;

  // 1. Try to get real data for the top holding
  const topHolding = holdings.sort((a, b) => b.valueUsd - a.valueUsd)[0];
  
  if (topHolding && topHolding.symbol) {
    try {
      // Get token ID first
      const tokenInfo = await getTokenInfo(topHolding.symbol);
      if (tokenInfo) {
        // Fetch 90 days of OHLC
        const ohlc = await getTokenOHLC(tokenInfo.id, 90);
        if (ohlc && ohlc.length > 0) {
          const points = generateRealPoints(ohlc);
          return {
            points,
            summary: {
              ...calculateSummary(points),
              assetName: topHolding.symbol,
            },
          };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch real K-line data, falling back to simulation', e);
    }
  }

  // 2. Fallback to simulation
  const monthlyData = generateSimulatedMonthlyData(
    firstTxDate || dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
    currentPnlPercent,
    txCount30d
  );

  const historyPoints = generateSimulatedPoints(monthlyData);

  return {
    points: historyPoints,
    summary: {
      ...calculateSummary(historyPoints),
      assetName: '模拟趋势',
    },
  };
}

/**
 * Add prediction to K-Line (supports both Score and Price scales)
 */
export function addPredictionToKLine(
  klineData: KLineData,
  predictions: Array<{ date: string; score: number; label?: string }>
): KLineData {
  if (klineData.points.length === 0) return klineData;

  const lastPoint = klineData.points[klineData.points.length - 1];
  const lastClose = lastPoint.close;
  
  // Determine if we are using Real Price scale or Score scale
  // If lastClose is > 200, it's likely a real price (unless it's a very high score, but scores are capped at 100 in simulation)
  // Actually, safe heuristic: if it came from generateRealPoints, it's price.
  // We can treat it uniformly: map prediction score (0-100) to % change from last Close.
  
  // Base volatility for prediction
  // 50 score = 0% change. 
  // 100 score = +5% change per step (compounding? or absolute?)
  // Let's do simple relative change from the *previous* point in the prediction chain.
  
  let prevClose = lastClose;
  let prevScore = 50; // Neutral baseline for AI score

  const predictionPoints: KLinePoint[] = predictions.map((pred) => {
    // Calculate % change based on score (50 is neutral)
    // Range: 20 (bearish) -> 80 (bullish)
    // Change: (score - 50) / 10 => -3% to +3% per step
    const percentChange = (pred.score - 50) / 1500; // e.g. 30/1500 = 0.02 = 2%

    const open = prevClose;
    const close = prevClose * (1 + percentChange);
    
    // Volatility for High/Low
    const volatility = close * 0.02; // 2% volatility
    const high = Math.max(open, close) + volatility;
    const low = Math.min(open, close) - volatility;

    prevClose = close;

    return {
      date: pred.date,
      score: pred.score, // Keep the AI score for color coding
      open,
      close,
      high,
      low,
      type: 'prediction' as const,
      label: pred.label,
    };
  });

  // Find peak prediction date
  const peakPrediction = predictionPoints.reduce((max, p) =>
    p.close > max.close ? p : max, predictionPoints[0]);

  return {
    points: [...klineData.points, ...predictionPoints],
    summary: {
      ...klineData.summary,
      nextPeak: peakPrediction?.date,
    },
  };
}
