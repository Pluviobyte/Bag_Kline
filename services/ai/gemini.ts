import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Generate text using Gemini API
 * @param prompt - The prompt to send to Gemini
 * @returns Generated text response
 */
export async function generateText(prompt: string): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

interface AIInput {
  tags: string[];
  dimensions: {
    tradingStyle: { label: string; description: string };
    tokenPreference: { label: string; description: string };
    portfolioSize: { label: string; description: string };
    pnlStatus: { label: string; description: string };
    concentration: { label: string; description: string };
    walletAge: { label: string; description: string };
  };
  totalValueUsd: number;
  pnlPercent: number;
  topHoldings: Array<{ symbol: string; percentOfPortfolio: number }>;
}

interface AIContent {
  description: string;
  roastLine: string;
}

/**
 * Generate AI content for wallet analysis
 */
export async function generateAIContent(input: AIInput): Promise<AIContent> {
  const prompt = `
你是一个币圈老韭菜，擅长用幽默、自嘲的方式分析别人的持仓。
请基于以下真实链上数据，生成一段有趣的分析。

## 用户画像
- 主要标签: ${input.tags.join(' + ')}
- 交易风格: ${input.dimensions.tradingStyle.label} - ${input.dimensions.tradingStyle.description}
- 代币偏好: ${input.dimensions.tokenPreference.label} - ${input.dimensions.tokenPreference.description}
- 资金规模: ${input.dimensions.portfolioSize.label} ($${input.totalValueUsd.toFixed(2)})
- 盈亏状态: ${input.dimensions.pnlStatus.label} (${input.pnlPercent > 0 ? '+' : ''}${input.pnlPercent.toFixed(1)}%)
- 持仓集中度: ${input.dimensions.concentration.label}
- 钱包年龄: ${input.dimensions.walletAge.label}

## 主要持仓
${input.topHoldings.map(h => `- ${h.symbol}: ${h.percentOfPortfolio.toFixed(1)}%`).join('\n')}

## 输出要求
请输出JSON格式，包含两个字段：
1. description: 50-80字的趣味描述，用币圈黑话，轻松吐槽风格
2. roastLine: 一句话吐槽金句，15-25字，适合分享到社交媒体

注意：
- 不要给投资建议
- 保持轻松幽默的语气
- 可以适当自嘲
- 使用币圈常用梗（如"钻石手"、"纸手"、"梭哈"、"割肉"、"躺平"等）

只输出JSON，不要其他内容：
`;

  try {
    const response = await generateText(prompt);

    // Clean up potential markdown code blocks
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    return {
      description: parsed.description || getDefaultDescription(input),
      roastLine: parsed.roastLine || getDefaultRoastLine(input),
    };
  } catch (error) {
    console.error('Error generating AI content:', error);
    // Return default content on error
    return {
      description: getDefaultDescription(input),
      roastLine: getDefaultRoastLine(input),
    };
  }
}

/**
 * Get default description when AI fails
 */
function getDefaultDescription(input: AIInput): string {
  const tag = input.tags[0] || '神秘玩家';
  return `作为${tag}的你，在币圈摸爬滚打，有自己独特的生存法则。持仓$${input.totalValueUsd.toFixed(0)}，不管涨跌，都是一种修行。`;
}

/**
 * Get default roast line when AI fails
 * Based on pnlPercent to select category, then random within category
 */
function getDefaultRoastLine(input: AIInput): string {
  // 根据盈亏状态分类的金句
  const roastLinesByStatus: Record<string, string[]> = {
    // 🏆 winner（人生赢家）- 盈利 > 50%
    winner: [
      '运气也是实力的一部分。',
      '拿住，是最难的操作。',
      '慢就是快，少就是多。',
      '信仰不是嘴上说的，是仓位。',
      '时间会奖励那些不动的人。',
    ],
    // 😊 profit（小有盈余）- 盈利 10%-50%
    profit: [
      '浮盈不是盈，落袋才为安。',
      '见好就收，是一种智慧。',
      '不贪不惧，方得始终。',
      '慢慢变富，也是变富。',
      '小赚靠技术，大赚靠命。',
    ],
    // 😐 breakeven（原地踏步）- 盈亏 -10% 到 10%
    breakeven: [
      '币圈一天，人间一年，我们都是时间的朋友。',
      '躺平也是一种投资策略。',
      '我的袋子比我还稳。',
      '不赚不亏，已是人间清醒。',
      '心不动，则币不动。',
    ],
    // 😰 loss（浮亏中）- 亏损 10%-50%
    loss: [
      '不是在抄底，就是在被套的路上。',
      '别人恐惧我贪婪，别人贪婪我更贪婪。',
      '钻石手不是选择，是没得选。',
      '每一次下跌，都是对信仰的考验。',
      '被套的人，才懂什么是长期主义。',
    ],
    // 😭 rekt（深度被套）- 亏损 > 50%
    rekt: [
      '牛市赚不到钱，熊市也赚不到钱。',
      '套得深，才能悟得真。',
      '归零是另一种形式的解脱。',
      '这个市场，终究会还我一个公道。',
      '老韭菜的根，扎得比谁都深。',
    ],
  };

  // 根据 pnlPercent 判断状态
  let status: string;
  const pnl = input.pnlPercent;

  if (pnl > 50) {
    status = 'winner';
  } else if (pnl > 10) {
    status = 'profit';
  } else if (pnl >= -10) {
    status = 'breakeven';
  } else if (pnl >= -50) {
    status = 'loss';
  } else {
    status = 'rekt';
  }

  // 从对应类别中随机选择一句
  const lines = roastLinesByStatus[status];
  const randomIndex = Math.floor(Math.random() * lines.length);
  return lines[randomIndex];
}

// ===== K-Line Prediction =====

interface KLinePredictionInput {
  currentScore: number;
  trend: 'up' | 'down' | 'sideways';
  recentScores: number[];
  tags: string[];
  pnlPercent: number;
  walletAge: string;
}

interface KLinePredictionOutput {
  predictions: Array<{
    date: string;
    score: number;
    label?: string;
  }>;
  peakMonth: string;
  advice: string;
}

/**
 * Generate K-line prediction using AI
 */
export async function generateKLinePrediction(
  input: KLinePredictionInput
): Promise<KLinePredictionOutput> {
  // Generate next 6 months
  const today = new Date();
  const futureMonths: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    futureMonths.push(
      `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`
    );
  }

  const prompt = `
你是一个币圈运势大师，擅长基于玄学和链上数据预测用户的持仓运势。
这是纯娱乐性质的"运势预测"，不是投资建议。

## 用户当前状态
- 当前运势分: ${input.currentScore}/100
- 近期趋势: ${input.trend === 'up' ? '上升' : input.trend === 'down' ? '下跌' : '横盘'}
- 最近运势: ${input.recentScores.join(' -> ')}
- 用户标签: ${input.tags.join(', ')}
- 当前盈亏: ${input.pnlPercent > 0 ? '+' : ''}${input.pnlPercent.toFixed(1)}%
- 钱包年龄: ${input.walletAge}

## 预测要求
请预测未来6个月的运势分数（1-100分）：
${futureMonths.map(m => `- ${m}: ?分`).join('\n')}

## 输出规则
1. 运势分要有起伏，不能全是单调递增/递减
2. 基于当前趋势合理延续，但要有转折点
3. 可以添加有趣的标签如"转运期"、"暴富月"、"躺平期"、"蓄力期"等
4. 给一句简短的运势建议（20字以内）

输出JSON格式：
{
  "predictions": [
    {"date": "2024-07", "score": 65, "label": "蓄力期"},
    ...
  ],
  "peakMonth": "2024-10",
  "advice": "适合躺平等风来"
}

只输出JSON，不要其他内容：
`;

  try {
    const response = await generateText(prompt);

    // Clean up potential markdown code blocks
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/\n?```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    return {
      predictions: parsed.predictions || generateDefaultPredictions(futureMonths, input.currentScore),
      peakMonth: parsed.peakMonth || futureMonths[3],
      advice: parsed.advice || '顺势而为，静待花开',
    };
  } catch (error) {
    console.error('Error generating K-line prediction:', error);
    return {
      predictions: generateDefaultPredictions(futureMonths, input.currentScore),
      peakMonth: futureMonths[3],
      advice: '顺势而为，静待花开',
    };
  }
}

/**
 * Generate default predictions when AI fails
 */
function generateDefaultPredictions(
  months: string[],
  currentScore: number
): Array<{ date: string; score: number; label?: string }> {
  const labels = ['调整期', '蓄力期', '反弹期', '机遇期', '收获期', '巩固期'];
  let score = currentScore;

  return months.map((date, index) => {
    // Add some variation
    const change = (Math.random() - 0.4) * 15; // Slight upward bias
    score = Math.max(20, Math.min(85, score + change));

    return {
      date,
      score: Math.round(score),
      label: labels[index],
    };
  });
}
