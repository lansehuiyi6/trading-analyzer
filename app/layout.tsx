import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Analyzer',
  description: 'Cryptocurrency trading analysis tool',
};

// 静默处理控制台错误
const silenceConsoleErrors = `
  // 保存原始的 console.error
  const originalConsoleError = console.error;
  
  // 重写 console.error 以静默处理钱包相关的错误
  console.error = function() {
    const args = Array.from(arguments);
    const errorString = args.map(arg => String(arg)).join(' ');
    
    // 忽略特定的钱包错误
    const ignoredErrors = [
      'ethereum',
      'MetaMask',
      'VeChain',
      'Tron',
      'Phantom',
      'Web3',
      'evmAsk',
      'inpage.js',
      'content-scripts',
      'Cannot redefine property',
      'Cannot set property',
      'has only a getter'
    ];
    
    // 如果错误信息中包含任何忽略的关键词，则静默处理
    const shouldIgnore = ignoredErrors.some(keyword => errorString.includes(keyword));
    
    if (!shouldIgnore) {
      originalConsoleError.apply(console, args);
    }
  };
  
  // 捕获未处理的 promise 拒绝
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason || {};
    const errorString = String(error);
    
    // 忽略特定的钱包错误
    const ignoredRejections = [
      'ethereum',
      'MetaMask',
      'VeChain',
      'Tron',
      'Phantom',
      'Web3',
      'evmAsk',
      'inpage.js',
      'content-scripts',
      'Cannot redefine property',
      'Cannot set property',
      'has only a getter'
    ];
    
    // 如果拒绝信息中包含任何忽略的关键词，则阻止默认行为
    const shouldIgnore = ignoredRejections.some(keyword => 
      errorString.includes(keyword) || 
      (error.message && error.message.includes(keyword))
    );
    
    if (shouldIgnore) {
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
        
        {/* 简化 CSP 策略 */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self' https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https:;" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
