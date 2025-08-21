'use client';

import dynamic from 'next/dynamic';

// Disable SSR for the trading analysis component since it uses browser APIs
const TradingAnalysis = dynamic(
  () => import('./components/TradingAnalysis'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

export default function TradingAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <TradingAnalysis />
      </main>
    </div>
  );
}

 