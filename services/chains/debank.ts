/**
 * DeBank API integration for DeFi position tracking
 * Provides accurate total balance and token holdings including DeFi protocols
 */

const DEBANK_API_KEY = process.env.DEBANK_API_KEY;
const DEBANK_API_BASE = 'https://pro-openapi.debank.com';

interface DeBankToken {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  display_symbol?: string;
  optimized_symbol?: string;
  decimals: number;
  logo_url?: string;
  is_verified: boolean;
  is_core: boolean;
  price: number;
  amount: number;
  raw_amount: number;
  raw_amount_hex_str?: string;
}

interface DeBankTotalBalance {
  total_usd_value: number;
  chain_list: Array<{
    id: string;
    community_id: number;
    name: string;
    logo_url: string;
    usd_value: number;
  }>;
}

interface DeBankProtocolPosition {
  id: string;
  chain: string;
  name: string;
  site_url: string;
  logo_url: string;
  has_supported_portfolio: boolean;
  tvl: number;
  portfolio_item_list: Array<{
    name: string;
    detail_types: string[];
    detail: {
      supply_token_list?: DeBankToken[];
      borrow_token_list?: DeBankToken[];
      reward_token_list?: DeBankToken[];
    };
    stats: {
      asset_usd_value: number;
      debt_usd_value: number;
      net_usd_value: number;
    };
  }>;
}

export interface DeBankHolding {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  valueUsd: number;
  chain: string;
  isProtocolToken: boolean;
  protocolName?: string;
  logoUrl?: string;
}

export interface DeBankWalletData {
  totalValueUsd: number;
  holdings: DeBankHolding[];
  protocols: Array<{
    name: string;
    netValue: number;
    assetValue: number;
    debtValue: number;
  }>;
}

/**
 * Check if DeBank API is configured
 */
export function isDeBankConfigured(): boolean {
  return !!DEBANK_API_KEY;
}

/**
 * Make authenticated request to DeBank API
 */
async function deBankFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!DEBANK_API_KEY) {
    throw new Error('DEBANK_API_KEY is not configured');
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${DEBANK_API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'AccessKey': DEBANK_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`DeBank API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get total balance for a wallet across all chains
 */
export async function getTotalBalance(address: string): Promise<DeBankTotalBalance> {
  return deBankFetch<DeBankTotalBalance>('/v1/user/total_balance', { id: address });
}

/**
 * Get all tokens for a wallet on a specific chain
 */
export async function getTokenList(address: string, chainId: string = 'eth'): Promise<DeBankToken[]> {
  return deBankFetch<DeBankToken[]>('/v1/user/token_list', {
    id: address,
    chain_id: chainId,
    is_all: 'true',
  });
}

/**
 * Get all tokens across all chains
 */
export async function getAllTokens(address: string): Promise<DeBankToken[]> {
  return deBankFetch<DeBankToken[]>('/v1/user/all_token_list', { id: address });
}

/**
 * Get all DeFi protocol positions
 */
export async function getProtocolPositions(address: string): Promise<DeBankProtocolPosition[]> {
  return deBankFetch<DeBankProtocolPosition[]>('/v1/user/all_complex_protocol_list', {
    id: address,
  });
}

/**
 * Get comprehensive wallet data including tokens and DeFi positions
 */
export async function getWalletData(address: string): Promise<DeBankWalletData> {
  try {
    // Fetch all data in parallel
    const [totalBalance, tokens, protocols] = await Promise.all([
      getTotalBalance(address),
      getAllTokens(address),
      getProtocolPositions(address),
    ]);

    const holdings: DeBankHolding[] = [];

    // Process regular tokens
    for (const token of tokens) {
      if (token.amount > 0 && token.price > 0) {
        holdings.push({
          symbol: token.optimized_symbol || token.display_symbol || token.symbol,
          name: token.name,
          amount: token.amount,
          price: token.price,
          valueUsd: token.amount * token.price,
          chain: token.chain,
          isProtocolToken: false,
          logoUrl: token.logo_url,
        });
      }
    }

    // Process protocol positions (DeFi)
    const protocolSummaries: Array<{
      name: string;
      netValue: number;
      assetValue: number;
      debtValue: number;
    }> = [];

    for (const protocol of protocols) {
      let totalAsset = 0;
      let totalDebt = 0;

      for (const item of protocol.portfolio_item_list) {
        totalAsset += item.stats.asset_usd_value || 0;
        totalDebt += item.stats.debt_usd_value || 0;

        // Add supply tokens as holdings
        if (item.detail.supply_token_list) {
          for (const token of item.detail.supply_token_list) {
            if (token.amount > 0) {
              holdings.push({
                symbol: token.optimized_symbol || token.display_symbol || token.symbol,
                name: token.name,
                amount: token.amount,
                price: token.price,
                valueUsd: token.amount * token.price,
                chain: token.chain,
                isProtocolToken: true,
                protocolName: protocol.name,
                logoUrl: token.logo_url,
              });
            }
          }
        }
      }

      if (totalAsset > 0 || totalDebt > 0) {
        protocolSummaries.push({
          name: protocol.name,
          netValue: totalAsset - totalDebt,
          assetValue: totalAsset,
          debtValue: totalDebt,
        });
      }
    }

    // Sort holdings by value
    holdings.sort((a, b) => b.valueUsd - a.valueUsd);

    return {
      totalValueUsd: totalBalance.total_usd_value,
      holdings,
      protocols: protocolSummaries,
    };
  } catch (error) {
    console.error('Error fetching DeBank wallet data:', error);
    throw error;
  }
}

/**
 * Get Ethereum-only wallet data
 */
export async function getEthWalletData(address: string): Promise<DeBankWalletData> {
  try {
    const [tokens, protocols] = await Promise.all([
      getTokenList(address, 'eth'),
      getProtocolPositions(address),
    ]);

    // Filter protocols to ETH chain only
    const ethProtocols = protocols.filter(p => p.chain === 'eth');

    const holdings: DeBankHolding[] = [];
    let totalValue = 0;

    // Process tokens
    for (const token of tokens) {
      if (token.amount > 0) {
        const valueUsd = token.amount * token.price;
        totalValue += valueUsd;
        holdings.push({
          symbol: token.optimized_symbol || token.display_symbol || token.symbol,
          name: token.name,
          amount: token.amount,
          price: token.price,
          valueUsd,
          chain: 'eth',
          isProtocolToken: false,
          logoUrl: token.logo_url,
        });
      }
    }

    // Process DeFi positions
    const protocolSummaries: Array<{
      name: string;
      netValue: number;
      assetValue: number;
      debtValue: number;
    }> = [];

    for (const protocol of ethProtocols) {
      let totalAsset = 0;
      let totalDebt = 0;

      for (const item of protocol.portfolio_item_list) {
        totalAsset += item.stats.asset_usd_value || 0;
        totalDebt += item.stats.debt_usd_value || 0;

        if (item.detail.supply_token_list) {
          for (const token of item.detail.supply_token_list) {
            if (token.amount > 0) {
              const valueUsd = token.amount * token.price;
              totalValue += valueUsd;
              holdings.push({
                symbol: token.optimized_symbol || token.display_symbol || token.symbol,
                name: token.name,
                amount: token.amount,
                price: token.price,
                valueUsd,
                chain: 'eth',
                isProtocolToken: true,
                protocolName: protocol.name,
                logoUrl: token.logo_url,
              });
            }
          }
        }
      }

      if (totalAsset > 0 || totalDebt > 0) {
        protocolSummaries.push({
          name: protocol.name,
          netValue: totalAsset - totalDebt,
          assetValue: totalAsset,
          debtValue: totalDebt,
        });
      }
    }

    holdings.sort((a, b) => b.valueUsd - a.valueUsd);

    return {
      totalValueUsd: totalValue,
      holdings,
      protocols: protocolSummaries,
    };
  } catch (error) {
    console.error('Error fetching ETH wallet data from DeBank:', error);
    throw error;
  }
}
