import axios from 'axios';
import { TokenInfo } from '@/lib/types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests (CoinGecko free tier limit)

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url);
}

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Known token mappings (symbol -> CoinGecko ID)
const KNOWN_TOKENS: Record<string, string> = {
  'BTC': 'bitcoin',
  'WBTC': 'wrapped-bitcoin',
  'ETH': 'ethereum',
  'WETH': 'weth',
  'SOL': 'solana',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'MATIC': 'matic-network',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'DOGE': 'dogecoin',
  'SHIB': 'shiba-inu',
  'PEPE': 'pepe',
  'BONK': 'bonk',
  'WIF': 'dogwifcoin',
  'FLOKI': 'floki',
  'JUP': 'jupiter-exchange-solana',
  'RAY': 'raydium',
  'ORCA': 'orca',
};

// Mainstream tokens
export const MAINSTREAM_TOKENS = ['bitcoin', 'ethereum', 'solana', 'tether', 'usd-coin', 'wrapped-bitcoin', 'weth'];

/**
 * Get token info including price and categories
 * @param tokenIdOrSymbol - CoinGecko token ID or symbol
 * @returns Token info with price and meme status
 */
export async function getTokenInfo(tokenIdOrSymbol: string): Promise<TokenInfo | null> {
  const normalizedSymbol = tokenIdOrSymbol.toUpperCase();

  // Check cache first
  const cacheKey = `token_info_${normalizedSymbol}`;
  const cached = getCached<TokenInfo>(cacheKey);
  if (cached) return cached;

  // Get CoinGecko ID
  let tokenId = KNOWN_TOKENS[normalizedSymbol] || tokenIdOrSymbol.toLowerCase();

  try {
    const response = await rateLimitedFetch(
      `${COINGECKO_API}/coins/${tokenId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Try searching by symbol
        const searchResult = await searchTokenBySymbol(normalizedSymbol);
        if (searchResult) {
          setCache(cacheKey, searchResult);
          return searchResult;
        }
        return null;
      }
      if (response.status === 429) {
        // Rate limited - return null instead of throwing
        console.warn(`CoinGecko rate limited for ${tokenIdOrSymbol}`);
        return null;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const tokenInfo: TokenInfo = {
      id: data.id,
      symbol: data.symbol?.toUpperCase() || normalizedSymbol,
      name: data.name || tokenIdOrSymbol,
      currentPrice: data.market_data?.current_price?.usd || 0,
      categories: data.categories || [],
      isMeme: (data.categories || []).some((c: string) =>
        c.toLowerCase().includes('meme') || c.toLowerCase().includes('dog')
      ),
    };

    setCache(cacheKey, tokenInfo);
    return tokenInfo;
  } catch (error) {
    console.error(`Error fetching token info for ${tokenIdOrSymbol}:`, error);
    return null;
  }
}

/**
 * Search for a token by symbol
 */
async function searchTokenBySymbol(symbol: string): Promise<TokenInfo | null> {
  try {
    const response = await rateLimitedFetch(
      `${COINGECKO_API}/search?query=${symbol}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.coins && data.coins.length > 0) {
      // Find exact symbol match
      const exactMatch = data.coins.find(
        (coin: { symbol: string }) => coin.symbol.toUpperCase() === symbol.toUpperCase()
      );

      const coin = exactMatch || data.coins[0];

      // Fetch full token info
      return getTokenInfo(coin.id);
    }

    return null;
  } catch (error) {
    console.error(`Error searching for token ${symbol}:`, error);
    return null;
  }
}

/**
 * Get prices for multiple tokens by contract address
 * @param contractAddresses - Array of contract addresses
 * @param platform - Platform ID (ethereum, solana, etc.)
 * @returns Map of address to price
 */
export async function getTokenPricesByContract(
  contractAddresses: string[],
  platform: 'ethereum' | 'solana' = 'ethereum'
): Promise<Record<string, number>> {
  if (contractAddresses.length === 0) return {};

  // Check cache
  const cacheKey = `prices_${platform}_${contractAddresses.sort().join(',')}`;
  const cached = getCached<Record<string, number>>(cacheKey);
  if (cached) return cached;

  try {
    const addresses = contractAddresses.join(',');
    const platformId = platform === 'solana' ? 'solana' : 'ethereum';

    const response = await rateLimitedFetch(
      `${COINGECKO_API}/simple/token_price/${platformId}?contract_addresses=${addresses}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = {};
    for (const [address, priceData] of Object.entries(data)) {
      prices[address.toLowerCase()] = (priceData as { usd: number }).usd || 0;
    }

    setCache(cacheKey, prices);
    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
}

/**
 * Get prices for multiple tokens by CoinGecko IDs
 * @param tokenIds - Array of CoinGecko token IDs
 * @returns Map of token ID to price
 */
export async function getTokenPricesById(tokenIds: string[]): Promise<Record<string, number>> {
  if (tokenIds.length === 0) return {};

  const cacheKey = `prices_ids_${tokenIds.sort().join(',')}`;
  const cached = getCached<Record<string, number>>(cacheKey);
  if (cached) return cached;

  try {
    const ids = tokenIds.join(',');

    const response = await rateLimitedFetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = {};
    for (const [id, priceData] of Object.entries(data)) {
      prices[id] = (priceData as { usd: number }).usd || 0;
    }

    setCache(cacheKey, prices);
    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
}

/**
 * Get OHLC (Candlestick) data for a token
 * @param tokenId - CoinGecko token ID
 * @param days - Duration in days (1, 7, 14, 30, 90, 180, 365, max)
 * @returns Array of [timestamp, open, high, low, close]
 */
export async function getTokenOHLC(tokenId: string, days: number | 'max' = 30): Promise<number[][] | null> {
  const cacheKey = `ohlc_${tokenId}_${days}`;
  const cached = getCached<number[][]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await rateLimitedFetch(
      `${COINGECKO_API}/coins/${tokenId}/ohlc?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`CoinGecko rate limited for OHLC ${tokenId}`);
        return null;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    // Data format: [[time, open, high, low, close], ...]
    
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching OHLC for ${tokenId}:`, error);
    return null;
  }
}

/**
 * Check if a token is a meme token
 * @param symbol - Token symbol
 * @returns True if token is categorized as meme
 */
export async function isMemeToken(symbol: string): Promise<boolean> {
  const tokenInfo = await getTokenInfo(symbol);
  return tokenInfo?.isMeme || false;
}

/**
 * Check if a token is mainstream
 * @param symbol - Token symbol
 * @returns True if token is mainstream
 */
export function isMainstreamToken(symbol: string): boolean {
  const normalizedSymbol = symbol.toUpperCase();
  return ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC', 'WETH', 'DAI'].includes(normalizedSymbol);
}
