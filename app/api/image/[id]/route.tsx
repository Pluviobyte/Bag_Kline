import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Get data from query params (for simplicity)
    // In production, fetch from database using id
    const tags = searchParams.get('tags') || '神秘玩家';
    const pnl = searchParams.get('pnl') || '0';
    const roast = searchParams.get('roast') || '币圈一天，人间一年';
    const totalValue = searchParams.get('value') || '0';

    const pnlNum = parseFloat(pnl);
    const isPositive = pnlNum >= 0;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 36,
              color: '#ffd700',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            我的袋子K线 📊
          </div>

          {/* Tags */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: 30,
              textAlign: 'center',
              maxWidth: '80%',
              display: 'flex',
            }}
          >
            {tags}
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: 60,
              marginBottom: 40,
            }}
          >
            {/* Total Value */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 20, color: '#888888', display: 'flex' }}>
                总资产
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: '#00d4ff',
                  display: 'flex',
                }}
              >
                ${parseFloat(totalValue).toLocaleString()}
              </div>
            </div>

            {/* PnL */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 20, color: '#888888', display: 'flex' }}>
                盈亏
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: isPositive ? '#00ff88' : '#ff4444',
                  display: 'flex',
                }}
              >
                {isPositive ? '+' : ''}{pnl}%
              </div>
            </div>
          </div>

          {/* Roast Line */}
          <div
            style={{
              fontSize: 24,
              color: '#aaaaaa',
              fontStyle: 'italic',
              maxWidth: '80%',
              textAlign: 'center',
              padding: '20px 40px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
            }}
          >
            "{roast}"
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 18, color: '#555555', display: 'flex' }}>
              bagkline.xyz · 仅供娱乐
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Image generation error:', error);

    // Return a fallback image on error
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: '#ffffff',
            fontSize: 40,
          }}
        >
          我的袋子K线 📊
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
