export interface AnalysisResult {
  id: string;
  address: string;
  chain: 'solana' | 'evm';
  analyzedAt: string;

  portfolio: {
    totalValueUsd: number;
    holdings: TokenHolding[];
    topHoldingPercent: number;
  };

  trading: {
    txCount30d: number;
    firstTxDate: string;
  };

  pnl: {
    totalPnlPercent: number;
    totalPnlUsd: number;
  };

  personality: {
    tags: string[];
    tradingStyle: 'hodler' | 'swing' | 'frequent';
    tokenPreference: 'mainstream' | 'meme' | 'diversified';
    portfolioSize: 'whale' | 'dolphin' | 'fish' | 'shrimp';
    pnlStatus: 'winner' | 'profit' | 'breakeven' | 'loss' | 'rekt';
    concentration: 'yolo' | 'heavy' | 'diversified';
    walletAge: 'og' | 'veteran' | 'newbie';
  };

  aiContent: {
    description: string;
    roastLine: string;
  };

  klineData?: KLineData;
}

export interface TokenHolding {
  symbol: string;
  name: string;
  amount: number;
  valueUsd: number;
  percentOfPortfolio: number;
  isMeme: boolean;
  contractAddress?: string;
  mint?: string;
}

export interface PersonalityDimension {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

export interface PersonalityResult {
  tags: string[];
  dimensions: {
    tradingStyle: PersonalityDimension;
    tokenPreference: PersonalityDimension;
    portfolioSize: PersonalityDimension;
    pnlStatus: PersonalityDimension;
    concentration: PersonalityDimension;
    walletAge: PersonalityDimension;
  };
}

export interface RawSolanaHolding {
  mint: string;
  symbol?: string;
  amount: number;
  decimals: number;
}

export interface RawEVMHolding {
  contractAddress: string;
  symbol: string | null;
  name: string | null;
  balance: number;
  decimals: number | null;
}

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  categories: string[];
  isMeme: boolean;
}

export type ChainType = 'solana' | 'evm' | 'unknown';

// ===== K-Line Types =====

export interface KLinePoint {
  date: string;           // 年月 "2024-01"
  score: number;          // 运势分 1-100
  open: number;           // 开盘分数（用于K线绘制）
  close: number;          // 收盘分数
  high: number;           // 最高分
  low: number;            // 最低分
  type: 'history' | 'prediction';
  label?: string;         // "主升浪"、"低谷期"
  event?: string;         // "首次买入"、"BTC减半"
  pnlPercent?: number;    // 当时盈亏%
}

export interface KLineData {
  points: KLinePoint[];
  summary: {
    currentScore: number;
    trend: 'up' | 'down' | 'sideways';
    bestPeriod: string;
    worstPeriod: string;
    nextPeak?: string;     // 预测下一个高点
    advice?: string;       // AI建议
  };
}

export interface KLinePrediction {
  predictions: Array<{
    date: string;
    score: number;
    label?: string;
  }>;
  peakMonth: string;
  advice: string;
}

