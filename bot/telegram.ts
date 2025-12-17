import { Bot, Context, webhookCallback } from 'grammy';
import { analyzeWallet } from '@/services/analysis/engine';
import { detectChainType } from '@/services/chains/detector';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bagkline.xyz';

// Dimension label mapping for Telegram
const dimensionLabels: Record<string, Record<string, string>> = {
  tradingStyle: {
    hodler: 'HODLer 🏔️',
    swing: '波段选手 🌊',
    frequent: '高频玩家 🎰',
  },
  tokenPreference: {
    mainstream: '主流派 🏛️',
    meme: '土狗猎人 🐕',
    diversified: '多元玩家 🎨',
  },
  portfolioSize: {
    whale: '鲸鱼 🐋',
    dolphin: '海豚 🐬',
    fish: '小鱼 🐟',
    shrimp: '虾米 🦐',
  },
  pnlStatus: {
    winner: '人生赢家 👑',
    profit: '小有盈余 😊',
    breakeven: '原地踏步 😐',
    loss: '浮亏中 😰',
    rekt: '深度被套 😭',
  },
  concentration: {
    yolo: '梭哈战士 🚀',
    heavy: '重仓玩家 💰',
    diversified: '分散投资 🎯',
  },
  walletAge: {
    og: 'OG玩家 🏆',
    veteran: '老韭菜 🌿',
    newbie: '新手上路 🐣',
  },
};

function getLabel(dimension: string, key: string): string {
  return dimensionLabels[dimension]?.[key] || key;
}

let bot: Bot | null = null;

function getBot(): Bot {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  if (!bot) {
    bot = new Bot(TELEGRAM_BOT_TOKEN);
    setupCommands(bot);
  }
  return bot;
}

function setupCommands(bot: Bot): void {
  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '👋 欢迎使用袋子K线 Bot!\n\n' +
      '📊 发送钱包地址，我来分析你的持仓运势。\n\n' +
      '支持链:\n' +
      '• Solana\n' +
      '• Ethereum / BSC / Polygon 等 EVM 链\n\n' +
      '命令:\n' +
      '/analyze <地址> - 分析钱包\n' +
      '/help - 获取帮助\n\n' +
      '或者直接发送钱包地址即可开始分析!'
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📖 使用说明\n\n' +
      '1️⃣ 直接发送钱包地址\n' +
      '2️⃣ 或使用 /analyze <地址>\n\n' +
      '示例:\n' +
      '• Solana: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n' +
      '• EVM: 0x1234567890abcdef1234567890abcdef12345678\n\n' +
      '分析内容:\n' +
      '• 六维画像 (交易风格、代币偏好等)\n' +
      '• 持仓资产分析\n' +
      '• AI生成趣味描述\n\n' +
      '⚠️ 仅供娱乐，不构成投资建议'
    );
  });

  // /analyze command
  bot.command('analyze', async (ctx) => {
    const address = ctx.match?.trim();

    if (!address) {
      await ctx.reply(
        '❌ 请提供钱包地址\n\n' +
        '用法: /analyze <地址>\n' +
        '例如: /analyze 0x1234...5678'
      );
      return;
    }

    await handleAnalyze(ctx, address);
  });

  // Direct text messages (potential addresses)
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();

    // Skip if it's a command
    if (text.startsWith('/')) return;

    // Check if it looks like an address
    if (detectChainType(text) !== 'unknown') {
      await handleAnalyze(ctx, text);
    } else {
      await ctx.reply(
        '❓ 无法识别地址格式\n\n' +
        '请发送有效的钱包地址:\n' +
        '• Solana 地址 (32-44字符)\n' +
        '• EVM 地址 (0x开头，42字符)\n\n' +
        '输入 /help 获取更多帮助'
      );
    }
  });
}

async function handleAnalyze(ctx: Context, address: string): Promise<void> {
  const chain = detectChainType(address);

  if (chain === 'unknown') {
    await ctx.reply('❌ 无法识别的地址格式，请检查后重试');
    return;
  }

  // Send processing message
  const processingMsg = await ctx.reply(
    `🔍 正在分析 ${chain.toUpperCase()} 钱包...\n` +
    '请稍候，这可能需要几秒钟...'
  );

  try {
    const result = await analyzeWallet(address);

    const pnlSign = result.pnl.totalPnlPercent >= 0 ? '+' : '';
    const pnlEmoji = result.pnl.totalPnlPercent >= 0 ? '📈' : '📉';

    const message = `
🎯 *分析完成!*

📊 *你的袋子画像:*
${result.personality.tags.join(' + ')}

💰 *资产规模:* $${result.portfolio.totalValueUsd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
${pnlEmoji} *盈亏:* ${pnlSign}${result.pnl.totalPnlPercent.toFixed(2)}%

🎭 *六维分析:*
• 交易风格: ${getLabel('tradingStyle', result.personality.tradingStyle)}
• 代币偏好: ${getLabel('tokenPreference', result.personality.tokenPreference)}
• 资金规模: ${getLabel('portfolioSize', result.personality.portfolioSize)}
• 盈亏状态: ${getLabel('pnlStatus', result.personality.pnlStatus)}
• 持仓集中度: ${getLabel('concentration', result.personality.concentration)}
• 钱包年龄: ${getLabel('walletAge', result.personality.walletAge)}

💬 _"${result.aiContent.roastLine}"_

—————————
🔗 [查看完整报告](${APP_URL}/analyze/${result.id})

⚠️ _仅供娱乐，不构成投资建议_
`;

    // Delete processing message
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
    } catch {
      // Ignore delete errors
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });

  } catch (error: unknown) {
    console.error('Telegram analysis error:', error);

    // Delete processing message
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
    } catch {
      // Ignore delete errors
    }

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    await ctx.reply(
      `❌ 分析失败\n\n` +
      `错误: ${errorMessage}\n\n` +
      `请稍后重试或检查地址是否正确`
    );
  }
}

// Export webhook handler for Next.js API route
export function createWebhookHandler() {
  const botInstance = getBot();
  return webhookCallback(botInstance, 'std/http');
}

// Export bot instance for direct use
export { getBot };
