import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Analyzer',
  description: 'Cryptocurrency trading analysis tool',
};

// 阻止钱包扩展注入的脚本
const blockWalletScript = `
  // 阻止 ethereum 对象被修改
  Object.defineProperty(window, 'ethereum', {
    configurable: false,
    writable: false,
    value: undefined
  });
  
  // 阻止 Web3 注入
  Object.defineProperty(window, 'web3', {
    configurable: false,
    writable: false,
    value: undefined
  });
  
  // 阻止常见的钱包注入
  const blockedProperties = [
    'ethereum',
    'web3',
    'solana',
    'phantom',
    'vechain',
    'tronWeb',
    'tronLink',
    'coinbaseWalletExtension',
    'bitkeep'
  ];
  
  blockedProperties.forEach(prop => {
    if (!(prop in window)) {
      Object.defineProperty(window, prop, {
        configurable: false,
        get: () => undefined,
        set: () => {}
      });
    }
  });
  
  // 阻止动态脚本注入
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'script') {
      Object.defineProperty(element, 'src', {
        set: function() {
          // 阻止钱包相关的脚本加载
          const src = arguments[0] || '';
          if (src.includes('metamask') || 
              src.includes('ethereum') || 
              src.includes('web3') ||
              src.includes('vechain') ||
              src.includes('tron') ||
              src.includes('phantom') ||
              src.includes('coinbase') ||
              src.includes('bitkeep')) {
            return '';
          }
          return this.setAttribute('src', src);
        },
        get: function() {
          return this.getAttribute('src');
        }
      });
    }
    return element;
  };
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 使用更严格的 CSP 策略 */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https:; frame-ancestors 'none';" />
        
        {/* 内联脚本，在页面加载前执行 */}
        <Script 
          id="block-wallets"
          dangerouslySetInnerHTML={{ __html: blockWalletScript }}
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
