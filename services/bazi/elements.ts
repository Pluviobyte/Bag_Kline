import { BaZiChart, WuXing, WuXingStats, TokenHolding } from '@/lib/types';

/**
 * 统计八字中的五行分布
 */
export function analyzeWuXing(chart: BaZiChart): WuXingStats {
  const stats = {
    金: 0,
    木: 0,
    水: 0,
    火: 0,
    土: 0,
  };

  // 统计四柱的天干地支五行
  [chart.year, chart.month, chart.day, chart.hour].forEach((pillar) => {
    stats[pillar.ganWuXing]++;
    stats[pillar.zhiWuXing]++;
  });

  // 找出最强和最弱的五行
  const wuxingArray: WuXing[] = ['金', '木', '水', '火', '土'];
  let strongest: WuXing = '金';
  let weakest: WuXing = '金';
  let maxCount = stats['金'];
  let minCount = stats['金'];

  wuxingArray.forEach((wx) => {
    if (stats[wx] > maxCount) {
      maxCount = stats[wx];
      strongest = wx;
    }
    if (stats[wx] < minCount) {
      minCount = stats[wx];
      weakest = wx;
    }
  });

  // 推算喜用神（简化版：补弱抑强）
  const xiYong = calculateXiYong(stats, weakest, strongest);

  return {
    ...stats,
    strongest,
    weakest,
    xiYong,
  };
}

/**
 * 计算喜用神（简化算法）
 * 传统命理非常复杂，这里采用简化版本
 */
function calculateXiYong(
  stats: Record<WuXing, number>,
  weakest: WuXing,
  strongest: WuXing
): WuXing[] {
  const result: WuXing[] = [];

  // 如果某个五行为0，则为喜用神
  const wuxingArray: WuXing[] = ['金', '木', '水', '火', '土'];
  const missingElements = wuxingArray.filter((wx) => stats[wx] === 0);

  if (missingElements.length > 0) {
    return missingElements;
  }

  // 如果没有缺失的五行，则补弱克强
  // 补最弱的五行
  result.push(weakest);

  // 添加能生弱五行的
  const shengElement = getShengElement(weakest);
  if (shengElement && !result.includes(shengElement)) {
    result.push(shengElement);
  }

  // 添加能克强五行的
  const keElement = getKeElement(strongest);
  if (keElement && !result.includes(keElement) && result.length < 2) {
    result.push(keElement);
  }

  return result.slice(0, 2);
}

/**
 * 获取能生指定五行的元素
 * 水生木、木生火、火生土、土生金、金生水
 */
function getShengElement(element: WuXing): WuXing | null {
  const shengMap: Record<WuXing, WuXing> = {
    木: '水',
    火: '木',
    土: '火',
    金: '土',
    水: '金',
  };
  return shengMap[element] || null;
}

/**
 * 获取能克指定五行的元素
 * 水克火、火克金、金克木、木克土、土克水
 */
function getKeElement(element: WuXing): WuXing | null {
  const keMap: Record<WuXing, WuXing> = {
    火: '水',
    金: '火',
    木: '金',
    土: '木',
    水: '土',
  };
  return keMap[element] || null;
}

/**
 * 将代币映射到五行
 * 基于代币的特性和分类
 */
export function mapTokenToWuXing(token: TokenHolding): WuXing {
  const symbol = token.symbol.toUpperCase();
  const isMeme = token.isMeme;

  // BTC/ETH/稳定币等主流 → 金（价值存储、稳定）
  if (['BTC', 'WBTC', 'ETH', 'WETH'].includes(symbol)) {
    return '金';
  }

  // 稳定币 → 水（流动性、储备）
  if (['USDT', 'USDC', 'DAI', 'BUSD', 'FDUSD'].includes(symbol)) {
    return '水';
  }

  // MEME币 → 火（热情、投机、炒作）
  if (isMeme || ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'].includes(symbol)) {
    return '火';
  }

  // 公链代币 → 木（生态成长、扩张）
  if (
    ['SOL', 'AVAX', 'MATIC', 'POL', 'ADA', 'DOT', 'ATOM', 'NEAR', 'FTM', 'ALGO'].includes(symbol)
  ) {
    return '木';
  }

  // DeFi/质押类 → 土（稳固收益、积累）
  if (
    ['AAVE', 'UNI', 'SUSHI', 'CRV', 'MKR', 'COMP', 'SNX', 'LINK', 'LDO', 'RPL'].includes(symbol)
  ) {
    return '土';
  }

  // 默认根据代币特征分类
  if (token.percentOfPortfolio > 30) {
    // 重仓代币 → 金（主要财富）
    return '金';
  } else if (token.percentOfPortfolio < 5) {
    // 轻仓代币 → 水（流动性）
    return '水';
  }

  // 其他根据字母首字母简单映射
  const firstChar = symbol.charAt(0);
  const charCode = firstChar.charCodeAt(0);
  const wuxingArray: WuXing[] = ['金', '木', '水', '火', '土'];
  return wuxingArray[charCode % 5];
}

/**
 * 统计持仓的五行分布
 */
export function analyzeHoldingsWuXing(holdings: TokenHolding[]): {
  stats: Record<WuXing, number>;
  tokenMap: Record<string, WuXing>;
  dominantElement: WuXing;
} {
  const stats: Record<WuXing, number> = {
    金: 0,
    木: 0,
    水: 0,
    火: 0,
    土: 0,
  };

  const tokenMap: Record<string, WuXing> = {};

  holdings.forEach((holding) => {
    const wuxing = mapTokenToWuXing(holding);
    tokenMap[holding.symbol] = wuxing;
    // 按价值占比权重累加
    stats[wuxing] += holding.percentOfPortfolio;
  });

  // 找出主导五行
  let dominantElement: WuXing = '金';
  let maxValue = 0;
  (Object.keys(stats) as WuXing[]).forEach((wx) => {
    if (stats[wx] > maxValue) {
      maxValue = stats[wx];
      dominantElement = wx;
    }
  });

  return {
    stats,
    tokenMap,
    dominantElement,
  };
}

/**
 * 五行相生相克关系分析
 */
export function analyzeWuXingHarmony(
  chartWuXing: WuXingStats,
  holdingsElement: WuXing
): {
  harmony: '相生' | '相克' | '比和' | '中性';
  score: number; // 1-100
  description: string;
} {
  const dayMasterElement = '土'; // 简化：这里应该是日主五行，待后续完善

  // 判断持仓主导五行与命盘的关系
  if (holdingsElement === dayMasterElement) {
    return {
      harmony: '比和',
      score: 70,
      description: '持仓五行与命格同属，稳健但缺乏生机',
    };
  }

  // 判断相生关系
  const sheng = getShengElement(dayMasterElement);
  if (holdingsElement === sheng) {
    return {
      harmony: '相生',
      score: 85,
      description: '持仓五行生助命格，投资得力，运势顺畅',
    };
  }

  // 判断被生关系
  const beisheng = getShengElement(holdingsElement);
  if (beisheng === dayMasterElement) {
    return {
      harmony: '相生',
      score: 75,
      description: '命格生助持仓，付出较多但有回报',
    };
  }

  // 判断相克关系
  const ke = getKeElement(dayMasterElement);
  if (holdingsElement === ke) {
    return {
      harmony: '相克',
      score: 45,
      description: '持仓五行克制命格，投资压力较大',
    };
  }

  const beike = getKeElement(holdingsElement);
  if (beike === dayMasterElement) {
    return {
      harmony: '相克',
      score: 60,
      description: '命格克制持仓，掌控感强但需谨慎',
    };
  }

  return {
    harmony: '中性',
    score: 65,
    description: '持仓与命格关系中性，无明显助益或阻碍',
  };
}
