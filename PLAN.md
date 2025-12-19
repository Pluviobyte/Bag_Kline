# BagKline 实现计划

**我的袋子K线** - 基于真实链上数据的个性化持仓分析工具，娱乐化呈现。

## 核心理念
- **真实数据驱动**：链上持仓、交易历史、价格数据
- **娱乐化呈现**：性格标签、趣味文案、社交分享图

---

## 技术选型（已验证）

| 组件 | 选择 | 验证来源 |
|------|------|----------|
| 框架 | Next.js 14 (App Router) | [Next.js Docs](https://nextjs.org/docs) |
| UI | Tailwind CSS + shadcn/ui | - |
| 图表 | ECharts / Lightweight Charts | - |
| AI | Gemini API | [免费层5-15RPM](https://ai.google.dev/gemini-api/docs/pricing) |
| Solana数据 | Helius API | [免费100万credits](https://www.helius.dev/pricing) |
| EVM数据 | Alchemy API | [支持45+链](https://www.alchemy.com/token-api) |
| 价格数据 | Birdeye + CoinGecko | [Birdeye API](https://docs.birdeye.so/docs/historical-price-unix) |
| PnL计算 | Moralis API | [Moralis PnL](https://moralis.com/crypto-pnl-api-how-to-track-wallet-profit-loss/) |
| 图片生成 | @vercel/og (Satori) | [Next.js OG](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) |
| 部署 | Vercel | - |

### API免费层

| API | 免费额度 | 限制 |
|-----|---------|------|
| Helius | 100万credits | 无需信用卡 |
| Alchemy | 充足 | 免费层够MVP |
| Gemini | 5-15 RPM | 支持商业用途 |
| Birdeye | 有免费层 | 数据从2023.8起 |
| CoinGecko | 有免费层 | 有频率限制 |

---

## 项目结构

```
K-line/
├── app/
│   ├── page.tsx                    # 首页 - 钱包输入
│   ├── analyze/[id]/page.tsx       # 分析结果页
│   ├── api/
│   │   ├── analyze/route.ts        # 分析API入口
│   │   ├── result/[id]/route.ts    # 获取结果
│   │   ├── image/[id]/route.ts     # 生成分享图
│   │   └── telegram/webhook/route.ts
│   └── layout.tsx
├── components/
│   ├── wallet-input.tsx
│   ├── analysis-card.tsx
│   ├── share-card.tsx
│   └── ui/
├── services/
│   ├── chains/
│   │   ├── solana.ts
│   │   ├── evm.ts
│   │   └── detector.ts
│   ├── price/
│   │   └── coingecko.ts
│   ├── analysis/
│   │   ├── engine.ts
│   │   └── tags.ts
│   ├── ai/
│   │   ├── gemini.ts
│   │   └── prompts.ts
│   └── image/
│       └── generator.ts
├── lib/
│   ├── types.ts
│   └── utils.ts
├── bot/
│   └── telegram.ts
└── package.json
```

---

## 详细实现步骤

### Phase 1: 基础架构

#### 1.1 初始化项目
```bash
npx create-next-app@latest k-line --typescript --tailwind --eslint --app --src-dir=false
cd k-line
npx shadcn-ui@latest init
```

#### 1.2 安装依赖
```bash
# 核心依赖
npm install @google/generative-ai  # Gemini API
npm install helius-sdk             # Helius (Solana)
npm install alchemy-sdk            # Alchemy (EVM)
npm install axios                  # HTTP请求

# UI组件
npx shadcn-ui@latest add button input card skeleton toast

# 图表
npm install echarts echarts-for-react

# Telegram Bot
npm install grammy

# 工具
npm install nanoid                 # 生成唯一ID
npm install dayjs                  # 日期处理
```

#### 1.3 环境变量 (.env.local)
```env
# Solana
HELIUS_API_KEY=your_helius_key

# EVM
ALCHEMY_API_KEY=your_alchemy_key

# 价格
COINGECKO_API_KEY=your_coingecko_key
BIRDEYE_API_KEY=your_birdeye_key

# AI
GEMINI_API_KEY=your_gemini_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

### Phase 2: 链上数据服务

#### 2.1 链类型检测 (`/services/chains/detector.ts`)

```typescript
export function detectChainType(address: string): 'solana' | 'evm' | 'unknown' {
  // Solana地址: Base58, 32-44字符
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  // EVM地址: 0x开头, 40个十六进制字符
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  if (solanaRegex.test(address)) return 'solana';
  if (evmRegex.test(address)) return 'evm';
  return 'unknown';
}
```

#### 2.2 Solana数据获取 (`/services/chains/solana.ts`)

```typescript
import { Helius } from 'helius-sdk';

const helius = new Helius(process.env.HELIUS_API_KEY!);

// 获取持仓
export async function getSolanaHoldings(address: string) {
  const response = await helius.rpc.getTokenAccountsByOwner(address);

  return response.map(token => ({
    mint: token.account.data.parsed.info.mint,
    amount: token.account.data.parsed.info.tokenAmount.uiAmount,
    decimals: token.account.data.parsed.info.tokenAmount.decimals,
  }));
}

// 获取交易历史 (近30天)
export async function getSolanaTransactions(address: string) {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  const transactions = await helius.parseTransactions(address, {
    type: 'SWAP',  // 只获取swap交易
  });

  // 过滤30天内的交易
  return transactions.filter(tx => tx.timestamp >= thirtyDaysAgo);
}

// 获取钱包首次交易时间
export async function getFirstTransactionDate(address: string): Promise<Date> {
  const transactions = await helius.parseTransactions(address, {
    limit: 1,
    order: 'asc',  // 最早的交易
  });

  if (transactions.length === 0) return new Date();
  return new Date(transactions[0].timestamp * 1000);
}
```

#### 2.3 EVM数据获取 (`/services/chains/evm.ts`)

```typescript
import { Alchemy, Network } from 'alchemy-sdk';

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

// 获取持仓
export async function getEVMHoldings(address: string) {
  const balances = await alchemy.core.getTokenBalances(address);

  const holdings = [];
  for (const token of balances.tokenBalances) {
    if (token.tokenBalance === '0x0') continue;

    // 获取代币元数据
    const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);

    holdings.push({
      contractAddress: token.contractAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      balance: parseInt(token.tokenBalance, 16) / Math.pow(10, metadata.decimals || 18),
      decimals: metadata.decimals,
    });
  }

  return holdings;
}

// 获取交易历史 (近30天)
export async function getEVMTransactions(address: string) {
  const transfers = await alchemy.core.getAssetTransfers({
    fromAddress: address,
    category: ['erc20', 'external'],
    maxCount: 500,
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return transfers.transfers.filter(tx =>
    new Date(tx.metadata.blockTimestamp) >= thirtyDaysAgo
  );
}
```

#### 2.4 价格数据获取 (`/services/price/coingecko.ts`)

```typescript
import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// 获取代币价格和分类
export async function getTokenInfo(tokenId: string) {
  const response = await axios.get(`${COINGECKO_API}/coins/${tokenId}`, {
    params: {
      localization: false,
      tickers: false,
      community_data: false,
      developer_data: false,
    },
  });

  return {
    id: response.data.id,
    symbol: response.data.symbol,
    name: response.data.name,
    currentPrice: response.data.market_data.current_price.usd,
    categories: response.data.categories,  // 包含 "Meme" 等分类
    isMeme: response.data.categories.some(c =>
      c.toLowerCase().includes('meme')
    ),
  };
}

// 批量获取价格 (通过合约地址)
export async function getTokenPrices(contractAddresses: string[], platform = 'ethereum') {
  const addresses = contractAddresses.join(',');

  const response = await axios.get(
    `${COINGECKO_API}/simple/token_price/${platform}`,
    {
      params: {
        contract_addresses: addresses,
        vs_currencies: 'usd',
      },
    }
  );

  return response.data;
}

// 主流币列表
export const MAINSTREAM_TOKENS = ['bitcoin', 'ethereum', 'solana', 'tether', 'usd-coin'];
```

---

### Phase 3: 分析引擎

#### 3.1 标签生成 (`/services/analysis/tags.ts`)

```typescript
import { TokenHolding, PersonalityResult } from '@/lib/types';
import dayjs from 'dayjs';

// ===== 维度1: 交易风格 =====
export function getTradingStyle(txCount30d: number) {
  if (txCount30d < 5) {
    return { key: 'hodler', label: 'HODLer', emoji: '🏔️', description: 'Buy and forget，躺平即正义' };
  }
  if (txCount30d <= 30) {
    return { key: 'swing', label: '波段选手', emoji: '🌊', description: '高抛低吸，波段为王' };
  }
  return { key: 'frequent', label: '高频玩家', emoji: '🎰', description: '不交易会死星人' };
}

// ===== 维度2: 代币偏好 =====
export function getTokenPreference(holdings: TokenHolding[]) {
  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  if (total === 0) return { key: 'diversified', label: '多元玩家', emoji: '🎨', description: '不把鸡蛋放一个篮子' };

  const mainstreamSymbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC', 'WETH'];
  const mainstreamValue = holdings
    .filter(h => mainstreamSymbols.includes(h.symbol.toUpperCase()))
    .reduce((sum, h) => sum + h.valueUsd, 0);

  const memeValue = holdings
    .filter(h => h.isMeme)
    .reduce((sum, h) => sum + h.valueUsd, 0);

  if (mainstreamValue / total > 0.7) {
    return { key: 'mainstream', label: '主流派', emoji: '🏛️', description: '只买大饼和主流' };
  }
  if (memeValue / total > 0.5) {
    return { key: 'meme', label: '土狗猎人', emoji: '🐕', description: '百倍土狗，改变命运' };
  }
  return { key: 'diversified', label: '多元玩家', emoji: '🎨', description: '不把鸡蛋放一个篮子' };
}

// ===== 维度3: 资金规模 =====
export function getPortfolioSize(totalValueUsd: number) {
  if (totalValueUsd > 100000) {
    return { key: 'whale', label: '鲸鱼', emoji: '🐋', description: '一个人就是一个市场' };
  }
  if (totalValueUsd > 10000) {
    return { key: 'dolphin', label: '海豚', emoji: '🐬', description: '小有资本，稳步前进' };
  }
  if (totalValueUsd > 1000) {
    return { key: 'fish', label: '小鱼', emoji: '🐟', description: '散户一枚，努力翻身' };
  }
  return { key: 'shrimp', label: '虾米', emoji: '🦐', description: '本金虽小，梦想很大' };
}

// ===== 维度4: 盈亏状态 =====
export function getPnlStatus(pnlPercent: number) {
  if (pnlPercent > 50) {
    return { key: 'winner', label: '人生赢家', emoji: '👑', description: '这就是天选之人吗' };
  }
  if (pnlPercent > 10) {
    return { key: 'profit', label: '小有盈余', emoji: '😊', description: '至少没亏钱' };
  }
  if (pnlPercent > -10) {
    return { key: 'breakeven', label: '原地踏步', emoji: '😐', description: '忙活半天，白干' };
  }
  if (pnlPercent > -50) {
    return { key: 'loss', label: '浮亏中', emoji: '😰', description: '再等等，会涨的' };
  }
  return { key: 'rekt', label: '深度被套', emoji: '😭', description: '我不是韭菜，我是老韭菜' };
}

// ===== 维度5: 持仓集中度 =====
export function getConcentration(holdings: TokenHolding[]) {
  if (holdings.length === 0) {
    return { key: 'diversified', label: '分散投资', emoji: '🎯', description: '风险分散，稳中求进' };
  }

  const total = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  const maxHolding = Math.max(...holdings.map(h => h.valueUsd));
  const topPercent = (maxHolding / total) * 100;

  if (topPercent > 80) {
    return { key: 'yolo', label: '梭哈战士', emoji: '🚀', description: '要么暴富，要么归零' };
  }
  if (topPercent > 50) {
    return { key: 'heavy', label: '重仓玩家', emoji: '💰', description: '重仓信仰币' };
  }
  return { key: 'diversified', label: '分散投资', emoji: '🎯', description: '风险分散，稳中求进' };
}

// ===== 维度6: 钱包年龄 =====
export function getWalletAge(firstTxDate: Date) {
  const now = dayjs();
  const first = dayjs(firstTxDate);
  const years = now.diff(first, 'year', true);

  if (years > 2) {
    return { key: 'og', label: 'OG玩家', emoji: '🏆', description: '币圈老炮，见证历史' };
  }
  if (years > 1) {
    return { key: 'veteran', label: '老韭菜', emoji: '🌿', description: '经历过牛熊' };
  }
  return { key: 'newbie', label: '新手上路', emoji: '🐣', description: '萌新报道' };
}

// ===== 综合生成 =====
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

  // 主标签: 取最有特色的3个
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
```

#### 3.2 分析引擎主逻辑 (`/services/analysis/engine.ts`)

```typescript
import { detectChainType } from '../chains/detector';
import { getSolanaHoldings, getSolanaTransactions, getFirstTransactionDate as getSolanaFirstTx } from '../chains/solana';
import { getEVMHoldings, getEVMTransactions } from '../chains/evm';
import { getTokenInfo, getTokenPrices } from '../price/coingecko';
import { generatePersonality } from './tags';
import { generateAIContent } from '../ai/gemini';
import { AnalysisResult, TokenHolding } from '@/lib/types';
import { nanoid } from 'nanoid';

export async function analyzeWallet(address: string): Promise<AnalysisResult> {
  const chain = detectChainType(address);
  if (chain === 'unknown') {
    throw new Error('无法识别的钱包地址格式');
  }

  // 1. 获取链上数据
  let rawHoldings: any[];
  let transactions: any[];
  let firstTxDate: Date;

  if (chain === 'solana') {
    rawHoldings = await getSolanaHoldings(address);
    transactions = await getSolanaTransactions(address);
    firstTxDate = await getSolanaFirstTx(address);
  } else {
    rawHoldings = await getEVMHoldings(address);
    transactions = await getEVMTransactions(address);
    // EVM首次交易日期需要额外逻辑...
    firstTxDate = new Date(); // 简化处理
  }

  // 2. 获取价格和分类信息
  const holdings: TokenHolding[] = [];
  let totalValueUsd = 0;

  for (const h of rawHoldings) {
    try {
      const tokenInfo = await getTokenInfo(h.symbol.toLowerCase());
      const valueUsd = h.amount * tokenInfo.currentPrice;
      totalValueUsd += valueUsd;

      holdings.push({
        symbol: h.symbol,
        name: tokenInfo.name,
        amount: h.amount,
        valueUsd,
        percentOfPortfolio: 0, // 后面计算
        isMeme: tokenInfo.isMeme,
      });
    } catch (e) {
      // 找不到价格的代币跳过
      console.warn(`Token ${h.symbol} not found in CoinGecko`);
    }
  }

  // 计算持仓占比
  holdings.forEach(h => {
    h.percentOfPortfolio = totalValueUsd > 0 ? (h.valueUsd / totalValueUsd) * 100 : 0;
  });

  // 按价值排序
  holdings.sort((a, b) => b.valueUsd - a.valueUsd);

  // 3. 计算PnL (简化版: 假设PnL为0，实际应调用Moralis API)
  const pnlPercent = 0; // TODO: 调用 Moralis API
  const pnlUsd = 0;

  // 4. 生成性格标签
  const personality = generatePersonality({
    txCount30d: transactions.length,
    holdings,
    totalValueUsd,
    pnlPercent,
    firstTxDate,
  });

  // 5. 生成AI文案
  const aiContent = await generateAIContent({
    tags: personality.tags,
    dimensions: personality.dimensions,
    totalValueUsd,
    pnlPercent,
    topHoldings: holdings.slice(0, 5),
  });

  return {
    id: nanoid(10),
    address,
    chain,
    analyzedAt: new Date().toISOString(),
    portfolio: {
      totalValueUsd,
      holdings,
      topHoldingPercent: holdings[0]?.percentOfPortfolio || 0,
    },
    trading: {
      txCount30d: transactions.length,
      firstTxDate: firstTxDate.toISOString(),
    },
    pnl: {
      totalPnlPercent: pnlPercent,
      totalPnlUsd: pnlUsd,
    },
    personality: {
      tags: personality.tags,
      tradingStyle: personality.dimensions.tradingStyle.key as any,
      tokenPreference: personality.dimensions.tokenPreference.key as any,
      portfolioSize: personality.dimensions.portfolioSize.key as any,
      pnlStatus: personality.dimensions.pnlStatus.key as any,
      concentration: personality.dimensions.concentration.key as any,
      walletAge: personality.dimensions.walletAge.key as any,
    },
    aiContent,
  };
}
```

---

### Phase 4: AI文案生成

#### 4.1 Gemini API封装 (`/services/ai/gemini.ts`)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
```

#### 4.2 Prompt模板 (`/services/ai/prompts.ts`)

```typescript
import { generateText } from './gemini';

interface AIInput {
  tags: string[];
  dimensions: any;
  totalValueUsd: number;
  pnlPercent: number;
  topHoldings: Array<{ symbol: string; percentOfPortfolio: number }>;
}

export async function generateAIContent(input: AIInput) {
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
- 使用币圈常用梗（如"钻石手"、"纸手"、"梭哈"、"割肉"等）

只输出JSON，不要其他内容：
`;

  const response = await generateText(prompt);

  try {
    // 清理可能的markdown标记
    const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (e) {
    // 解析失败时返回默认内容
    return {
      description: `${input.tags[0]}的你，在币圈摸爬滚打，有自己的一套生存法则。`,
      roastLine: '币圈一天，人间一年，我们都是时间的朋友。',
    };
  }
}
```

---

### Phase 5: API端点

#### 5.1 分析API (`/app/api/analyze/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { analyzeWallet } from '@/services/analysis/engine';
import { detectChainType } from '@/services/chains/detector';

// 简单的内存缓存 (生产环境应使用Redis)
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    // 验证地址
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的钱包地址' },
        { status: 400 }
      );
    }

    const chain = detectChainType(address.trim());
    if (chain === 'unknown') {
      return NextResponse.json(
        { error: '无法识别的钱包地址格式，请输入Solana或EVM地址' },
        { status: 400 }
      );
    }

    // 检查缓存
    const cacheKey = address.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // 执行分析
    const result = await analyzeWallet(address.trim());

    // 存入缓存
    cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + CACHE_TTL,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || '分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}
```

#### 5.2 分享图片API (`/app/api/image/[id]/route.tsx`)

```typescript
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 从URL参数获取数据 (实际应从数据库获取)
  const searchParams = request.nextUrl.searchParams;
  const tags = searchParams.get('tags') || '神秘玩家';
  const pnl = searchParams.get('pnl') || '0';
  const roast = searchParams.get('roast') || '币圈一天，人间一年';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 标题 */}
        <div style={{ fontSize: 32, marginBottom: 20, color: '#ffd700' }}>
          我的袋子K线
        </div>

        {/* 标签 */}
        <div style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 30 }}>
          {tags}
        </div>

        {/* 盈亏 */}
        <div style={{
          fontSize: 36,
          color: parseFloat(pnl) >= 0 ? '#00ff88' : '#ff4444',
          marginBottom: 30,
        }}>
          {parseFloat(pnl) >= 0 ? '+' : ''}{pnl}%
        </div>

        {/* 吐槽金句 */}
        <div style={{
          fontSize: 24,
          color: '#888',
          maxWidth: '80%',
          textAlign: 'center',
        }}>
          "{roast}"
        </div>

        {/* 底部水印 */}
        <div style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 18,
          color: '#555'
        }}>
          bagkline.xyz · 仅供娱乐
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

---

### Phase 6: 前端页面

#### 6.1 首页 (`/app/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function Home() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!address.trim()) {
      setError('请输入钱包地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '分析失败');
      }

      // 跳转到结果页
      router.push(`/analyze/${data.id}`);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-gray-800/50 border-gray-700">
        <h1 className="text-3xl font-bold text-center text-white mb-2">
          我的袋子K线 📊
        </h1>
        <p className="text-gray-400 text-center mb-8">
          输入钱包地址，看看你的持仓运势
        </p>

        <div className="space-y-4">
          <Input
            placeholder="输入 Solana 或 EVM 钱包地址"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? '分析中...' : '开始分析'}
          </Button>
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          仅供娱乐，不构成投资建议
        </p>
      </Card>
    </main>
  );
}
```

#### 6.2 结果页 (`/app/analyze/[id]/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisResult } from '@/lib/types';

export default function AnalyzePage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从localStorage或API获取结果
    // 这里简化为从localStorage
    const cached = localStorage.getItem(`analysis_${params.id}`);
    if (cached) {
      setResult(JSON.parse(cached));
    }
    setLoading(false);
  }, [params.id]);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/api/image/${params.id}?tags=${encodeURIComponent(result?.personality.tags.join(' + ') || '')}&pnl=${result?.pnl.totalPnlPercent || 0}&roast=${encodeURIComponent(result?.aiContent.roastLine || '')}`;

    // 复制分享链接
    navigator.clipboard.writeText(shareUrl);
    alert('分享图片链接已复制！');
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">加载中...</div>;
  }

  if (!result) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">未找到分析结果</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 主标签 */}
        <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {result.personality.tags.join(' + ')}
          </h2>
          <p className="text-gray-400">{result.aiContent.description}</p>
        </Card>

        {/* 盈亏 */}
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <div className="text-center">
            <p className="text-gray-400 mb-2">总盈亏</p>
            <p className={`text-4xl font-bold ${result.pnl.totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.pnl.totalPnlPercent >= 0 ? '+' : ''}{result.pnl.totalPnlPercent.toFixed(2)}%
            </p>
          </div>
        </Card>

        {/* 六维雷达 */}
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h3 className="text-white font-bold mb-4">你的六维画像</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">交易风格</span>
              <span className="text-white">{result.personality.tradingStyle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">代币偏好</span>
              <span className="text-white">{result.personality.tokenPreference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">资金规模</span>
              <span className="text-white">{result.personality.portfolioSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">盈亏状态</span>
              <span className="text-white">{result.personality.pnlStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">持仓集中度</span>
              <span className="text-white">{result.personality.concentration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">钱包年龄</span>
              <span className="text-white">{result.personality.walletAge}</span>
            </div>
          </div>
        </Card>

        {/* 吐槽金句 */}
        <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
          <p className="text-xl text-yellow-400 italic">"{result.aiContent.roastLine}"</p>
        </Card>

        {/* 分享按钮 */}
        <Button onClick={handleShare} className="w-full">
          分享到社交媒体
        </Button>

        <p className="text-gray-500 text-xs text-center">
          仅供娱乐，不构成投资建议
        </p>
      </div>
    </main>
  );
}
```

---

### Phase 7: Telegram Bot

#### 7.1 Bot实现 (`/bot/telegram.ts`)

```typescript
import { Bot, Context, webhookCallback } from 'grammy';
import { analyzeWallet } from '@/services/analysis/engine';
import { detectChainType } from '@/services/chains/detector';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// /start 命令
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 欢迎使用袋子K线 Bot!\n\n' +
    '发送钱包地址，我来分析你的持仓运势。\n\n' +
    '支持 Solana 和 EVM (ETH/BSC/Polygon等) 地址。\n\n' +
    '命令:\n' +
    '/analyze <地址> - 分析钱包\n' +
    '/help - 获取帮助'
  );
});

// /help 命令
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 使用说明\n\n' +
    '1. 直接发送钱包地址\n' +
    '2. 或使用 /analyze <地址>\n\n' +
    '示例:\n' +
    '/analyze 0x1234...5678\n\n' +
    '⚠️ 仅供娱乐，不构成投资建议'
  );
});

// /analyze 命令
bot.command('analyze', async (ctx) => {
  const address = ctx.match;

  if (!address) {
    await ctx.reply('请提供钱包地址，例如:\n/analyze 0x1234...5678');
    return;
  }

  await handleAnalyze(ctx, address);
});

// 直接发送地址
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // 检查是否是地址格式
  if (detectChainType(text) !== 'unknown') {
    await handleAnalyze(ctx, text);
  }
});

async function handleAnalyze(ctx: Context, address: string) {
  const chain = detectChainType(address);

  if (chain === 'unknown') {
    await ctx.reply('❌ 无法识别的地址格式，请检查后重试');
    return;
  }

  await ctx.reply(`🔍 正在分析 ${chain.toUpperCase()} 钱包...\n请稍候...`);

  try {
    const result = await analyzeWallet(address);

    const message = `
🎯 分析完成!

📊 你的袋子画像:
${result.personality.tags.join(' + ')}

💰 资产规模: $${result.portfolio.totalValueUsd.toFixed(2)}
📈 盈亏: ${result.pnl.totalPnlPercent >= 0 ? '+' : ''}${result.pnl.totalPnlPercent.toFixed(2)}%

🎭 六维分析:
• 交易风格: ${result.personality.tradingStyle}
• 代币偏好: ${result.personality.tokenPreference}
• 资金规模: ${result.personality.portfolioSize}
• 盈亏状态: ${result.personality.pnlStatus}
• 持仓集中度: ${result.personality.concentration}
• 钱包年龄: ${result.personality.walletAge}

💬 "${result.aiContent.roastLine}"

—————————
🔗 完整报告: ${process.env.NEXT_PUBLIC_APP_URL}/analyze/${result.id}

⚠️ 仅供娱乐，不构成投资建议
`;

    await ctx.reply(message);

  } catch (error: any) {
    await ctx.reply(`❌ 分析失败: ${error.message}`);
  }
}

// Webhook handler for Vercel
export const handleUpdate = webhookCallback(bot, 'std/http');
```

#### 7.2 Webhook端点 (`/app/api/telegram/webhook/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleUpdate } from '@/bot/telegram';

export async function POST(request: NextRequest) {
  try {
    return await handleUpdate(request);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

---

## 数据结构定义 (`/lib/types.ts`)

```typescript
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
}

export interface TokenHolding {
  symbol: string;
  name: string;
  amount: number;
  valueUsd: number;
  percentOfPortfolio: number;
  isMeme: boolean;
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
```

---

## 错误处理策略

```typescript
// /lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export const ErrorCodes = {
  INVALID_ADDRESS: { code: 'INVALID_ADDRESS', status: 400, message: '无效的钱包地址' },
  CHAIN_NOT_SUPPORTED: { code: 'CHAIN_NOT_SUPPORTED', status: 400, message: '不支持的链类型' },
  API_RATE_LIMIT: { code: 'API_RATE_LIMIT', status: 429, message: '请求过于频繁，请稍后重试' },
  EXTERNAL_API_ERROR: { code: 'EXTERNAL_API_ERROR', status: 502, message: '外部服务暂时不可用' },
  ANALYSIS_FAILED: { code: 'ANALYSIS_FAILED', status: 500, message: '分析失败，请稍后重试' },
};
```

---

## 限流策略

```typescript
// /lib/rateLimit.ts
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(identifier);

  if (!record || record.resetAt < now) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// 使用示例 (在API route中)
// if (!checkRateLimit(clientIP, 10, 60 * 60 * 1000)) {
//   return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
// }
```

---

## 环境变量

```env
# Solana
HELIUS_API_KEY=

# EVM
ALCHEMY_API_KEY=

# 价格
COINGECKO_API_KEY=
BIRDEYE_API_KEY=

# AI
GEMINI_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 部署检查清单

- [ ] 所有环境变量已配置
- [ ] Vercel项目已创建并关联Git仓库
- [ ] Telegram Bot Webhook已设置 (`https://your-domain/api/telegram/webhook`)
- [ ] 测试所有API端点
- [ ] 测试Solana和EVM地址分析
- [ ] 测试分享图片生成
- [ ] 测试Telegram Bot响应
- [ ] 检查移动端显示

---

## 成本估算

| 项目 | 月费 |
|------|------|
| Vercel Pro | $20 |
| Helius | $0-49 |
| Alchemy | $0 |
| Gemini API | $20-50 |
| **总计** | ~$40-120 |

---

## 免责声明

> 本工具仅供娱乐，不构成任何投资建议。数据基于链上公开信息，分析结果仅供参考。

---

## 参考资源

- [Helius Docs](https://www.helius.dev/docs)
- [Alchemy Docs](https://docs.alchemy.com)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
- [Birdeye API](https://docs.birdeye.so)
- [Moralis PnL API](https://moralis.com/crypto-pnl-api-how-to-track-wallet-profit-loss/)
- [Rotki](https://github.com/rotki/rotki) - 开源参考
- [Zerion PnL](https://zerion.io/blog/onchain-pnl-api-how-to-track-profit-and-loss-for-wallets-and-tokens/)
