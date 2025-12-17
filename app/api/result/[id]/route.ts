import { NextRequest, NextResponse } from 'next/server';
import { getCachedResult } from '@/services/analysis/engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '缺少分析ID', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Try to get cached result
    const result = getCachedResult(id);

    if (!result) {
      return NextResponse.json(
        { error: '分析结果不存在或已过期', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error fetching result:', error);

    return NextResponse.json(
      { error: '获取结果失败', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
