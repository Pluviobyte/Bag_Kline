import { Alchemy, Network, AssetTransfersCategory, SortingOrder } from 'alchemy-sdk';
import { RawEVMHolding } from '@/lib/types';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Initialize Alchemy SDK for Ethereum mainnet
function getAlchemy(): Alchemy {
  return new Alchemy({
    apiKey: ALCHEMY_API_KEY || 'demo', // Use demo key if not configured
    network: Network.ETH_MAINNET,
  });
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
 * Get token holdings for an EVM wallet
 * @param address - EVM wallet address (0x...)
 * @returns Array of token holdings
 */
export async function getEVMHoldings(address: string): Promise<RawEVMHolding[]> {
  const alchemy = getAlchemy();
  const holdings: RawEVMHolding[] = [];

  try {
    // Get native ETH balance
    const ethBalance = await alchemy.core.getBalance(address);
    const ethBalanceNum = parseFloat(ethBalance.toString()) / 1e18;

    if (ethBalanceNum > 0) {
      holdings.push({
        contractAddress: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: ethBalanceNum,
        decimals: 18,
      });
    }

    // Get ERC20 token balances
    const tokenBalances = await alchemy.core.getTokenBalances(address);

    for (const token of tokenBalances.tokenBalances) {
      if (token.tokenBalance === '0x0' || token.tokenBalance === '0') {
        continue;
      }

      try {
        const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);
        const decimals = metadata.decimals || 18;
        const balance = parseInt(token.tokenBalance || '0', 16) / Math.pow(10, decimals);

        if (balance > 0) {
          holdings.push({
            contractAddress: token.contractAddress,
            symbol: metadata.symbol,
            name: metadata.name,
            balance,
            decimals,
          });
        }
      } catch (error) {
        console.warn(`Failed to get metadata for token ${token.contractAddress}:`, error);
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

/**
 * Get transaction history for an EVM wallet (last 30 days)
 * @param address - EVM wallet address (0x...)
 * @returns Array of transfers
 */
export async function getEVMTransactions(address: string): Promise<AlchemyTransfer[]> {
  const alchemy = getAlchemy();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get outgoing transfers
    const outgoingTransfers = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
      ],
      maxCount: 500,
      withMetadata: true,
    });

    // Get incoming transfers
    const incomingTransfers = await alchemy.core.getAssetTransfers({
      toAddress: address,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
      ],
      maxCount: 500,
      withMetadata: true,
    });

    // Combine and filter by date
    const allTransfers = [
      ...outgoingTransfers.transfers,
      ...incomingTransfers.transfers,
    ].filter(tx => {
      const txDate = new Date(tx.metadata.blockTimestamp);
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
 * @param address - EVM wallet address (0x...)
 * @returns Date of first transaction
 */
export async function getEVMFirstTransactionDate(address: string): Promise<Date> {
  const alchemy = getAlchemy();

  try {
    const transfers = await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
      ],
      maxCount: 1000,
      order: SortingOrder.ASCENDING,
      withMetadata: true,
    });

    if (transfers.transfers.length > 0) {
      const oldestTx = transfers.transfers[0];
      return new Date(oldestTx.metadata.blockTimestamp);
    }

    const incomingTransfers = await alchemy.core.getAssetTransfers({
      toAddress: address,
      category: [
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.EXTERNAL,
      ],
      maxCount: 1000,
      order: SortingOrder.ASCENDING,
      withMetadata: true,
    });

    if (incomingTransfers.transfers.length > 0) {
      return new Date(incomingTransfers.transfers[0].metadata.blockTimestamp);
    }

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
  const alchemy = getAlchemy();
  try {
    const balance = await alchemy.core.getBalance(address);
    return parseFloat(balance.toString()) / 1e18;
  } catch {
    return 0;
  }
}
