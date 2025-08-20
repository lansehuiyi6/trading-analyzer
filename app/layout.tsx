import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Analyzer',
  description: 'Cryptocurrency trading analysis tool',
};

// 静默处理控制台错误 - 生产环境使用
const silenceConsoleErrors = `
  // 保存原始的 console 方法
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // 静默处理错误
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
  
  // 静默处理警告
  console.warn = function() {
    const args = Array.from(arguments);
    const warnString = args.join(' ');
    
    // 忽略钱包相关的警告
    const ignored = ['ethereum', 'MetaMask', 'Web3'];
    
    if (!ignored.some(k => warnString.includes(k))) {
      originalWarn.apply(console, args);
    }
  };
  
  // 捕获未处理的 promise 拒绝
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason || {};
    const errorString = String(error);
    
    // 忽略钱包相关的拒绝
    const ignored = [
      'ethereum', 'MetaMask', 'Web3', 'Cannot redefine property',
      'Cannot set property', 'has only a getter'
    ];
    
    if (ignored.some(k => 
      errorString.includes(k) || 
      (error.message && error.message.includes(k))
    )) {
      event.preventDefault();
    }
  });
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* 添加静默处理脚本 */}
        <script dangerouslySetInnerHTML={{ __html: silenceConsoleErrors }} />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}