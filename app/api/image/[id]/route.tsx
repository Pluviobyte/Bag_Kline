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

    // Get data from query params
    const tags = searchParams.get('tags') || '神秘玩家';
    const pnl = searchParams.get('pnl') || '0';
    const roast = searchParams.get('roast') || '币圈一天，人间一年';
    const totalValue = searchParams.get('value') || '0';
    const chain = (searchParams.get('chain') || 'EVM').toUpperCase();
    const age = searchParams.get('age') || '未知';
    const asset = searchParams.get('asset') || 'N/A';
    const count = searchParams.get('count') || '0';

    const pnlNum = parseFloat(pnl);
    const isPositive = pnlNum >= 0;
    const formattedValue = parseFloat(totalValue).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    // Mobile-friendly vertical format: 1080x1920 (9:16 ratio)
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #e2e8f0 100%)',
            position: 'relative',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          {/* Background Gradient Orbs - Lighter & Subtler */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              left: '-100px',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              right: '-100px',
              width: '700px',
              height: '700px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, transparent 70%)',
              display: 'flex',
            }}
          />

          {/* ===== Section 1: Header ===== */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 70,
              paddingBottom: 30,
            }}
          >
            <div
              style={{
                fontSize: 32,
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontWeight: 'bold',
                marginBottom: 12,
                letterSpacing: '0.1em',
              }}
            >
              📊 BagKline
              <span style={{ 
                fontSize: 18, 
                background: '#334155', 
                color: '#fff', 
                padding: '4px 12px', 
                borderRadius: 8,
                marginLeft: 10,
                letterSpacing: 'normal'
              }}>{chain}</span>
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
                letterSpacing: '-0.02em',
                textShadow: '0 4px 20px rgba(139, 92, 246, 0.15)',
              }}
            >
              链上命格分析
            </div>
          </div>

          {/* ===== Section 2: Hero Tag ===== */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '0 60px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.7)',
                border: '2px solid rgba(203, 213, 225, 0.5)',
                borderRadius: 40,
                padding: '50px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  color: '#64748b',
                  marginBottom: 16,
                  display: 'flex',
                }}
              >
                你的核心画像
              </div>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 'bold',
                  color: '#1e293b',
                  textAlign: 'center',
                  display: 'flex',
                  lineHeight: 1.2,
                  marginBottom: 6,
                }}
              >
                {tags.split('+')[0].trim()}
              </div>
              {tags.includes('+') && (
                 <div
                 style={{
                   fontSize: 36,
                   fontWeight: 'bold',
                   color: '#475569',
                   textAlign: 'center',
                   display: 'flex',
                   marginTop: 6,
                   opacity: 0.9,
                 }}
               >
                 + {tags.split('+').slice(1).join(' + ')}
               </div>
              )}
            </div>
          </div>

          {/* ===== Section 3: Data Grid (2x2) ===== */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              width: '100%',
              padding: '0 60px',
              gap: 20,
              marginBottom: 40,
            }}
          >
            {/* Asset Value */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 470,
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: 24,
                padding: '24px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 20, color: '#64748b', marginBottom: 6, display: 'flex' }}>💰 资产估值</div>
              <div style={{ fontSize: 40, fontWeight: 'bold', color: '#0f172a', display: 'flex' }}>${formattedValue}</div>
            </div>

            {/* PnL Performance */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 470,
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: 24,
                padding: '24px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 20, color: '#64748b', marginBottom: 6, display: 'flex' }}>📈 盈亏表现</div>
              <div style={{ fontSize: 40, fontWeight: 'bold', color: isPositive ? '#16a34a' : '#dc2626', display: 'flex' }}>
                {isPositive ? '+' : ''}{pnl}%
              </div>
            </div>

            {/* Wallet Age */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 470,
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: 24,
                padding: '24px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 20, color: '#64748b', marginBottom: 6, display: 'flex' }}>⏳ 钱包资历</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0f172a', display: 'flex' }}>{age}</div>
            </div>

            {/* Top Holding & Activity */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 470,
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(203, 213, 225, 0.5)',
                borderRadius: 24,
                padding: '24px',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 20, color: '#64748b', marginBottom: 6, display: 'flex' }}>🏆 核心资产</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0f172a', display: 'flex' }}>
                {asset} <span style={{fontSize: 20, color: '#94a3b8', marginLeft: 6, fontWeight: 'normal'}}>({count} tx)</span>
              </div>
            </div>
          </div>

          {/* ===== Section 4: Roast ===== */}
          <div
            style={{
              display: 'flex',
              padding: '0 60px',
              marginBottom: 70,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)',
                border: '2px solid #fde047',
                borderRadius: 30,
                padding: '36px',
                position: 'relative',
              }}
            >
              <div
                 style={{
                   position: 'absolute',
                   top: -30,
                   left: 40,
                   fontSize: 50,
                   display: 'flex',
                 }}
              >
                👀
              </div>
              <div
                style={{
                  fontSize: 30,
                  color: '#854d0e',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  textAlign: 'center',
                  width: '100%',
                  lineHeight: 1.6,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                "{roast}"
              </div>
            </div>
          </div>

          {/* ===== Section 5: Footer & CTA ===== */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#ffffff',
              padding: '60px 40px 80px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginBottom: 30,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                }}
              >
                📊
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0f172a', display: 'flex' }}>bagkline.xyz</div>
                <div style={{ fontSize: 24, color: '#64748b', display: 'flex' }}>长按识别 · 生成你的报告</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: 0.9,
              }}
            >
              <div style={{ fontSize: 20, color: '#94a3b8', display: 'flex' }}>Designed by</div>
              <div style={{ fontSize: 20, color: '#334155', fontWeight: 'bold', display: 'flex' }}>@Pluvio9yte</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920, // Vertical format
        // Use a standard font if available, or rely on system fallback
      }
    );
  } catch (error) {
    console.error('Image generation error:', error);

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
          BagKline 📊
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );
  }
}
