import { NextRequest, NextResponse } from 'next/server';
import { createWebhookHandler } from '@/bot/telegram';

let webhookHandler: ReturnType<typeof createWebhookHandler> | null = null;

function getWebhookHandler() {
  if (!webhookHandler) {
    webhookHandler = createWebhookHandler();
  }
  return webhookHandler;
}

export async function POST(request: NextRequest) {
  try {
    const handler = getWebhookHandler();
    return await handler(request);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Telegram webhook endpoint is active'
  });
}
