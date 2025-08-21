'use client';

import { useState } from 'react';
import { ChevronDownIcon, PlusIcon, PlayIcon } from '@heroicons/react/24/outline';

interface TradingPair {
  symbol: string;
  label: string;
}

interface AnalysisResult {
  timestamp: string;
  pair: string;
  timeframe: string;
  result: string;
  status: 'success' | 'error';
  error?: string;
  rawData?: any;
}

const DEFAULT_PAIRS: TradingPair[] = [
  { symbol: 'BTCUSDT', label: 'BTC/USDT' },
  { symbol: 'ETHUSDT', label: 'ETH/USDT' },
  { symbol: 'BCHUSDT', label: 'BCH/USDT' },
  { symbol: 'AAVEUSDT', label: 'AAVE/USDT' },
  { symbol: 'XRPUSDT', label: 'XRP/USDT' },
  { symbol: 'SOLUSDT', label: 'SOL/USDT' },
  { symbol: 'LTCUSDT', label: 'LTC/USDT' },
  { symbol: 'DOTUSDT', label: 'DOT/USDT' },
  { symbol: 'ARBUSDT', label: 'ARB/USDT' },
  { symbol: 'BNBUSDT', label: 'BNB/USDT' },
  { symbol: 'DOGEUSDT', label: 'DOGE/USDT' },
  { symbol: 'TIAUSDT', label: 'TIA/USDT' },
  { symbol: 'DYMUSDT', label: 'DYM/USDT' },
  { symbol: 'SUIUSDT', label: 'SUI/USDT' },
  { symbol: 'ADAUSDT', label: 'ADA/USDT' },
  { symbol: 'ATAUSDT', label: 'ATA/USDT' },
];

const TIMEFRAMES = [
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '2h', label: '2小时' },
  { value: '4h', label: '4小时' },
  { value: '6h', label: '6小时' },
  { value: '8h', label: '8小时' },
  { value: '12h', label: '12小时' },
  { value: '1d', label: '1天' },
];

export default function TradingAnalysis() {
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>(DEFAULT_PAIRS);
  const [selectedPair, setSelectedPair] = useState<string>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [newPairInput, setNewPairInput] = useState<string>('');
  const [showAddPair, setShowAddPair] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [showPairDropdown, setShowPairDropdown] = useState<boolean>(false);
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string>('');

  const addTradingPair = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setInputError('');
    
    const pairSymbol = newPairInput.trim().toUpperCase();
    
    // 验证输入
    if (!pairSymbol) {
      setInputError('请输入交易对');
      return;
    }
    
    // 验证格式（示例：必须以 USDT 结尾）
    if (!pairSymbol.endsWith('USDT')) {
      setInputError('交易对格式不正确，请以 USDT 结尾（例如：BTCUSDT）');
      return;
    }
    
    // 检查是否已存在
    if (tradingPairs.some(p => p.symbol === pairSymbol)) {
      setInputError('该交易对已存在');
      return;
    }
    
    // 添加新交易对
    const newPair = {
      symbol: pairSymbol,
      label: pairSymbol.replace('USDT', '/USDT')
    };
    
    setTradingPairs(prev => [...prev, newPair]);
    setNewPairInput('');
    setShowAddPair(false);
  };

  const executeAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // 调用分析API
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair: selectedPair,
          timeframe: selectedTimeframe,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // 处理API返回的错误
        let errorMessage = data.error || 'API请求失败';
        if (data.message) {
          errorMessage += `: ${data.message}`;
        }
        
        // 如果有日志，添加到错误信息中
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          errorMessage += '\n\n分析日志：\n' + data.logs.join('\n');
        }
        
        // 如果是开发环境，添加堆栈跟踪
        if (process.env.NODE_ENV === 'development' && data.stack) {
          errorMessage += '\n\n堆栈跟踪：\n' + data.stack;
        }
        
        throw new Error(errorMessage);
      }
      
      // 处理成功响应
      const formattedLogs = Array.isArray(data.logs) 
        ? data.logs.join('\n')
        : '分析完成，无详细日志';
      
      const result: AnalysisResult = {
        timestamp: new Date().toLocaleString('zh-CN'),
        pair: selectedPair,
        timeframe: selectedTimeframe,
        result: formattedLogs,
        status: 'success',
        rawData: data
      };
            
      setAnalysisResults(prev => [result, ...prev]);
      return result;
    } catch (error) {
      console.error('分析失败:', error);
      
      let errorMessage = '未知错误';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        if (process.env.NODE_ENV === 'development' && error.stack) {
          errorDetails = '\n\n堆栈跟踪：\n' + error.stack;
        }
      }
      
      const troubleshooting = '\n\n请检查：\n' +
        '1. 后端服务是否正常运行\n' +
        '2. 网络连接是否正常\n' +
        '3. 控制台查看详细错误信息';
      
      const errorResult: AnalysisResult = {
        timestamp: new Date().toLocaleString('zh-CN'),
        pair: selectedPair,
        timeframe: selectedTimeframe,
        result: `分析失败: ${errorMessage}${troubleshooting}${errorDetails}`,
        status: 'error',
        error: errorMessage
      };
      
      setAnalysisResults(prev => [errorResult, ...prev]);
      return errorResult;
      setAnalysisResults(prev => [errorResult, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 relative">
      <div className="max-w-4xl mx-auto relative" style={{ zIndex: 1 }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">交易分析工具</h1>
          <p className="text-blue-200">设置交易对和周期，执行技术分析</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 交易对选择 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white">交易对</label>
              <div className="relative">
                <button
                  onClick={() => setShowPairDropdown(!showPairDropdown)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white text-left flex items-center justify-between hover:bg-white/25 transition-colors"
                >
                  <span>{tradingPairs.find(p => p.symbol === selectedPair)?.label}</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
                
                {showPairDropdown && (
                  <div className="fixed sm:absolute top-auto sm:top-full left-4 right-4 sm:left-0 sm:right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto" style={{ zIndex: 100 }}>
                    {tradingPairs.map((pair) => (
                      <button
                        key={pair.symbol}
                        onClick={() => {
                          setSelectedPair(pair.symbol);
                          setShowPairDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 text-gray-800 border-b border-gray-100 last:border-b-0"
                      >
                        {pair.label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowAddPair(true);
                        setShowPairDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-green-50 text-green-600 flex items-center gap-2 font-medium"
                    >
                      <PlusIcon className="w-4 h-4" />
                      添加新交易对
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 周期选择 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white">时间周期</label>
              <div className="relative">
                <button
                  onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-3 text-white text-left flex items-center justify-between hover:bg-white/25 transition-colors"
                >
                  <span>{TIMEFRAMES.find(t => t.value === selectedTimeframe)?.label}</span>
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
                
                {showTimeframeDropdown && (
                  <div className="fixed sm:absolute top-auto sm:top-full left-4 right-4 sm:left-0 sm:right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto" style={{ zIndex: 100 }}>
                    {TIMEFRAMES.map((timeframe) => (
                      <button
                        key={timeframe.value}
                        onClick={() => {
                          setSelectedTimeframe(timeframe.value);
                          setShowTimeframeDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 text-gray-800 border-b border-gray-100 last:border-b-0"
                      >
                        {timeframe.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 执行按钮 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white">执行分析</label>
              <button
                onClick={executeAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    分析中...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    开始分析
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 添加交易对模态框 */}
        {showAddPair && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">添加新交易对</h3>
              <input
                type="text"
                value={newPairInput}
                onChange={(e) => {
                  setNewPairInput(e.target.value);
                  setInputError('');
                }}
                placeholder="例如: ADAUSDT"
                className={`w-full border ${
                  inputError ? 'border-red-500' : 'border-gray-300'
                } rounded-lg px-4 py-3 mb-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTradingPair(e);
                  }
                }}
              />
              {inputError && (
                <p className="text-red-500 text-sm mb-3">{inputError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={addTradingPair}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setShowAddPair(false);
                    setNewPairInput('');
                    setInputError('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 分析结果 */}
        {analysisResults.length > 0 && (
          <div 
            className="bg-slate-800/80 rounded-2xl p-6 border border-white/20 relative transition-all duration-200"
            style={{ 
              marginTop: showPairDropdown || showTimeframeDropdown ? '12rem' : '1.5rem',
              zIndex: 10
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">分析结果</h2>
              <span className="text-sm text-gray-300">
                共 {analysisResults.length} 条记录
              </span>
            </div>
            <div 
              className="space-y-4 overflow-y-auto"
              style={{
                maxHeight: 'calc(100vh - 300px)',
                minHeight: '100px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.2) transparent',
              }}
            >
              {analysisResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.status === 'success'
                      ? 'bg-green-500/20 border-green-400'
                      : 'bg-red-500/20 border-red-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{result.pair}</span>
                      <span className="text-sm text-blue-200">{result.timeframe}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-300">{result.timestamp}</span>
                  </div>
                  <div className="text-sm text-gray-100 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded overflow-y-auto">
                    {result.result}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}