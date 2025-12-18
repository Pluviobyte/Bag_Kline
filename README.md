# 袋子K线 BagKline

> 看看你的袋子有多绿

把钱包地址丢进来，AI帮你算命：

- 🎭 **交易人格画像** - 你是什么币圈物种？鲸鱼、海豚还是虾米？
- 📉 **运势K线图** - 你的运势K线，下一个主升浪什么时候来？
- 🀄 **链上八字命盘** - 2026流年运势抢先看

基于真实链上数据 + 玄学加持，生成专属你的持仓分析报告

⚠️ **仅限链上钱包，CEX用户请先提到链上再来算命**

## 功能特性

### 六维交易画像
- 交易风格：HODLer / 波段选手 / 高频玩家
- 代币偏好：主流派 / 土狗猎人 / 多元玩家
- 资金规模：鲸鱼 / 海豚 / 小鱼 / 虾米
- 盈亏状态：人生赢家 → 深度被套
- 持仓集中度：梭哈战士 / 分散投资
- 钱包年龄：OG / 老韭菜 / 新手

### 运势K线
- 基于历史持仓表现生成K线图
- AI预测未来6个月运势走向
- 标注关键转折点

### 八字命理
- 以首次交易时间为"出生时辰"
- 四柱八字 + 五行分析
- 2026丙午年流年运势
- 持仓代币五行映射

## 支持网络

- Ethereum
- Solana
- BSC
- Polygon
- Arbitrum
- 更多EVM兼容链

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS
- Moralis API / Alchemy API
- Google Gemini AI

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Keys

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 环境变量

```
MORALIS_API_KEY=       # Moralis API Key
ALCHEMY_API_KEY=       # Alchemy API Key
GEMINI_API_KEY=        # Google Gemini API Key
```

## 免责声明

本产品仅分析链上钱包数据，中心化交易所内的资产无法识别。

**纯属娱乐，不构成投资建议，DYOR。**

## License

MIT
