import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BagKline - 我的袋子K线",
  description: "基于链上数据的个性化持仓分析工具，娱乐化呈现你的袋子画像",
  keywords: ["crypto", "wallet", "analysis", "solana", "ethereum", "meme", "portfolio"],
  authors: [{ name: "BagKline" }],
  openGraph: {
    title: "BagKline - 我的袋子K线",
    description: "输入钱包地址，看看你的持仓运势",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "BagKline - 我的袋子K线",
    description: "输入钱包地址，看看你的持仓运势",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        {children}
      </body>
    </html>
  );
}
