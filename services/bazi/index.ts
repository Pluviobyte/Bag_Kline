import { BaZiResult, TokenHolding } from '@/lib/types';
import { calculateBaZi } from './calculator';
import { analyzeWuXing, analyzeHoldingsWuXing, mapTokenToWuXing } from './elements';
import { analyzeMingGe, analyze2025LiuNian } from './analyzer';

/**
 * 生成完整的八字命理分析
 * @param firstTxDate - 首次交易时间（钱包生辰）
 * @param holdings - 持仓代币列表
 * @returns 完整的八字命理结果
 */
export function generateBaZiAnalysis(
  firstTxDate: string | Date,
  holdings: TokenHolding[]
): BaZiResult {
  // 1. 计算四柱八字
  const chart = calculateBaZi(firstTxDate);

  // 2. 分析五行分布
  const wuxing = analyzeWuXing(chart);

  // 3. 分析命格
  const mingge = analyzeMingGe(chart, wuxing, holdings);

  // 4. 分析2025年流年运势
  const liuNian = analyze2025LiuNian(chart, mingge, wuxing);

  // 5. 分析持仓代币的五行属性
  const holdingsAnalysis = analyzeHoldingsWuXing(holdings);

  return {
    chart,
    wuxing,
    mingge,
    liuNian,
    tokenWuXing: holdingsAnalysis.tokenMap,
  };
}

// 导出其他工具函数
export { calculateBaZi, analyzeWuXing, mapTokenToWuXing, analyzeHoldingsWuXing };
