import { NextRequest, NextResponse } from 'next/server';
import { analyzeWallet } from '@/services/analysis/engine';
import { detectChainType } from '@/services/chains/detector';

// Simple rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 requests
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimits.get(identifier);

  if (!record || record.resetAt < now) {
    rateLimits.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后重试', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { address } = body;

    // Validate address
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的钱包地址', code: 'INVALID_ADDRESS' },
        { status: 400 }
      );
    }

    const trimmedAddress = address.trim();

    // Detect chain type
    const chain = detectChainType(trimmedAddress);
    if (chain === 'unknown') {
      return NextResponse.json(
        { error: '无法识别的钱包地址格式，请输入Solana或EVM地址', code: 'UNSUPPORTED_CHAIN' },
        { status: 400 }
      );
    }

    // Perform analysis
    const result = await analyzeWallet(trimmedAddress);

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : '分析失败，请稍后重试';

    return NextResponse.json(
      { error: errorMessage, code: 'ANALYSIS_FAILED' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with { address: "..." }' },
    { status: 405 }
  );
}
