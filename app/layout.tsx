import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

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
        {/* 使用 next/script 的 beforeInteractive 策略 */}
        <Script
          id="block-wallet-extensions"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // 在页面加载前定义 ethereum 对象
              if (typeof window !== 'undefined' && !window.ethereum) {
                Object.defineProperty(window, 'ethereum', {
                  configurable: false,
                  writable: false,
                  value: undefined
                });
              }

              // 静默处理控制台错误
              const originalError = console.error;
              console.error = function() {
                const args = Array.from(arguments);
                const errorString = args.join(' ');
                
                // 忽略钱包相关的错误
                const ignored = [
                  'ethereum', 'MetaMask', 'VeChain', 'Tron', 'Phantom', 'Web3',
                  'evmAsk', 'inpage.js', 'content-scripts', 'Cannot redefine property',
                  'Cannot set property', 'has only a getter', 'ethereum#initialization'
                ];
                
                if (!ignored.some(k => errorString.includes(k))) {
                  originalError.apply(console, args);
                }
              };
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}