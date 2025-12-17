import { TokenHolding, PersonalityDimension, PersonalityResult } from '@/lib/types';
import dayjs from 'dayjs';

// ===== Dimension 1: Trading Style =====
export function getTradingStyle(txCount30d: number): PersonalityDimension {
  if (txCount30d < 5) {
    return {
      key: 'hodler',
      label: 'HODLer',
      emoji: '🏔️',
      description: 'Buy and forget，躺平即正义',
    };
  }
  if (txCount30d <= 30) {
    return {
      key: 'swing',
      label: '波段选手',
      emoji: '🌊',
      description: '高抛低吸，波段为王',
    };
  }
  return {
    key: 'frequent',
    label: '高频玩家',
    emoji: '🎰',
    description: '不交易会死星人',
  };
}

// ===== Dimension 2: Token Preference =====
export function getTokenPreference(holdings: TokenHolding[]): PersonalityDimension {
  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

  if (total === 0) {
    return {
      key: 'diversified',
      label: '多元玩家',
      emoji: '🎨',
      description: '不把鸡蛋放一个篮子',
    };
  }

  const mainstreamSymbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC', 'WETH', 'DAI'];
  const mainstreamValue = holdings
    .filter(h => mainstreamSymbols.includes(h.symbol.toUpperCase()))
    .reduce((sum, h) => sum + h.valueUsd, 0);

  const memeValue = holdings
    .filter(h => h.isMeme)
    .reduce((sum, h) => sum + h.valueUsd, 0);

  if (mainstreamValue / total > 0.7) {
    return {
      key: 'mainstream',
      label: '主流派',
      emoji: '🏛️',
      description: '只买大饼和主流',
    };
  }

  if (memeValue / total > 0.5) {
    return {
      key: 'meme',
      label: '土狗猎人',
      emoji: '🐕',
      description: '百倍土狗，改变命运',
    };
  }

  return {
    key: 'diversified',
    label: '多元玩家',
    emoji: '🎨',
    description: '不把鸡蛋放一个篮子',
  };
}

// ===== Dimension 3: Portfolio Size =====
export function getPortfolioSize(totalValueUsd: number): PersonalityDimension {
  if (totalValueUsd > 100000) {
    return {
      key: 'whale',
      label: '鲸鱼',
      emoji: '🐋',
      description: '一个人就是一个市场',
    };
  }
  if (totalValueUsd > 10000) {
    return {
      key: 'dolphin',
      label: '海豚',
      emoji: '🐬',
      description: '小有资本，稳步前进',
    };
  }
  if (totalValueUsd > 1000) {
    return {
      key: 'fish',
      label: '小鱼',
      emoji: '🐟',
      description: '散户一枚，努力翻身',
    };
  }
  return {
    key: 'shrimp',
    label: '虾米',
    emoji: '🦐',
    description: '本金虽小，梦想很大',
  };
}

// ===== Dimension 4: PnL Status =====
export function getPnlStatus(pnlPercent: number): PersonalityDimension {
  if (pnlPercent > 50) {
    return {
      key: 'winner',
      label: '人生赢家',
      emoji: '👑',
      description: '这就是天选之人吗',
    };
  }
  if (pnlPercent > 10) {
    return {
      key: 'profit',
      label: '小有盈余',
      emoji: '😊',
      description: '至少没亏钱',
    };
  }
  if (pnlPercent > -10) {
    return {
      key: 'breakeven',
      label: '原地踏步',
      emoji: '😐',
      description: '忙活半天，白干',
    };
  }
  if (pnlPercent > -50) {
    return {
      key: 'loss',
      label: '浮亏中',
      emoji: '😰',
      description: '再等等，会涨的',
    };
  }
  return {
    key: 'rekt',
    label: '深度被套',
    emoji: '😭',
    description: '我不是韭菜，我是老韭菜',
  };
}

// ===== Dimension 5: Concentration =====
export function getConcentration(holdings: TokenHolding[]): PersonalityDimension {
  if (holdings.length === 0) {
    return {
      key: 'diversified',
      label: '分散投资',
      emoji: '🎯',
      description: '风险分散，稳中求进',
    };
  }

  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  if (total === 0) {
    return {
      key: 'diversified',
      label: '分散投资',
      emoji: '🎯',
      description: '风险分散，稳中求进',
    };
  }

  const maxHolding = Math.max(...holdings.map(h => h.valueUsd));
  const topPercent = (maxHolding / total) * 100;

  if (topPercent > 80) {
    return {
      key: 'yolo',
      label: '梭哈战士',
      emoji: '🚀',
      description: '要么暴富，要么归零',
    };
  }
  if (topPercent > 50) {
    return {
      key: 'heavy',
      label: '重仓玩家',
      emoji: '💰',
      description: '重仓信仰币',
    };
  }
  return {
    key: 'diversified',
    label: '分散投资',
    emoji: '🎯',
    description: '风险分散，稳中求进',
  };
}

// ===== Dimension 6: Wallet Age =====
export function getWalletAge(firstTxDate: Date): PersonalityDimension {
  const now = dayjs();
  const first = dayjs(firstTxDate);
  const years = now.diff(first, 'year', true);

  if (years > 2) {
    return {
      key: 'og',
      label: 'OG玩家',
      emoji: '🏆',
      description: '币圈老炮，见证历史',
    };
  }
  if (years > 1) {
    return {
      key: 'veteran',
      label: '老韭菜',
      emoji: '🌿',
      description: '经历过牛熊',
    };
  }
  return {
    key: 'newbie',
    label: '新手上路',
    emoji: '🐣',
    description: '萌新报道',
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
