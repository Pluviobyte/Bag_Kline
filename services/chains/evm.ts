import { RawEVMHolding } from '@/lib/types';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

/**
 * Get token holdings for an EVM wallet using direct API calls
 * @param address - EVM wallet address (0x...)
 * @returns Array of token holdings
 */
export async function getEVMHoldings(address: string): Promise<RawEVMHolding[]> {
  const apiKey = ALCHEMY_API_KEY || 'demo';
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  const holdings: RawEVMHolding[] = [];

  try {
    // Get native ETH balance
    const ethResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });

    const ethData = await ethResponse.json();
    if (ethData.result) {
      const ethBalance = parseInt(ethData.result, 16) / 1e18;
      if (ethBalance > 0) {
        holdings.push({
          contractAddress: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          balance: ethBalance,
          decimals: 18,
        });
      }
    }

    // Get ERC20 token balances
    const tokenResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'alchemy_getTokenBalances',
        params: [address],
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.result?.tokenBalances) {
      for (const token of tokenData.result.tokenBalances) {
        if (token.tokenBalance === '0x0' || token.tokenBalance === '0' || token.tokenBalance === '0x') {
          continue;
        }

        try {
          // Get token metadata
          const metadataResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 3,
              method: 'alchemy_getTokenMetadata',
              params: [token.contractAddress],
            }),
          });

          const metadataData = await metadataResponse.json();
          const metadata = metadataData.result;
          const decimals = metadata?.decimals || 18;
          const balance = parseInt(token.tokenBalance || '0', 16) / Math.pow(10, decimals);

          if (balance > 0) {
            holdings.push({
              contractAddress: token.contractAddress,
              symbol: metadata?.symbol || 'UNKNOWN',
              name: metadata?.name || 'Unknown Token',
              balance,
              decimals,
            });
          }
        } catch (error) {
          console.warn(`Failed to get metadata for token ${token.contractAddress}:`, error);
        }
      }
    }

    return holdings;
  } catch (error) {
    console.error('Error fetching EVM holdings:', error);
    // Return just ETH balance using public RPC as fallback
    try {
      const publicRpc = 'https://eth.llamarpc.com';
      const response = await fetch(publicRpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
      });
      const data = await response.json();
      if (data.result) {
        const ethBalance = parseInt(data.result, 16) / 1e18;
        if (ethBalance > 0) {
          holdings.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ethereum',
            balance: ethBalance,
            decimals: 18,
          });
        }
      }
      return holdings;
    } catch {
      throw new Error('无法获取EVM钱包数据，请稍后重试');
    }
  }
}

interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: string;
  metadata: {
    blockTimestamp: string;
  };
}

/**
 * Get transaction history for an EVM wallet (last 30 days)
 * Uses direct API calls for reliability
 * @param address - EVM wallet address (0x...)
 * @returns Array of transfers
 */
export async function getEVMTransactions(address: string): Promise<AlchemyTransfer[]> {
  const apiKey = ALCHEMY_API_KEY || 'demo';
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get outgoing transfers
    const outgoingResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromAddress: address,
          category: ['external', 'erc20'],
          maxCount: '0x1f4', // 500
          withMetadata: true,
        }],
      }),
    });

    const outgoingData = await outgoingResponse.json();

    // Get incoming transfers
    const incomingResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'alchemy_getAssetTransfers',
        params: [{
          toAddress: address,
          category: ['external', 'erc20'],
          maxCount: '0x1f4', // 500
          withMetadata: true,
        }],
      }),
    });

    const incomingData = await incomingResponse.json();

    // Combine transfers
    const allTransfers = [
      ...(outgoingData.result?.transfers || []),
      ...(incomingData.result?.transfers || []),
    ].filter(tx => {
      const txDate = new Date(tx.metadata?.blockTimestamp);
      return txDate >= thirtyDaysAgo;
    });

    // Remove duplicates
    const uniqueTransfers = Array.from(
      new Map(allTransfers.map(tx => [tx.hash, tx])).values()
    );

    return uniqueTransfers as AlchemyTransfer[];
  } catch (error) {
    console.error('Error fetching EVM transactions:', error);
    // Return empty array on error - don't fail the whole analysis
    return [];
  }
}

/**
 * Get the first transaction date for an EVM wallet
 * Uses direct API call for more reliable results
 * @param address - EVM wallet address (0x...)
 * @returns Date of first transaction
 */
export async function getEVMFirstTransactionDate(address: string): Promise<Date> {
  const apiKey = ALCHEMY_API_KEY || 'demo';
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  try {
    // First try outgoing transfers (oldest first)
    const outgoingResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromAddress: address,
          category: ['external', 'erc20'],
          maxCount: '0x1',
          order: 'asc',
          withMetadata: true,
        }],
      }),
    });

    const outgoingData = await outgoingResponse.json();

    if (outgoingData.result?.transfers?.length > 0) {
      const timestamp = outgoingData.result.transfers[0].metadata?.blockTimestamp;
      if (timestamp) {
        console.log('Found first outgoing tx date:', timestamp);
        return new Date(timestamp);
      }
    }

    // Try incoming transfers if no outgoing found
    const incomingResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'alchemy_getAssetTransfers',
        params: [{
          toAddress: address,
          category: ['external', 'erc20'],
          maxCount: '0x1',
          order: 'asc',
          withMetadata: true,
        }],
      }),
    });

    const incomingData = await incomingResponse.json();

    if (incomingData.result?.transfers?.length > 0) {
      const timestamp = incomingData.result.transfers[0].metadata?.blockTimestamp;
      if (timestamp) {
        console.log('Found first incoming tx date:', timestamp);
        return new Date(timestamp);
      }
    }

    console.log('No transactions found for address:', address);
    return new Date();
  } catch (error) {
    console.error('Error getting first transaction date:', error);
    // Return a date 6 months ago as default
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return sixMonthsAgo;
  }
}

/**
 * Get ETH balance for a wallet
 * @param address - EVM wallet address
 * @returns ETH balance
 */
export async function getETHBalance(address: string): Promise<number> {
  const apiKey = ALCHEMY_API_KEY || 'demo';
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });

    const data = await response.json();
    if (data.result) {
      return parseInt(data.result, 16) / 1e18;
    }
    return 0;
  } catch {
    return 0;
  }
}
