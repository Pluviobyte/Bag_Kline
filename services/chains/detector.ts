import { ChainType } from '@/lib/types';

/**
 * Detect the blockchain type from a wallet address
 * @param address - The wallet address to check
 * @returns The detected chain type: 'solana', 'evm', or 'unknown'
 */
export function detectChainType(address: string): ChainType {
  if (!address || typeof address !== 'string') {
    return 'unknown';
  }

  const trimmedAddress = address.trim();

  // Solana address: Base58 encoded, 32-44 characters
  // Excludes 0, O, I, l to avoid ambiguity
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  // EVM address: 0x prefix followed by 40 hexadecimal characters
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  if (evmRegex.test(trimmedAddress)) {
    return 'evm';
  }

  if (solanaRegex.test(trimmedAddress)) {
    return 'solana';
  }

  return 'unknown';
}

/**
 * Validate if an address is valid for any supported chain
 * @param address - The wallet address to validate
 * @returns True if the address is valid
 */
export function isValidAddress(address: string): boolean {
  return detectChainType(address) !== 'unknown';
}

/**
 * Format address for display (shortened)
 * @param address - The full wallet address
 * @param prefixLength - Number of characters to show at start
 * @param suffixLength - Number of characters to show at end
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(
  address: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength + 3) return address;

  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
