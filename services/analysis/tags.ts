import { TokenHolding, PersonalityDimension, PersonalityResult } from '@/lib/types';
import dayjs from 'dayjs';

// ===== Dimension 1: Trading Style (交易活跃度) =====
export function getTradingStyle(txCount30d: number): PersonalityDimension {
  // Score: 0-100 based on trading frequency
  // 0 tx → 10, 5 tx → 30, 30 tx → 70, 100+ tx → 100
  const score = Math.min(100, Math.max(10, Math.round(10 + (txCount30d / 100) * 90)));

  if (txCount30d < 5) {
    return {
      key: 'hodler',
      label: 'HODLer',
      emoji: '🏔️',
      description: 'Buy and forget，躺平即正义',
      score: Math.min(30, score),
    };
  }
  if (txCount30d <= 30) {
    return {
      key: 'swing',
      label: '波段选手',
      emoji: '🌊',
      description: '高抛低吸，波段为王',
      score: Math.min(70, Math.max(31, score)),
    };
  }
  return {
    key: 'frequent',
    label: '高频玩家',
    emoji: '🎰',
    description: '不交易会死星人',
    score: Math.max(71, score),
  };
}

// ===== Dimension 2: Token Preference (风险偏好) =====
export function getTokenPreference(holdings: TokenHolding[]): PersonalityDimension {
  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

  if (total === 0) {
    return {
      key: 'diversified',
      label: '多元玩家',
      emoji: '🎨',
      description: '不把鸡蛋放一个篮子',
      score: 50,
    };
  }

  const mainstreamSymbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC', 'WETH', 'DAI'];
  const mainstreamValue = holdings
    .filter(h => mainstreamSymbols.includes(h.symbol.toUpperCase()))
    .reduce((sum, h) => sum + h.valueUsd, 0);

  const memeValue = holdings
    .filter(h => h.isMeme)
    .reduce((sum, h) => sum + h.valueUsd, 0);

  const mainstreamRatio = mainstreamValue / total;
  const memeRatio = memeValue / total;

  // Score: mainstream=20-40, diversified=40-60, meme=60-100
  // Higher score = higher risk appetite
  const riskScore = Math.round(20 + memeRatio * 80 - mainstreamRatio * 20);

  if (mainstreamRatio > 0.7) {
    return {
      key: 'mainstream',
      label: '主流派',
      emoji: '🏛️',
      description: '只买大饼和主流',
      score: Math.max(15, Math.min(40, riskScore)),
    };
  }

  if (memeRatio > 0.5) {
    return {
      key: 'meme',
      label: '土狗猎人',
      emoji: '🐕',
      description: '百倍土狗，改变命运',
      score: Math.max(60, Math.min(100, riskScore)),
    };
  }

  return {
    key: 'diversified',
    label: '多元玩家',
    emoji: '🎨',
    description: '不把鸡蛋放一个篮子',
    score: Math.max(35, Math.min(65, riskScore)),
  };
}

// ===== Dimension 3: Portfolio Size (资产规模) =====
export function getPortfolioSize(totalValueUsd: number): PersonalityDimension {
  // Score: logarithmic scale for better distribution
  // $0 → 0, $100 → 20, $1K → 40, $10K → 60, $100K → 80, $1M → 100
  const logScore = totalValueUsd > 0
    ? Math.min(100, Math.max(5, Math.round(Math.log10(totalValueUsd) * 16.67)))
    : 5;

  if (totalValueUsd > 100000) {
    return {
      key: 'whale',
      label: '鲸鱼',
      emoji: '🐋',
      description: '一个人就是一个市场',
      score: Math.max(80, logScore),
    };
  }
  if (totalValueUsd > 10000) {
    return {
      key: 'dolphin',
      label: '海豚',
      emoji: '🐬',
      description: '小有资本，稳步前进',
      score: Math.max(55, Math.min(79, logScore)),
    };
  }
  if (totalValueUsd > 1000) {
    return {
      key: 'fish',
      label: '小鱼',
      emoji: '🐟',
      description: '散户一枚，努力翻身',
      score: Math.max(35, Math.min(54, logScore)),
    };
  }
  return {
    key: 'shrimp',
    label: '虾米',
    emoji: '🦐',
    description: '本金虽小，梦想很大',
    score: Math.min(34, logScore),
  };
}

// ===== Dimension 4: PnL Status (投资收益) =====
export function getPnlStatus(pnlPercent: number): PersonalityDimension {
  // Score: -100% → 0, -50% → 25, 0% → 50, +50% → 75, +100%+ → 100
  const pnlScore = Math.min(100, Math.max(0, Math.round(50 + pnlPercent * 0.5)));

  if (pnlPercent > 50) {
    return {
      key: 'winner',
      label: '人生赢家',
      emoji: '👑',
      description: '这就是天选之人吗',
      score: Math.max(75, pnlScore),
    };
  }
  if (pnlPercent > 10) {
    return {
      key: 'profit',
      label: '小有盈余',
      emoji: '😊',
      description: '至少没亏钱',
      score: Math.max(55, Math.min(74, pnlScore)),
    };
  }
  if (pnlPercent > -10) {
    return {
      key: 'breakeven',
      label: '原地踏步',
      emoji: '😐',
      description: '忙活半天，白干',
      score: Math.max(45, Math.min(54, pnlScore)),
    };
  }
  if (pnlPercent > -50) {
    return {
      key: 'loss',
      label: '浮亏中',
      emoji: '😰',
      description: '再等等，会涨的',
      score: Math.max(25, Math.min(44, pnlScore)),
    };
  }
  return {
    key: 'rekt',
    label: '深度被套',
    emoji: '😭',
    description: '我不是韭菜，我是老韭菜',
    score: Math.min(24, pnlScore),
  };
}

// ===== Dimension 5: Concentration (持仓集中度) =====
export function getConcentration(holdings: TokenHolding[]): PersonalityDimension {
  if (holdings.length === 0) {
    return {
      key: 'diversified',
      label: '分散投资',
      emoji: '🎯',
      description: '风险分散，稳中求进',
      score: 20,
    };
  }

  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  if (total === 0) {
    return {
      key: 'diversified',
      label: '分散投资',
      emoji: '🎯',
      description: '风险分散，稳中求进',
      score: 20,
    };
  }

  const maxHolding = Math.max(...holdings.map(h => h.valueUsd));
  const topPercent = (maxHolding / total) * 100;

  // Score: directly maps to concentration percentage (capped at 100)
  const concentrationScore = Math.min(100, Math.round(topPercent));

  if (topPercent > 80) {
    return {
      key: 'yolo',
      label: '梭哈战士',
      emoji: '🚀',
      description: '要么暴富，要么归零',
      score: Math.max(80, concentrationScore),
    };
  }
  if (topPercent > 50) {
    return {
      key: 'heavy',
      label: '重仓玩家',
      emoji: '💰',
      description: '重仓信仰币',
      score: Math.max(50, Math.min(79, concentrationScore)),
    };
  }
  return {
    key: 'diversified',
    label: '分散投资',
    emoji: '🎯',
    description: '风险分散，稳中求进',
    score: Math.min(49, concentrationScore),
  };
}

// ===== Dimension 6: Wallet Age (钱包年龄) =====
export function getWalletAge(firstTxDate: Date): PersonalityDimension {
  const now = dayjs();
  const first = dayjs(firstTxDate);
  const years = now.diff(first, 'year', true);

  // Score: 0 years → 15, 1 year → 50, 2 years → 70, 5+ years → 100
  const ageScore = Math.min(100, Math.max(15, Math.round(15 + years * 17)));

  if (years > 2) {
    return {
      key: 'og',
      label: 'OG玩家',
      emoji: '🏆',
      description: '币圈老炮，见证历史',
      score: Math.max(70, ageScore),
    };
  }
  if (years > 1) {
    return {
      key: 'veteran',
      label: '老韭菜',
      emoji: '🌿',
      description: '经历过牛熊',
      score: Math.max(45, Math.min(69, ageScore)),
    };
  }
  return {
    key: 'newbie',
    label: '新手上路',
    emoji: '🐣',
    description: '萌新报道',
    score: Math.min(44, ageScore),
  };
}

// ===== Generate Complete Personality =====
export function generatePersonality(data: {
  txCount30d: number;
  holdings: TokenHolding[];
  totalValueUsd: number;
  pnlPercent: number;
  firstTxDate: Date;
}): PersonalityResult {
  const tradingStyle = getTradingStyle(data.txCount30d);
  const tokenPreference = getTokenPreference(data.holdings);
  const portfolioSize = getPortfolioSize(data.totalValueUsd);
  const pnlStatus = getPnlStatus(data.pnlPercent);
  const concentration = getConcentration(data.holdings);
  const walletAge = getWalletAge(data.firstTxDate);

  // Main tags: Pick 3 most distinctive ones
  const tags = [
    `${tokenPreference.label} ${tokenPreference.emoji}`,
    `${tradingStyle.label} ${tradingStyle.emoji}`,
    `${portfolioSize.label} ${portfolioSize.emoji}`,
  ];

  return {
    tags,
    dimensions: {
      tradingStyle,
      tokenPreference,
      portfolioSize,
      pnlStatus,
      concentration,
      walletAge,
    },
  };
}

// ===== Get Tag Display String =====
export function getTagDisplayString(dimension: PersonalityDimension): string {
  return `${dimension.label} ${dimension.emoji}`;
}

// ===== Get All Dimension Labels =====
export function getAllDimensionLabels(personality: PersonalityResult): Record<string, string> {
  return {
    tradingStyle: getTagDisplayString(personality.dimensions.tradingStyle),
    tokenPreference: getTagDisplayString(personality.dimensions.tokenPreference),
    portfolioSize: getTagDisplayString(personality.dimensions.portfolioSize),
    pnlStatus: getTagDisplayString(personality.dimensions.pnlStatus),
    concentration: getTagDisplayString(personality.dimensions.concentration),
    walletAge: getTagDisplayString(personality.dimensions.walletAge),
  };
}
