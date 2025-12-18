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
    firstTxDate: string | null;
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
    dimensions?: PersonalityResult['dimensions'];  // 包含评分的完整维度数据
  };

  aiContent: {
    description: string;
    roastLine: string;
  };

  klineData?: KLineData;
  baziResult?: BaZiResult;
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
  isProtocolToken?: boolean;  // DeFi protocol token (aToken, cToken, etc.)
  protocolName?: string;      // Protocol name (Aave, Compound, etc.)
}

export interface DeFiProtocol {
  name: string;
  netValue: number;
  assetValue: number;
  debtValue: number;
}

export interface PersonalityDimension {
  key: string;
  label: string;
  emoji: string;
  description: string;
  score: number;  // 0-100 评分，用于雷达图
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
  volume?: number;        // 交易量/活跃度
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
    assetName?: string;    // 显示的资产名称 (e.g. "BTC")
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

// ===== BaZi (八字) Types =====

export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type WuXing = '金' | '木' | '水' | '火' | '土';
export type ShiShen = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印';

// 柱（年月日时）
export interface Pillar {
  gan: TianGan;      // 天干
  zhi: DiZhi;        // 地支
  ganWuXing: WuXing; // 天干五行
  zhiWuXing: WuXing; // 地支五行
  label: string;     // 如 "甲辰"
}

// 四柱八字
export interface BaZiChart {
  year: Pillar;   // 年柱
  month: Pillar;  // 月柱
  day: Pillar;    // 日柱（日主）
  hour: Pillar;   // 时柱
  dayMaster: TianGan; // 日主（日干）
}

// 五行统计
export interface WuXingStats {
  金: number;
  木: number;
  水: number;
  火: number;
  土: number;
  strongest: WuXing;   // 最强五行
  weakest: WuXing;     // 最弱五行
  xiYong: WuXing[];    // 喜用神
}

// 命格分析
export interface MingGeAnalysis {
  pattern: string;        // 命格名称，如"食神生财格"
  description: string;    // 命格描述
  wealthStar: {
    zhengCai: number;     // 正财数量
    pianCai: number;      // 偏财数量
    status: '旺' | '平' | '弱';
  };
  tradingStyle: string;   // 投资风格建议
  luckyElements: WuXing[]; // 幸运五行
}

// 流年运势（2025年）
export interface LiuNianFortune {
  year: number;           // 2025
  ganZhi: string;         // "乙巳"
  analysis: string;       // 流年分析
  recommendation: string; // 投资建议
  luckyMonths: string[];  // 幸运月份
}

// 完整八字命理结果
export interface BaZiResult {
  chart: BaZiChart;
  wuxing: WuXingStats;
  mingge: MingGeAnalysis;
  liuNian: LiuNianFortune;
  tokenWuXing: {
    [symbol: string]: WuXing;
  };
}

