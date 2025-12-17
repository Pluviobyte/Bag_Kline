import { RawSolanaHolding } from '@/lib/types';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

interface HeliusTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
  tokenInfo?: {
    symbol?: string;
    name?: string;
    price?: number;
  };
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  fee: number;
  feePayer: string;
  description?: string;
}

/**
 * Get token holdings for a Solana wallet
 * @param address - Solana wallet address
 * @returns Array of token holdings
 */
export async function getSolanaHoldings(address: string): Promise<RawSolanaHolding[]> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  // Use Helius DAS API to get token balances with metadata
  const response = await fetch(`${HELIUS_API_URL}/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Helius API error: ${error}`);
  }

  const data = await response.json();

  // Process tokens
  const holdings: RawSolanaHolding[] = [];

  // Add native SOL balance
  if (data.nativeBalance) {
    holdings.push({
      mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL mint
      symbol: 'SOL',
      amount: data.nativeBalance / 1e9, // Convert lamports to SOL
      decimals: 9,
    });
  }

  // Add token balances
  if (data.tokens && Array.isArray(data.tokens)) {
    for (const token of data.tokens) {
      if (token.amount > 0) {
        holdings.push({
          mint: token.mint,
          symbol: token.tokenInfo?.symbol,
          amount: token.amount / Math.pow(10, token.decimals || 0),
          decimals: token.decimals || 0,
        });
      }
    }
  }

  return holdings;
}

/**
 * Get transaction history for a Solana wallet (last 30 days)
 * @param address - Solana wallet address
 * @returns Array of transactions
 */
export async function getSolanaTransactions(address: string): Promise<HeliusTransaction[]> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  // Use Helius parsed transaction history API
  const response = await fetch(`${HELIUS_API_URL}/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=100`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Helius API error: ${error}`);
  }

  const transactions: HeliusTransaction[] = await response.json();

  // Filter transactions from last 30 days
  return transactions.filter(tx => tx.timestamp >= thirtyDaysAgo);
}

/**
 * Get the first transaction date for a Solana wallet
 * @param address - Solana wallet address
 * @returns Date of first transaction
 */
export async function getSolanaFirstTransactionDate(address: string): Promise<Date> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  try {
    // Get transaction signatures in ascending order (oldest first)
    const rpcResponse = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          address,
          { limit: 1000 } // Get as many as possible to find the oldest
        ]
      })
    });

    const rpcData = await rpcResponse.json();

    if (rpcData.result && rpcData.result.length > 0) {
      // The last item in the array is the oldest transaction
      const oldestTx = rpcData.result[rpcData.result.length - 1];
      if (oldestTx.blockTime) {
        return new Date(oldestTx.blockTime * 1000);
      }
    }

    // If no transactions found, return current date
    return new Date();
  } catch (error) {
    console.error('Error getting first transaction date:', error);
    return new Date();
  }
}

/**
 * Get SOL balance for a wallet
 * @param address - Solana wallet address
 * @returns SOL balance in SOL (not lamports)
 */
export async function getSolBalance(address: string): Promise<number> {
  const rpcResponse = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    })
  });

  const data = await rpcResponse.json();

  if (data.result) {
    return data.result.value / 1e9; // Convert lamports to SOL
  }

  return 0;
}
