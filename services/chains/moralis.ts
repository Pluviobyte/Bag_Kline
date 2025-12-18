/**
 * Moralis API integration for DeFi position tracking
 * Free tier: 40,000 CU/day
 * Docs: https://docs.moralis.com/web3-data-api/evm/reference
 */

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_API_BASE = 'https://deep-index.moralis.io/api/v2.2';

interface MoralisToken {
  token_address: string;
  symbol: string;
  name: string;
  logo?: string;
  thumbnail?: string;
  decimals: number;
  balance: string;
  possible_spam: boolean;
  verified_contract?: boolean;
  usd_price?: number;
  usd_price_24hr_percent_change?: number;
  usd_price_24hr_usd_change?: number;
  usd_value?: number;
  portfolio_percentage?: number;
  native_token?: boolean;
}

interface MoralisNetWorth {
  total_networth_usd: string;
  chains: Array<{
    chain: string;
    native_balance: string;
    native_balance_formatted: string;
    native_balance_usd: string;
    token_balance_usd: string;
    networth_usd: string;
  }>;
}

interface MoralisDeFiPosition {
  protocol_name: string;
  protocol_id: string;
  protocol_url?: string;
  protocol_logo?: string;
  position: {
    label: string;
    tokens: Array<{
      token_type: string;
      name: string;
      symbol: string;
      contract_address: string;
      decimals: number;
      logo?: string;
      usd_price?: number;
      balance: string;
      balance_formatted: string;
      usd_value?: number;
    }>;
    address: string;
    balance_usd?: number;
    total_unclaimed_usd_value?: number;
  };
}

interface MoralisDeFiSummary {
  active_protocols: number;
  total_positions: number;
  total_usd_value: number;
  protocols: Array<{
    protocol_name: string;
    protocol_id: string;
    total_usd_value: number;
    positions: number;
  }>;
}

export interface MoralisHolding {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  valueUsd: number;
  chain: string;
  isProtocolToken: boolean;
  protocolName?: string;
  logoUrl?: string;
  contractAddress?: string;
}

export interface MoralisWalletData {
  totalValueUsd: number;
  holdings: MoralisHolding[];
  defiSummary?: {
    totalDefiValue: number;
    activeProtocols: number;
    positions: number;
  };
}

/**
 * Check if Moralis API is configured
 */
export function isMoralisConfigured(): boolean {
  return !!MORALIS_API_KEY;
}

/**
 * Make authenticated request to Moralis API
 */
async function moralisFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!MORALIS_API_KEY) {
    throw new Error('MORALIS_API_KEY is not configured');
  }

  const queryString = new URLSearchParams(params).toString();
  const url = `${MORALIS_API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-API-Key': MORALIS_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Moralis API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get wallet net worth across all chains
 */
export async function getNetWorth(address: string): Promise<MoralisNetWorth> {
  return moralisFetch<MoralisNetWorth>(`/wallets/${address}/net-worth`, {
    exclude_spam: 'true',
    exclude_unverified_contracts: 'true',
  });
}

/**
 * Get token balances with prices for a wallet
 */
export async function getTokenBalances(address: string, chain: string = 'eth'): Promise<MoralisToken[]> {
  const result = await moralisFetch<MoralisToken[]>(`/${address}/erc20`, {
    chain,
    exclude_spam: 'true',
  });
  return result;
}

/**
 * Get all tokens with prices (including native token)
 */
export async function getWalletTokensWithPrices(address: string, chain: string = 'eth'): Promise<MoralisToken[]> {
  const result = await moralisFetch<{ result: MoralisToken[] }>(`/wallets/${address}/tokens`, {
    chain,
    exclude_spam: 'true',
    exclude_unverified_contracts: 'false',
  });
  return result.result || [];
}

/**
 * Get DeFi positions summary
 */
export async function getDeFiSummary(address: string): Promise<MoralisDeFiSummary> {
  return moralisFetch<MoralisDeFiSummary>(`/wallets/${address}/defi/summary`);
}

/**
 * Get detailed DeFi positions
 */
export async function getDeFiPositions(address: string): Promise<MoralisDeFiPosition[]> {
  // Moralis returns array directly, not wrapped in {result: [...]}
  const result = await moralisFetch<MoralisDeFiPosition[]>(`/wallets/${address}/defi/positions`);
  return Array.isArray(result) ? result : [];
}

/**
 * Get comprehensive wallet data including tokens and DeFi positions
 */
export async function getWalletData(address: string): Promise<MoralisWalletData> {
  try {
    // Fetch token balances and DeFi positions in parallel
    const [tokens, defiPositions, netWorth] = await Promise.all([
      getWalletTokensWithPrices(address, 'eth').catch(() => []),
      getDeFiPositions(address).catch(() => []),
      getNetWorth(address).catch(() => null),
    ]);

    const holdings: MoralisHolding[] = [];

    // Process regular tokens
    for (const token of tokens) {
      if (token.possible_spam) continue;

      const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);
      const price = token.usd_price || 0;
      const valueUsd = token.usd_value || (balance * price);

      if (valueUsd >= 0.01) { // Skip dust
        holdings.push({
          symbol: token.symbol,
          name: token.name,
          amount: balance,
          price,
          valueUsd,
          chain: 'eth',
          isProtocolToken: false,
          logoUrl: token.logo || token.thumbnail,
          contractAddress: token.token_address,
        });
      }
    }

    // Process DeFi positions
    let totalDefiAssets = 0;
    let totalDefiDebt = 0;
    let activeProtocols = 0;
    let positionCount = 0;

    for (const position of defiPositions) {
      activeProtocols++;
      const isDebtPosition = position.position.label?.toLowerCase().includes('borrow') ||
                            position.position.label?.toLowerCase().includes('debt');

      // Get the main token (defi-token or supplied/borrowed)
      for (const token of position.position.tokens) {
        // Skip duplicate entries - only process defi-token or supplied type
        // (Moralis returns both the receipt token and underlying token)
        if (token.token_type === 'borrowed' || token.token_type === 'supplied') {
          continue; // Skip underlying tokens, use defi-token values
        }

        const balance = parseFloat(token.balance_formatted || '0');
        const price = token.usd_price || 0;
        const valueUsd = token.usd_value || (balance * price);

        if (valueUsd >= 0.01) {
          positionCount++;

          if (isDebtPosition) {
            // Debt position - track but don't add to holdings as positive value
            totalDefiDebt += valueUsd;
            holdings.push({
              symbol: token.symbol,
              name: `${token.name} (借款)`,
              amount: balance,
              price,
              valueUsd: -valueUsd, // Negative to indicate debt
              chain: 'eth',
              isProtocolToken: true,
              protocolName: position.protocol_name,
              logoUrl: token.logo,
              contractAddress: token.contract_address,
            });
          } else {
            // Supply/collateral position
            totalDefiAssets += valueUsd;
            holdings.push({
              symbol: token.symbol,
              name: token.name,
              amount: balance,
              price,
              valueUsd,
              chain: 'eth',
              isProtocolToken: true,
              protocolName: position.protocol_name,
              logoUrl: token.logo,
              contractAddress: token.contract_address,
            });
          }
        }
      }
    }

    // Sort by absolute value descending (debts show as large negative values)
    holdings.sort((a, b) => Math.abs(b.valueUsd) - Math.abs(a.valueUsd));

    // Calculate total value (assets - debts)
    const totalTokenValue = holdings.filter(h => h.valueUsd > 0).reduce((sum, h) => sum + h.valueUsd, 0);
    const calculatedTotal = totalTokenValue - totalDefiDebt;

    // Use netWorth only if no DeFi positions found (netWorth doesn't include DeFi)
    let totalValueUsd = calculatedTotal;
    if (netWorth && totalDefiAssets === 0) {
      const moralisNetWorth = parseFloat(netWorth.total_networth_usd);
      if (moralisNetWorth > totalValueUsd) {
        totalValueUsd = moralisNetWorth;
      }
    }

    return {
      totalValueUsd,
      holdings,
      defiSummary: {
        totalDefiValue: totalDefiAssets - totalDefiDebt,
        activeProtocols,
        positions: positionCount,
      },
    };
  } catch (error) {
    console.error('Error fetching Moralis wallet data:', error);
    throw error;
  }
}

/**
 * Get Ethereum-specific wallet data
 */
export async function getEthWalletData(address: string): Promise<MoralisWalletData> {
  return getWalletData(address);
}
