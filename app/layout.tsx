import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Analyzer',
  description: 'Cryptocurrency trading analysis tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* 阻止以太坊钱包扩展注入 */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https:;" />
        {/* 防止页面被嵌入到 iframe 中 */}
        <meta httpEquiv="X-Frame-Options" content="DENY" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
