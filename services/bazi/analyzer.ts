import {
  BaZiChart,
  WuXing,
  WuXingStats,
  MingGeAnalysis,
  LiuNianFortune,
  TianGan,
  TokenHolding,
} from '@/lib/types';
import { get2025LiuNian } from './calculator';

// 天干五行映射
const TIAN_GAN_WU_XING: Record<TianGan, WuXing> = {
  '甲': '木',
  '乙': '木',
  '丙': '火',
  '丁': '火',
  '戊': '土',
  '己': '土',
  '庚': '金',
  '辛': '金',
  '壬': '水',
  '癸': '水',
};

/**
 * 分析命格（简化版）
 * 基于日主五行和八字五行分布判断命格类型
 */
export function analyzeMingGe(
  chart: BaZiChart,
  wuxing: WuXingStats,
  holdings: TokenHolding[]
): MingGeAnalysis {
  const dayMasterWuXing = TIAN_GAN_WU_XING[chart.dayMaster];

  // 统计财星（正财偏财）
  const { zhengCai, pianCai } = countWealthStars(chart, dayMasterWuXing);

  // 判断财星旺衰
  let wealthStatus: '旺' | '平' | '弱' = '平';
  const totalWealth = zhengCai + pianCai;
  if (totalWealth >= 3) wealthStatus = '旺';
  else if (totalWealth <= 1) wealthStatus = '弱';

  // 根据五行分布和财星状况判断命格
  const pattern = determinePattern(dayMasterWuXing, wuxing, zhengCai, pianCai);

  // 生成命格描述
  const description = generatePatternDescription(pattern, wealthStatus, dayMasterWuXing);

  // 投资风格建议
  const tradingStyle = generateTradingStyle(pattern, wealthStatus);

  // 幸运五行
  const luckyElements = wuxing.xiYong;

  return {
    pattern,
    description,
    wealthStar: {
      zhengCai,
      pianCai,
      status: wealthStatus,
    },
    tradingStyle,
    luckyElements,
  };
}

/**
 * 统计财星数量
 * 日主克者为财：日主五行克的五行即为财星
 */
function countWealthStars(chart: BaZiChart, dayMasterWuXing: WuXing): {
  zhengCai: number;
  pianCai: number;
} {
  const caiWuXing = getKeElement(dayMasterWuXing);
  if (!caiWuXing) return { zhengCai: 0, pianCai: 0 };

  let zhengCai = 0;
  let pianCai = 0;

  // 检查四柱中的财星
  [chart.year, chart.month, chart.day, chart.hour].forEach((pillar) => {
    if (pillar.ganWuXing === caiWuXing) {
      // 简化：阴阳同性为偏财，异性为正财
      // 这里简化为：天干为正财，地支为偏财
      zhengCai++;
    }
    if (pillar.zhiWuXing === caiWuXing) {
      pianCai++;
    }
  });

  return { zhengCai, pianCai };
}

/**
 * 获取能克指定五行的元素
 */
function getKeElement(element: WuXing): WuXing | null {
  const keMap: Record<WuXing, WuXing> = {
    火: '金',
    金: '木',
    木: '土',
    土: '水',
    水: '火',
  };
  return keMap[element] || null;
}

/**
 * 判断命格类型
 */
function determinePattern(
  dayMasterWuXing: WuXing,
  wuxing: WuXingStats,
  zhengCai: number,
  pianCai: number
): string {
  const totalWealth = zhengCai + pianCai;

  // 财多身弱格
  if (totalWealth >= 3 && wuxing[dayMasterWuXing] <= 2) {
    return '财多身弱格';
  }

  // 身财两停格（平衡）
  if (totalWealth >= 2 && wuxing[dayMasterWuXing] >= 2) {
    return '身财两停格';
  }

  // 专旺格（某一五行特别旺）
  if (wuxing.strongest === dayMasterWuXing && wuxing[dayMasterWuXing] >= 4) {
    return '从强格';
  }

  // 食神生财格（火旺有金财）
  if (totalWealth >= 2) {
    return '食神生财格';
  }

  // 正财格（正财多于偏财）
  if (zhengCai > pianCai && zhengCai >= 1) {
    return '正财格';
  }

  // 偏财格（偏财多于正财）
  if (pianCai > zhengCai && pianCai >= 1) {
    return '偏财格';
  }

  // 印比格（没有明显财星，靠助力）
  if (totalWealth === 0) {
    return '印比格';
  }

  return '平和格';
}

/**
 * 生成命格描述
 */
function generatePatternDescription(
  pattern: string,
  wealthStatus: '旺' | '平' | '弱',
  dayMasterWuXing: WuXing
): string {
  const descriptions: Record<string, string> = {
    财多身弱格: '命中财星旺盛，但自身承受力不足。投资机会多，但需谨慎选择，避免贪多。',
    身财两停格: '命格平衡，自身实力与财富机遇相当。稳健经营，进退有度，财运亨通。',
    从强格: '自身气场强大，独当一面。投资果断，魄力十足，适合重仓出击。',
    食神生财格: '才华横溢，善于把握机会。投资眼光独到，能够灵活应变，财源广进。',
    正财格: '脚踏实地，重视稳健收益。适合长期价值投资，积少成多，细水长流。',
    偏财格: '机遇型选手，善于捕捉短期机会。适合波段操作，以小博大，风险与收益并存。',
    印比格: '贵人相助，资源共享。适合跟随社区共识，参与热门项目，借力而起。',
    平和格: '命格中庸，无明显偏向。投资宜多元化，分散风险，顺势而为。',
  };

  return descriptions[pattern] || '命格平稳，顺其自然。';
}

/**
 * 生成投资风格建议
 */
function generateTradingStyle(pattern: string, wealthStatus: '旺' | '平' | '弱'): string {
  if (wealthStatus === '旺') {
    if (pattern.includes('身弱')) {
      return '财运虽旺，但需量力而行。建议：小额多单，分散投资，切忌满仓重注。';
    }
    return '财星旺盛，投资得力。建议：积极布局，把握主流机会，适度加仓。';
  }

  if (wealthStatus === '弱') {
    return '财星较弱，宜守不宜攻。建议：保守为主，持有主流资产，等待时机。';
  }

  return '财运平稳，顺势而为。建议：稳健操作，关注确定性机会，控制仓位。';
}

/**
 * 分析2025年流年运势
 */
export function analyze2025LiuNian(
  chart: BaZiChart,
  mingge: MingGeAnalysis,
  wuxing: WuXingStats
): LiuNianFortune {
  const liuNian = get2025LiuNian(); // 乙巳年

  // 乙木巳火的特点
  const analysis = generate2025Analysis(liuNian.gan, liuNian.zhi, chart.dayMaster, mingge);

  // 投资建议
  const recommendation = generate2025Recommendation(liuNian.gan, liuNian.zhi, wuxing.xiYong);

  // 幸运月份（简化版）
  const luckyMonths = calculateLuckyMonths(chart.dayMaster);

  return {
    year: 2025,
    ganZhi: liuNian.label,
    analysis,
    recommendation,
    luckyMonths,
  };
}

/**
 * 生成2025年分析
 */
function generate2025Analysis(
  liuNianGan: TianGan,
  liuNianZhi: string,
  dayMaster: TianGan,
  mingge: MingGeAnalysis
): string {
  // 2025乙巳年：乙木巳火
  const dayMasterWuXing = TIAN_GAN_WU_XING[dayMaster];

  if (dayMasterWuXing === '木' || dayMasterWuXing === '火') {
    return '2025乙巳年，木火相生，正是你命格喜用之年。币市可能迎来新一轮热潮，MEME币、公链代币或有机会。把握机遇，顺势而为。';
  }

  if (dayMasterWuXing === '金') {
    return '2025乙巳年，火旺克金，对金命之人略有压力。投资宜谨慎，避免追高，注重风险控制，等待更好时机。';
  }

  if (dayMasterWuXing === '水') {
    return '2025乙巳年，火旺制水，水命之人需低调行事。保持流动性，适当减仓，观望为主，切忌激进。';
  }

  // 土命
  return '2025乙巳年，火生土旺，土命之人运势平稳。稳健布局DeFi、质押类资产，积累沉淀，稳中求进。';
}

/**
 * 生成2025年投资建议
 */
function generate2025Recommendation(
  liuNianGan: TianGan,
  liuNianZhi: string,
  xiYong: WuXing[]
): string {
  // 2025年木火旺，根据喜用神给建议
  if (xiYong.includes('火') || xiYong.includes('木')) {
    return '今年适合增持热点板块：MEME币（火）、新兴公链（木）、AI概念代币。顺应趋势，积极参与。';
  }

  if (xiYong.includes('金')) {
    return '今年火旺克金，建议持有BTC/ETH等主流币（金）作为压舱石，避免过度投机，稳健为上。';
  }

  if (xiYong.includes('水')) {
    return '今年火旺水弱，建议增加稳定币（水）配置，保持流动性，以守为攻，静待转机。';
  }

  // 土
  return '今年火生土旺，建议参与DeFi质押（土），获取稳定收益，积累资产，厚积薄发。';
}

/**
 * 计算幸运月份（简化版）
 */
function calculateLuckyMonths(dayMaster: TianGan): string[] {
  const dayMasterWuXing = TIAN_GAN_WU_XING[dayMaster];

  // 根据日主五行，简单推算幸运月份
  const luckyMonthsMap: Record<WuXing, string[]> = {
    木: ['2月', '3月', '8月'], // 春季木旺，夏季火生
    火: ['5月', '6月', '7月'], // 夏季火旺
    土: ['4月', '7月', '10月'], // 季月土旺
    金: ['8月', '9月', '10月'], // 秋季金旺
    水: ['11月', '12月', '1月'], // 冬季水旺
  };

  return luckyMonthsMap[dayMasterWuXing] || ['全年平稳'];
}
