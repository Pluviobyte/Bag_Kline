import { nanoid } from 'nanoid';
import { detectChainType } from '../chains/detector';
import { getSolanaHoldings, getSolanaTransactions, getSolanaFirstTransactionDate } from '../chains/solana';
import { getEVMHoldings, getEVMTransactions, getEVMFirstTransactionDate } from '../chains/evm';
import { getTokenInfo, isMainstreamToken } from '../price/coingecko';
import { generatePersonality } from './tags';
import { generateAIContent, generateKLinePrediction } from '../ai/gemini';
import { generateKLineData, addPredictionToKLine } from '../kline/generator';
import { generateBaZiAnalysis } from '../bazi';
import { AnalysisResult, TokenHolding, ChainType } from '@/lib/types';

// Simple in-memory cache for results
const resultCache = new Map<string, { data: AnalysisResult; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Analyze a wallet and generate personality profile
 * @param address - Wallet address (Solana or EVM)
 * @returns Complete analysis result
 */
export async function analyzeWallet(address: string): Promise<AnalysisResult> {
  // Check cache first
  const cacheKey = address.toLowerCase();
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Detect chain type
  const chain = detectChainType(address);
  if (chain === 'unknown') {
    throw new Error('无法识别的钱包地址格式');
  }

  // Fetch chain data based on type
  const chainData = await fetchChainData(address, chain);

  // Enrich holdings with price and category data
  const holdings = await enrichHoldings(chainData.rawHoldings, chain);

  // Calculate totals
  const totalValueUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

  // Calculate holding percentages
  holdings.forEach(h => {
    h.percentOfPortfolio = totalValueUsd > 0 ? (h.valueUsd / totalValueUsd) * 100 : 0;
  });

  // Sort by value (descending)
  holdings.sort((a, b) => b.valueUsd - a.valueUsd);

  // Calculate PnL (simplified - set to 0 for now)
  // In production, integrate Moralis PnL API
  const pnlPercent = 0;
  const pnlUsd = 0;

  // Generate personality tags
  const personality = generatePersonality({
    txCount30d: chainData.transactions.length,
    holdings,
    totalValueUsd,
    pnlPercent,
    firstTxDate: chainData.firstTxDate,
  });

  // Generate AI content
  const aiContent = await generateAIContent({
    tags: personality.tags,
    dimensions: personality.dimensions,
    totalValueUsd,
    pnlPercent,
    topHoldings: holdings.slice(0, 5),
  });

  // Generate K-line data
  let klineData = generateKLineData({
    holdings,
    firstTxDate: chainData.firstTxDate.toISOString(),
    totalValueUsd,
    currentPnlPercent: pnlPercent,
    txCount30d: chainData.transactions.length,
  });

  // Generate AI predictions for K-line
  try {
    const recentScores = klineData.points.slice(-6).map(p => p.score);
    const prediction = await generateKLinePrediction({
      currentScore: klineData.summary.currentScore,
      trend: klineData.summary.trend,
      recentScores,
      tags: personality.tags,
      pnlPercent,
      walletAge: personality.dimensions.walletAge.label,
    });

    // Add predictions to K-line data
    klineData = addPredictionToKLine(klineData, prediction.predictions);
    klineData.summary.advice = prediction.advice;
  } catch (error) {
    console.error('Failed to generate K-line prediction:', error);
    // Continue without predictions
  }

  // Generate BaZi (八字) analysis
  let baziResult;
  try {
    baziResult = generateBaZiAnalysis(chainData.firstTxDate, holdings);
  } catch (error) {
    console.error('Failed to generate BaZi analysis:', error);
    // Continue without BaZi analysis
  }

  // Build result
  const result: AnalysisResult = {
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
      txCount30d: chainData.transactions.length,
      firstTxDate: chainData.firstTxDate.toISOString(),
    },
    pnl: {
      totalPnlPercent: pnlPercent,
      totalPnlUsd: pnlUsd,
    },
    personality: {
      tags: personality.tags,
      tradingStyle: personality.dimensions.tradingStyle.key as AnalysisResult['personality']['tradingStyle'],
      tokenPreference: personality.dimensions.tokenPreference.key as AnalysisResult['personality']['tokenPreference'],
      portfolioSize: personality.dimensions.portfolioSize.key as AnalysisResult['personality']['portfolioSize'],
      pnlStatus: personality.dimensions.pnlStatus.key as AnalysisResult['personality']['pnlStatus'],
      concentration: personality.dimensions.concentration.key as AnalysisResult['personality']['concentration'],
      walletAge: personality.dimensions.walletAge.key as AnalysisResult['personality']['walletAge'],
    },
    aiContent,
    klineData,
    baziResult,
  };

  // Cache the result
  resultCache.set(cacheKey, {
    data: result,
    expiry: Date.now() + CACHE_TTL,
  });

  return result;
}

interface ChainData {
  rawHoldings: RawHolding[];
  transactions: unknown[];
  firstTxDate: Date;
}

interface RawHolding {
  symbol?: string;
  name?: string;
  amount: number;
  contractAddress?: string;
  mint?: string;
}

/**
 * Fetch chain-specific data
 */
async function fetchChainData(address: string, chain: ChainType): Promise<ChainData> {
  if (chain === 'solana') {
    const [rawHoldings, transactions, firstTxDate] = await Promise.all([
      getSolanaHoldings(address),
      getSolanaTransactions(address),
      getSolanaFirstTransactionDate(address),
    ]);

    return {
      rawHoldings: rawHoldings.map(h => ({
        symbol: h.symbol,
        amount: h.amount,
        mint: h.mint,
      })),
      transactions,
      firstTxDate,
    };
  }

  // EVM
  const [rawHoldings, transactions, firstTxDate] = await Promise.all([
    getEVMHoldings(address),
    getEVMTransactions(address),
    getEVMFirstTransactionDate(address),
  ]);

  return {
    rawHoldings: rawHoldings.map(h => ({
      symbol: h.symbol || undefined,
      name: h.name || undefined,
      amount: h.balance,
      contractAddress: h.contractAddress,
    })),
    transactions,
    firstTxDate,
  };
}

/**
 * Enrich holdings with price and category data
 */
async function enrichHoldings(rawHoldings: RawHolding[], chain: ChainType): Promise<TokenHolding[]> {
  const holdings: TokenHolding[] = [];

  for (const h of rawHoldings) {
    // Skip very small amounts
    if (h.amount <= 0) continue;

    const symbol = h.symbol || 'UNKNOWN';

    try {
      // Get token info from CoinGecko
      const tokenInfo = await getTokenInfo(symbol);

      if (tokenInfo) {
        const valueUsd = h.amount * tokenInfo.currentPrice;

        // Skip dust amounts (less than $0.01)
        if (valueUsd < 0.01) continue;

        holdings.push({
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          amount: h.amount,
          valueUsd,
          percentOfPortfolio: 0, // Will be calculated later
          isMeme: tokenInfo.isMeme,
          contractAddress: h.contractAddress,
          mint: h.mint,
        });
      } else {
        // Token not found in CoinGecko, add with zero value
        // Only add if it's not a known mainstream token
        if (!isMainstreamToken(symbol)) {
          holdings.push({
            symbol,
            name: h.name || symbol,
            amount: h.amount,
            valueUsd: 0,
            percentOfPortfolio: 0,
            isMeme: false, // Unknown tokens default to non-meme
            contractAddress: h.contractAddress,
            mint: h.mint,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to get info for token ${symbol}:`, error);
      // Skip tokens that fail to fetch
    }
  }

  return holdings;
}

/**
 * Get a cached analysis result by ID
 */
export function getCachedResult(id: string): AnalysisResult | null {
  for (const [, cached] of resultCache) {
    if (cached.data.id === id && cached.expiry > Date.now()) {
      return cached.data;
    }
  }
  return null;
}

/**
 * Clear the result cache
 */
export function clearCache(): void {
  resultCache.clear();
}
