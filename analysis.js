// 这是一个基于用户提供的AI分析报告逻辑编写的Node.js脚本
// 它用于获取BTCUSDT永续合约的15分钟K线数据，并进行技术分析，生成一份报告
// 依赖：axios (用于API调用), technicalindicators (用于技术指标计算)

// 首先，确保你已经安装了这些包
// 在终端运行: npm install axios technicalindicators

const pair = process.argv[2];
const timeframe = process.argv[3];

if (!pair || !timeframe) {
  console.error('使用方法: node analysis.js <交易对> <时间周期>');
//   process.exit(1);
}

// const axios = require('axios').default;
// const technicalindicators = require('technicalindicators');

import axios from 'axios';
import * as technicalindicators from 'technicalindicators';

// 定义常量和配置
const BINANCE_KLINE_API_URL = 'https://fapi.binance.com/fapi/v1/klines'; // 期货API，用于合约交易
const BINANCE_FUNDING_RATE_API_URL = 'https://fapi.binance.com/fapi/v1/premiumIndex';
const LIMIT = 200; // 获取最近200根K线数据，以保证指标计算准确性

// 用于手动计算枢轴点 (Pivot Points)
function calculatePivotPoints(high, low, close) {
    const pp = (high + low + close) / 3;
    const r1 = 2 * pp - low;
    const s1 = 2 * pp - high;
    const r2 = pp + (high - low);
    const s2 = pp - (high - low);
    const r3 = r1 + (high - low);
    const s3 = s1 - (high - low);
    return { pp, r1, s1, r2, s2, r3, s3 };
}

// 新增：斐波那契回调位计算
// 动态根据趋势判断计算方向
function calculateFibonacciLevels(klines) {
    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const recentHigh = Math.max(...highs);
    const recentLow = Math.min(...lows);
    const lastClose = parseFloat(klines[klines.length - 1][4]);
    const prevClose = parseFloat(klines[klines.length - 2][4]);
    const isUptrend = lastClose > prevClose; // 简化判断，实际可基于均线

    let diff;
    let base;
    let fibLevels = {};

    if (isUptrend) {
        // 上涨趋势：从低点到高点，回调位是支撑
        diff = recentHigh - recentLow;
        base = recentLow;
        fibLevels = {
            '23.6%': base + (diff * 0.236),
            '38.2%': base + (diff * 0.382),
            '50%': base + (diff * 0.5),
            '61.8%': base + (diff * 0.618),
            '78.6%': base + (diff * 0.786),
        };
    } else {
        // 下跌趋势：从高点到低点，反弹位是阻力
        diff = recentHigh - recentLow;
        base = recentHigh;
        fibLevels = {
            '23.6%': base - (diff * 0.236),
            '38.2%': base - (diff * 0.382),
            '50%': base - (diff * 0.5),
            '61.8%': base - (diff * 0.618),
            '78.6%': base - (diff * 0.786),
        };
    }

    return fibLevels;
}

// 动态分析K线形态，这是对单根K线的简单分析
function analyzeCandle(open, close, high, low) {
    const bodySize = Math.abs(close - open);
    const totalRange = high - low;
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;

    if (bodySize / totalRange < 0.2) {
        return {
            text: '十字星或实体较小，市场方向不明，多空双方胶着。',
            score: 0
        };
    }

    // 多头信号
    if (close > open) {
        if (lowerShadow > upperShadow * 2 && lowerShadow / totalRange > 0.4) {
            return {
                text: '出现长下影线，显示下方买盘支撑强劲，多头有反攻意愿。',
                score: 1
            };
        }
        if (bodySize / totalRange > 0.7) {
            return {
                text: '大阳线，多头强势，看涨动能强劲。',
                score: 1
            };
        }
    }
    
    // 空头信号
    if (close < open) {
        if (upperShadow > lowerShadow * 2 && upperShadow / totalRange > 0.4) {
            return {
                text: '出现长上影线，显示上方卖压沉重，多头乏力。',
                score: -1
            };
        }
        if (bodySize / totalRange > 0.7) {
            return {
                text: '大阴线，空头强势，看跌动能强劲。',
                score: -1
            };
        }
    }

    return {
        text: '常规K线，无明显形态信号。',
        score: 0
    };
}

// ==========================================================
// 完整的看涨和看跌K线形态判断函数
// ==========================================================

// 看涨形态
function isBullishEngulfing(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    return (prevClose < prevOpen) && (currClose > currOpen) && (currOpen <= prevClose) && (currClose >= prevOpen);
}

function isDownsideTasukiGap(open, close, high, low) {
    if (open.length < 3) return false;
    const firstClose = close[close.length - 3];
    const firstOpen = open[open.length - 3];
    const secondClose = close[close.length - 2];
    const secondOpen = open[open.length - 2];
    const thirdClose = close[close.length - 1];
    const thirdOpen = open[open.length - 1];
    return (firstClose < firstOpen) && (secondClose < secondOpen) && (secondOpen < firstClose) && (thirdClose > thirdOpen) && (thirdOpen > secondClose) && (thirdClose < firstOpen);
}

function isBullishHarami(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    return (prevClose < prevOpen) && (currClose > currOpen) && (currOpen >= prevClose) && (currClose <= prevOpen);
}

function isBullishHaramiCross(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    const bodySize = Math.abs(currClose - currOpen);
    return (prevClose < prevOpen) && (bodySize < Math.abs(prevClose - prevOpen) * 0.1) && (currOpen >= prevClose) && (currClose <= prevOpen);
}

function isMorningStar(open, close) {
    if (open.length < 3) return false;
    const firstClose = close[close.length - 3];
    const firstOpen = open[open.length - 3];
    const secondClose = close[close.length - 2];
    const secondOpen = open[open.length - 2];
    const thirdClose = close[close.length - 1];
    const thirdOpen = open[open.length - 1];
    return (firstClose < firstOpen) && (secondClose < secondOpen) && (secondClose < firstClose) && (thirdClose > thirdOpen) && (thirdClose > (firstOpen + firstClose) / 2);
}

function isMorningDojiStar(open, close, low) {
    if (open.length < 3) return false;
    const firstClose = close[close.length - 3];
    const firstOpen = open[open.length - 3];
    const secondClose = close[close.length - 2];
    const secondOpen = open[open.length - 2];
    const thirdClose = close[close.length - 1];
    const thirdOpen = open[open.length - 1];
    const secondBodySize = Math.abs(secondClose - secondOpen);
    return (firstClose < firstOpen) && (secondBodySize / (secondOpen + secondClose) < 0.001) && (secondClose < low[low.length - 3]) && (thirdClose > thirdOpen) && (thirdClose > (firstOpen + firstClose) / 2);
}

function isBullishMarubozu(open, close, high, low) {
    const bodySize = close - open;
    const upperShadow = high - close;
    const lowerShadow = open - low;
    const totalRange = high - low;
    return (close > open) && (bodySize / totalRange > 0.9) && (upperShadow < bodySize * 0.1) && (lowerShadow < bodySize * 0.1);
}

function isPiercingLine(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    return (prevClose < prevOpen) && (currClose > currOpen) && (currOpen < prevClose) && (currClose > (prevOpen + prevClose) / 2) && (currClose < prevOpen);
}

function isThreeWhiteSoldiers(open, close) {
    if (open.length < 3) return false;
    const first = { open: open[open.length - 3], close: close[close.length - 3] };
    const second = { open: open[open.length - 2], close: close[close.length - 2] };
    const third = { open: open[open.length - 1], close: close[close.length - 1] };
    return (first.close > first.open) && (second.close > second.open) && (third.close > third.open) &&
           (second.open < first.close) && (second.open > first.open) &&
           (third.open < second.close) && (third.open > second.open) &&
           (second.close > first.close) && (third.close > second.close);
}

function isBullishHammerStick(open, close, high, low) {
    const bodySize = Math.abs(close - open);
    const lowerShadow = Math.min(open, close) - low;
    const upperShadow = high - Math.max(open, close);
    const totalRange = high - low;
    return (lowerShadow > 2 * bodySize) && (upperShadow < bodySize * 0.5) && (bodySize / totalRange < 0.3);
}

function isBullishInvertedHammerStick(open, close, high, low) {
    const bodySize = Math.abs(close - open);
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;
    const totalRange = high - low;
    return (upperShadow > 2 * bodySize) && (lowerShadow < bodySize * 0.5) && (bodySize / totalRange < 0.3);
}

function isHammerPattern(open, close, high, low) {
    return isBullishHammerStick(open, close, high, low);
}
// HammerPatternUnconfirmed is handled by the main analysis logic based on position

function isTweezerBottom(low) {
    if (low.length < 2) return false;
    const prevLow = low[low.length - 2];
    const currLow = low[low.length - 1];
    return Math.abs(currLow - prevLow) < prevLow * 0.0005; // 0.05% tolerance
}

// 看跌形态
function isBearishEngulfing(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    return (prevClose > prevOpen) && (currClose < currOpen) && (currOpen >= prevClose) && (currClose <= prevOpen);
}

function isBearishHarami(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    return (prevClose > prevOpen) && (currClose < currOpen) && (currOpen <= prevClose) && (currClose >= prevOpen);
}

function isBearishHaramiCross(open, close) {
    if (open.length < 2) return false;
    const prevOpen = open[open.length - 2];
    const prevClose = close[close.length - 2];
    const currOpen = open[open.length - 1];
    const currClose = close[close.length - 1];
    const bodySize = Math.abs(currClose - currOpen);
    return (prevClose > prevOpen) && (bodySize / Math.abs(prevClose - prevOpen) < 0.1) && (currOpen <= prevClose) && (currClose >= prevOpen);
}

function isEveningStar(open, close) {
    if (open.length < 3) return false;
    const firstClose = close[close.length - 3];
    const firstOpen = open[open.length - 3];
    const secondClose = close[close.length - 2];
    const secondOpen = open[open.length - 2];
    const thirdClose = close[close.length - 1];
    const thirdOpen = open[open.length - 1];
    return (firstClose > firstOpen) && (secondClose > secondOpen) && (secondOpen > firstClose) && (thirdClose < thirdOpen) && (thirdClose < (firstOpen + firstClose) / 2);
}

function isEveningDojiStar(open, close, high) {
    if (open.length < 3) return false;
    const firstClose = close[close.length - 3];
    const firstOpen = open[open.length - 3];
    const secondClose = close[close.length - 2];
    const secondOpen = open[open.length - 2];
    const thirdClose = close[close.length - 1];
    const thirdOpen = open[open.length - 1];
    const secondBodySize = Math.abs(secondClose - secondOpen);
    return (firstClose > firstOpen) && (secondBodySize / (secondOpen + secondClose) < 0.001) && (secondClose > high[high.length - 3]) && (thirdClose < thirdOpen) && (thirdClose < (firstOpen + firstClose) / 2);
}

function isBearishMarubozu(open, close, high, low) {
    const bodySize = open - close;
    const upperShadow = high - Math.max(open, close);
    const lowerShadow = Math.min(open, close) - low;
    const totalRange = high - low;
    return (close < open) && (bodySize / totalRange > 0.95) && (upperShadow / totalRange < 0.05) && (lowerShadow / totalRange < 0.05);
}

function isThreeBlackCrows(open, close) {
    if (open.length < 3) return false;
    const first = { open: open[open.length - 3], close: close[close.length - 3] };
    const second = { open: open[open.length - 2], close: close[close.length - 2] };
    const third = { open: open[open.length - 1], close: close[close.length - 1] };
    return (first.close < first.open) && (second.close < second.open) && (third.close < third.open) &&
           (second.open < first.open) && (second.open > first.close) &&
           (third.open < second.open) && (third.open > second.close) &&
           (second.close < first.close) && (third.close < second.close);
}

function isHangingMan(open, close, high, low) {
    return isBullishHammerStick(open, close, high, low); // Same shape as hammer
}
function isHangingManUnconfirmed(open, close, high, low) {
    return isHangingMan(open, close, high, low);
}

function isShootingStar(open, close, high, low) {
    return isBullishInvertedHammerStick(open, close, high, low); // Same shape as inverted hammer
}
function isShootingStarUnconfirmed(open, close, high, low) {
    return isShootingStar(open, close, high, low);
}

function isTweezerTop(high) {
    if (high.length < 2) return false;
    const prevHigh = high[high.length - 2];
    const currHigh = high[high.length - 1];
    return Math.abs(currHigh - prevHigh) < prevHigh * 0.0005; // 0.05% tolerance
}

// 分析特定的反转K线形态，根据形态和趋势赋予信号分数
function analyzeReversalPatterns(data, trend) {
    const reversalSignals = [];
    let totalScore = 0;
    
    // 最新K线数据
    const latestOpen = data.open[data.open.length - 1];
    const latestClose = data.close[data.close.length - 1];
    const latestHigh = data.high[data.high.length - 1];
    const latestLow = data.low[data.low.length - 1];
    const prevClose = data.close[data.close.length - 2];
    
    // 看涨形态信号
    if (isBullishEngulfing(data.open, data.close)) {
        reversalSignals.push('看涨吞没形态 (Bullish Engulfing)');
        totalScore += 2;
    }
    if (isMorningStar(data.open, data.close)) {
        reversalSignals.push('晨星形态 (Morning Star)');
        totalScore += 3;
    }
    if (isMorningDojiStar(data.open, data.close, data.low)) {
        reversalSignals.push('十字晨星 (Morning Doji Star)');
        totalScore += 3.5;
    }
    if (isPiercingLine(data.open, data.close)) {
        reversalSignals.push('刺穿线 (Piercing Line)');
        totalScore += 2;
    }
    if (isBullishHarami(data.open, data.close)) {
        reversalSignals.push('看涨孕线 (Bullish Harami)');
        totalScore += 1;
    }
    if (isBullishHaramiCross(data.open, data.close)) {
        reversalSignals.push('看涨十字孕线 (Bullish Harami Cross)');
        totalScore += 1.5;
    }
    if (isBullishMarubozu(latestOpen, latestClose, latestHigh, latestLow)) {
        reversalSignals.push('看涨光头光脚大阳线 (Bullish Marubozu)');
        totalScore += 2;
    }
    if (isThreeWhiteSoldiers(data.open, data.close)) {
        reversalSignals.push('三白兵 (Three White Soldiers)');
        totalScore += 3;
    }
    if (isBullishHammerStick(latestOpen, latestClose, latestHigh, latestLow) && prevClose < latestOpen) {
        reversalSignals.push('看涨锤子线 (Bullish Hammer Stick)');
        totalScore += 2;
    }
    if (isBullishInvertedHammerStick(latestOpen, latestClose, latestHigh, latestLow) && prevClose < latestOpen) {
        reversalSignals.push('看涨倒锤子线 (Bullish Inverted Hammer Stick)');
        totalScore += 2;
    }
    if (isDownsideTasukiGap(data.open, data.close, data.high, data.low)) {
        reversalSignals.push('下降中继缺口 (Downside Tasuki Gap)');
        totalScore += 1.5;
    }
    if (isTweezerBottom(data.low)) {
        reversalSignals.push('镊子底 (Tweezer Bottom)');
        totalScore += 1.5;
    }

    // 看跌形态信号
    if (isBearishEngulfing(data.open, data.close)) {
        reversalSignals.push('看跌吞没形态 (Bearish Engulfing)');
        totalScore -= 2;
    }
    if (isEveningStar(data.open, data.close)) {
        reversalSignals.push('黄昏星 (Evening Star)');
        totalScore -= 3;
    }
    if (isEveningDojiStar(data.open, data.close, data.high)) {
        reversalSignals.push('十字黄昏星 (Evening Doji Star)');
        totalScore -= 3.5;
    }
    if (isBearishHarami(data.open, data.close)) {
        reversalSignals.push('看跌孕线 (Bearish Harami)');
        totalScore -= 1;
    }
    if (isBearishHaramiCross(data.open, data.close)) {
        reversalSignals.push('看跌十字孕线 (Bearish Harami Cross)');
        totalScore -= 1.5;
    }
    if (isBearishMarubozu(latestOpen, latestClose, latestHigh, latestLow)) {
        reversalSignals.push('看跌光头光脚大阴线 (Bearish Marubozu)');
        totalScore -= 2;
    }
    if (isThreeBlackCrows(data.open, data.close)) {
        reversalSignals.push('三黑鸦 (Three Black Crows)');
        totalScore -= 3;
    }
    if (isHangingMan(latestOpen, latestClose, latestHigh, latestLow) && latestClose < latestOpen) {
        reversalSignals.push('吊人线 (Hanging Man)');
        totalScore -= 2;
    }
    if (isShootingStar(latestOpen, latestClose, latestHigh, latestLow) && latestClose < latestOpen) {
        reversalSignals.push('射击之星 (Shooting Star)');
        totalScore -= 2;
    }
    if (isTweezerTop(data.high)) {
        reversalSignals.push('镊子顶 (Tweezer Top)');
        totalScore -= 1.5;
    }
    
    // 处理未确认形态，主要是根据趋势判断
    if (isBullishHammerStick(latestOpen, latestClose, latestHigh, latestLow) && prevClose > latestOpen) {
        reversalSignals.push('未确认的锤子线 (Hammer Unconfirmed)');
        totalScore += 1;
    }
    if (isHangingMan(latestOpen, latestClose, latestHigh, latestLow) && latestClose > latestOpen) {
        reversalSignals.push('未确认的吊人线 (Hanging Man Unconfirmed)');
        totalScore -= 1;
    }
    
    // 确保不出现矛盾信号
    const finalSignals = [];
    if (totalScore > 0) {
        reversalSignals.forEach(signal => {
            if (!signal.includes('看跌') && !signal.includes('三黑鸦') && !signal.includes('黄昏星')) {
                finalSignals.push(signal);
            }
        });
    } else if (totalScore < 0) {
        reversalSignals.forEach(signal => {
            if (!signal.includes('看涨') && !signal.includes('三白兵') && !signal.includes('晨星')) {
                finalSignals.push(signal);
            }
        });
    } else {
        finalSignals.push(...reversalSignals);
    }

    return {
        signals: finalSignals,
        score: totalScore
    };
}


async function runAnalysis(symbol = 'BTCUSDT', interval = '15m') {
    // 设置全局变量，保持与原有代码兼容
    global.SYMBOL = symbol;
    global.INTERVAL = interval;
    
    // 返回一个 Promise，以便在浏览器中异步调用
    return new Promise(async (resolve, reject) => {
        try {
            // 使用传入的参数或默认值
            const symbolToUse = symbol || 'BTCUSDT';
            const intervalToUse = interval || '15m';
            let klineResponse;
            let fundingRateResponse;

            // 1. 从币安API获取K线数据和资金费率
            console.log(`正在从币安获取 ${symbolToUse} 永续合约 ${intervalToUse} K线数据和资金费率...`);
            
            try {
                // 并行获取K线数据和资金费率
                [klineResponse, fundingRateResponse] = await Promise.all([
                    axios.get(BINANCE_KLINE_API_URL, {
                        params: {
                            symbol: symbolToUse,
                            interval: intervalToUse,
                            limit: LIMIT
                        }
                    }),
                    axios.get(BINANCE_FUNDING_RATE_API_URL, {
                        params: { symbol: symbolToUse }
                    })
                ]);

                // 检查API响应
                if (!klineResponse.data || klineResponse.data.length < 20) {
                    throw new Error('获取K线数据失败，请检查API连接或参数。');
                }
            } catch (error) {
                console.error('获取数据时出错:', error.message);
                reject(error);
                return;
            }

        const klines = klineResponse.data;
        
        // 提取所需数据
        const closePrices = klines.map(kline => parseFloat(kline[4])); // 收盘价
        const openPrices = klines.map(kline => parseFloat(kline[1])); // 开盘价
        const highPrices = klines.map(kline => parseFloat(kline[2]));  // 最高价
        const lowPrices = klines.map(kline => parseFloat(kline[3]));   // 最低价
        const volumes = klines.map(kline => parseFloat(kline[5]));      // 成交量

        // 获取最新数据
        const latestKline = klines[klines.length - 1];
        const currentPrice = parseFloat(latestKline[4]);
        const latestVolume = volumes[volumes.length - 1];
        
        // 使用Binance的24hr ticker API获取精确24h变化
        const tickerResponse = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr', {
            params: { symbol: symbol }
        });
        const last24hChange = parseFloat(tickerResponse.data.priceChangePercent);

        // 获取资金费率
        let fundingRate = 0;
        try {
            if (fundingRateResponse && fundingRateResponse.data) {
                fundingRate = parseFloat(fundingRateResponse.data.lastFundingRate || 0) * 100;
            }
        } catch (error) {
            console.error('解析资金费率时出错:', error.message);
            // 继续执行，使用默认值0
        }

        // 2. 技术指标计算
        // 均线系统
        const ma5 = technicalindicators.SMA.calculate({ period: 5, values: closePrices }).pop();
        const ma10 = technicalindicators.SMA.calculate({ period: 10, values: closePrices }).pop();
        const ma20 = technicalindicators.SMA.calculate({ period: 20, values: closePrices }).pop();

        // MACD
        const fullMacd = technicalindicators.MACD.calculate({
            values: closePrices,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMA: false
        });
        const macd = fullMacd.pop();
        const lastHistogram = fullMacd.length > 1 ? fullMacd[fullMacd.length - 2].histogram : 0;
        
        // 布林带 (BOLL)
        const boll = technicalindicators.BollingerBands.calculate({
            period: 20,
            values: closePrices,
            stdDev: 2
        }).pop();

        // RSI
        const rsi6 = technicalindicators.RSI.calculate({ period: 6, values: closePrices }).pop();
        const rsi14 = technicalindicators.RSI.calculate({ period: 14, values: closePrices }).pop();
        
        // KDJ (Stochastic)
        const kdj = technicalindicators.Stochastic.calculate({
            high: highPrices,
            low: lowPrices,
            close: closePrices,
            period: 14,
            signalPeriod: 3
        }).pop();
        
        // 手动计算KDJ的J值
        kdj.j = 3 * kdj.k - 2 * kdj.d;

        // ADX指标，用于趋势强度
        const adx = technicalindicators.ADX.calculate({
            high: highPrices,
            low: lowPrices,
            close: closePrices,
            period: 14
        }).pop();
        const trendStrengthFactor = (adx.adx > 25) ? 1.2 : 0.8; // 如果趋势强，增加信号权重

        // 3. 编写分析逻辑并生成报告
        // 判断趋势
        let trend = '震荡';
        if (ma5 < ma10 && ma10 < ma20) {
            trend = '震荡偏空';
        } else if (ma5 > ma10 && ma10 > ma20) {
            trend = '震荡偏多';
        }
        
        // 动态计算支撑和压力位 (使用前一天的日K线)
        const dailyKlineResponse = await axios.get(BINANCE_KLINE_API_URL, {
            params: {
                symbol: symbol,
                interval: '1d',
                limit: 2
            }
        });
        const dailyKlines = dailyKlineResponse.data;
        const prevDaily = dailyKlines[0];
        const pp = calculatePivotPoints(
            parseFloat(prevDaily[2]),
            parseFloat(prevDaily[3]),
            parseFloat(prevDaily[4])
        );

        // 动态计算斐波那契回调位
        const fibLevels = calculateFibonacciLevels(klines);

        const support1 = pp.s1;
        const support2 = pp.s2;
        const resistance1 = pp.r1;
        const resistance2 = pp.r2;

        // 动态成交量分析
        const volumeSMA = technicalindicators.SMA.calculate({ period: 20, values: volumes }).pop();
        const latestPriceChange = closePrices[closePrices.length - 1] - closePrices[closePrices.length - 2];
        let volumeAnalysis = `当前成交量（${latestVolume.toFixed(2)}）与20周期均量（${volumeSMA.toFixed(2)}）相当。`;
        
        if (latestVolume > volumeSMA * 1.5) {
            if (latestPriceChange > 0) {
                volumeAnalysis = `当前为放量上涨，多头动能强劲。`;
            } else {
                volumeAnalysis = `当前为放量下跌，空头动能强劲，需警惕。`;
            }
        } else if (latestVolume < volumeSMA * 0.5) {
            if (latestPriceChange > 0) {
                volumeAnalysis = `当前为缩量上涨，多头动能不足，可能面临回调。`;
            } else {
                volumeAnalysis = `当前为缩量下跌，空头动能减弱，可能存在反弹。`;
            }
        } else if (latestPriceChange > 0 && latestVolume < volumeSMA) {
            volumeAnalysis = `近期出现缩量反弹，多头动能减弱，反弹力度可能有限。`;
        } else if (latestPriceChange < 0 && latestVolume < volumeSMA) {
            volumeAnalysis = `近期出现缩量下跌，空头动能有所衰竭，可能止跌。`;
        }
        
        // 基于指标组合动态判断方向和策略
        let direction, entryStrategy, stopLoss, target1, target2;
        let signalScore = 0;
        let signals = [];

        // 均线信号
        if (ma5 > ma10 && ma10 > ma20) {
            signalScore += 2 * trendStrengthFactor;
            signals.push('均线系统呈多头排列，看涨。');
        } else if (ma5 < ma10 && ma10 < ma20) {
            signalScore -= 2 * trendStrengthFactor;
            signals.push('均线系统呈空头排列，看跌。');
        } else {
            signals.push('均线系统纠缠，方向不明。');
        }

        // MACD信号
        if (macd.MACD > macd.signal && macd.histogram > 0) {
            signalScore += 2 * trendStrengthFactor;
            signals.push('MACD金叉，柱状体上扬，看涨。');
        } else if (macd.MACD < macd.signal && macd.histogram < 0) {
            signalScore -= 2 * trendStrengthFactor;
            signals.push('MACD死叉，柱状体下扬，看跌。');
        } else {
            signals.push('MACD信号不明确。');
        }

        // RSI和KDJ信号
        if (rsi6 < 30) {
            signalScore += 1 * trendStrengthFactor;
            signals.push('RSI进入超卖区，存在反弹需求。');
        }
        if (kdj.k < 20 && kdj.d < 20) {
            signalScore += 1 * trendStrengthFactor;
            signals.push('KDJ超卖，潜在金叉信号。');
        }
        if (rsi6 > 70) {
            signalScore -= 1 * trendStrengthFactor;
            signals.push('RSI进入超买区，存在回调风险。');
        }
        if (kdj.k > 80 && kdj.d > 80) {
            signalScore -= 1 * trendStrengthFactor;
            signals.push('KDJ超买，潜在死叉信号。');
        }
        
        // K线形态信号
        const candleAnalysis = analyzeCandle(
            openPrices[openPrices.length - 1],
            closePrices[closePrices.length - 1],
            highPrices[highPrices.length - 1],
            lowPrices[lowPrices.length - 1]
        );
        signalScore += candleAnalysis.score * trendStrengthFactor;
        signals.push(`K线形态分析：${candleAnalysis.text}`);
        
        // 反转形态信号
        const reversalAnalysis = analyzeReversalPatterns({
            open: openPrices.slice(-10),
            high: highPrices.slice(-10),
            low: lowPrices.slice(-10),
            close: closePrices.slice(-10)
        }, trend); // 传入趋势参数
        signalScore += reversalAnalysis.score * trendStrengthFactor;
        if (reversalAnalysis.signals.length > 0) {
            signals.push(`识别出反转形态：${reversalAnalysis.signals.join('、')}`);
        } else {
            signals.push('未识别出明显反转形态。');
        }

        // 成交量信号
        if (latestVolume > volumeSMA * 1.5 && latestPriceChange > 0) {
            signalScore += 1 * trendStrengthFactor;
            signals.push('放量上涨，确认多头信号。');
        } else if (latestVolume > volumeSMA * 1.5 && latestPriceChange < 0) {
            signalScore -= 1 * trendStrengthFactor;
            signals.push('放量下跌，确认空头信号。');
        }

        // 资金费率信号
        if (fundingRate > 0.01) {
            signalScore -= 1;
            signals.push('资金费率正值过高，多头付费，存在空头机会。');
        } else if (fundingRate < -0.01) {
            signalScore += 1;
            signals.push('资金费率负值过高，空头付费，存在多头机会。');
        } else {
            signals.push('资金费率中性，无极端多空情绪。');
        }

        // 根据综合评分判断方向和策略
        if (signalScore >= 4) {
            direction = '看涨（多头趋势强劲）';
            stopLoss = pp.s3;
            target1 = pp.r1;
            target2 = pp.r2;

            const fib382 = fibLevels['38.2%'];
            const fib50 = fibLevels['50%'];
            let fibDesc = '';
    // 动态调整斐波那契入场描述
    if (currentPrice < fib382) {
        // 当前价格低于斐波那契38.2%位，该点位为阻力，需等待价格突破
        fibDesc = `或有效突破斐波那契38.2%位 ${fib382.toFixed(2)} 后考虑分批建仓。`;
    } else {
        // 当前价格高于斐波那契38.2%位，该点位为支撑，可等待回调
        fibDesc = `或等待价格回调至斐波那契38.2%位 ${fib382.toFixed(2)} 附近分批建仓。`;
    }
            entryStrategy = `入场时机：现价 ${currentPrice.toFixed(2)} 附近轻仓试多，${fibDesc}`;

        } else if (signalScore >= 2) {
            direction = '震荡偏多（短期存在反弹需求）';
            stopLoss = pp.s2;
            target1 = pp.r1;
            target2 = pp.r2;

            const fib50 = fibLevels['50%'];
            let fibDesc = '';
    // 动态调整斐波那契入场描述
    if (currentPrice > fib50) {
        fibDesc = `或等待价格回调至斐波那契50%位 ${fib50.toFixed(2)} 或S1 ${support1.toFixed(2)} 附近分批建仓。`;
    } else {
        fibDesc = `或等待价格反弹至斐波那契50%位 ${fib50.toFixed(2)} 附近轻仓尝试做空，但需注意风险。`;
    }
            entryStrategy = `入场时机：激进者现价 ${currentPrice.toFixed(2)} 附近轻仓试多，${fibDesc}`;

        } else if (signalScore <= -4) {
            direction = '看空（空头趋势强劲）';
            stopLoss = pp.r3;
            target1 = pp.s1;
            target2 = pp.s2;

            const fib382 = fibLevels['38.2%'];
            const fib50 = fibLevels['50%'];
            let fibDesc = '';
    // 动态调整斐波那契入场描述
    if (currentPrice > fib382) {
        fibDesc = `或等待价格反弹至斐波那契38.2%位 ${fib382.toFixed(2)} 附近分批做空。`;
    } else {
        fibDesc = `或有效跌破斐波那契50%位 ${fib50.toFixed(2)} 后考虑分批做空。`;
    }
            entryStrategy = `入场时机：现价 ${currentPrice.toFixed(2)} 附近轻仓试空，${fibDesc}`;

        } else if (signalScore <= -2) {
            direction = '震荡偏空（短期承压，但未破关键支撑）';
            stopLoss = pp.r2;
            target1 = pp.s1;
            target2 = pp.s2;

            const fib50 = fibLevels['50%'];
            let fibDesc = '';
    // 动态调整斐波那契入场描述
    if (currentPrice < fib50) {
        fibDesc = `或等待价格反弹至斐波那契50%位 ${fib50.toFixed(2)} 或R1 ${resistance1.toFixed(2)} 附近分批做空。`;
    } else {
        fibDesc = `或等待价格回调至斐波那契50%位 ${fib50.toFixed(2)} 附近轻仓尝试做多，但需注意风险。`;
    }
            entryStrategy = `入场时机：激进者现价 ${currentPrice.toFixed(2)} 附近轻仓试空，${fibDesc}`;

        } else {
            direction = '震荡（多空双方胶着）';
            entryStrategy = `入场时机：等待价格有效突破或跌破关键枢轴点。`;
            stopLoss = pp.s2;
            target1 = pp.r1;
            target2 = pp.r2;
        }
        
        // 4. 打印报告
        console.log(`\n--- ${symbol} 永续合约 ${interval} 行情走势分析报告 ---\n`);
        console.log(`根据实时行情数据`);
        console.log(`当前价格：${currentPrice.toFixed(2)} USDT`);
        console.log(`24小时涨跌：${last24hChange.toFixed(2)}%`);
        console.log(`主要支撑位：枢轴点S2 ${support2.toFixed(2)} USDT、枢轴点S1 ${support1.toFixed(2)} USDT`);
        console.log(`主要压力位：枢轴点R1 ${resistance1.toFixed(2)} USDT、枢轴点R2 ${resistance2.toFixed(2)} USDT`);
        console.log(`斐波那契回调位：`);
        for (const level in fibLevels) {
            console.log(`  - ${level} 回调位：${fibLevels[level].toFixed(2)} USDT`);
        }
        console.log(`当前趋势：${trend} (ADX: ${adx.adx.toFixed(2)}, 趋势强度: ${adx.adx > 25 ? '强' : '弱'})`);

        console.log(`\n--- 详细解释 ---`);
        console.log(`技术指标综合：`);
        
        // 动态MA描述
        let maDescription = '';
        if (ma5 > ma10 && ma10 > ma20) {
            maDescription = `MA5（${ma5.toFixed(2)}）上穿MA10（${ma10.toFixed(2)}）和MA20（${ma20.toFixed(2)}），呈多头排列，短期趋势偏强。`;
        } else if (ma5 < ma10 && ma10 < ma20) {
            maDescription = `MA5（${ma5.toFixed(2)}）下穿MA10（${ma10.toFixed(2)}）和MA20（${ma20.toFixed(2)}），呈空头排列，短期趋势偏弱。`;
        } else {
            maDescription = `MA5（${ma5.toFixed(2)}）、MA10（${ma10.toFixed(2)}）和MA20（${ma20.toFixed(2)}）纠缠，趋势不明。`;
        }
        console.log(`均线系统：${maDescription}`);

        console.log(`MACD：DIF（${macd.MACD.toFixed(2)}）在DEA（${macd.signal.toFixed(2)}）${macd.MACD > macd.signal ? '上方' : '下方'}，${macd.MACD > macd.signal ? '金叉运行' : '死叉运行'}。柱状体（${macd.histogram.toFixed(2)}）${macd.histogram > 0 ? '上涨动能较强' : '下跌动能较强'}。`);
        console.log(`BOLL：价格位于中轨（${boll.middle.toFixed(2)}）${currentPrice > boll.middle ? '上方' : '下方'}，${currentPrice > boll.upper ? '突破上轨，看涨动能强劲' : currentPrice < boll.lower ? '跌破下轨，看跌动能强劲' : '震荡运行'}。`);
        console.log(`RSI：RSI6（${rsi6.toFixed(2)}）${rsi6 > 70 ? '进入超买区间' : rsi6 < 30 ? '进入超卖区间' : '中性'}，RSI14（${rsi14.toFixed(2)}）中性偏低，短期存在技术性修复需求。`);
        console.log(`KDJ：K（${kdj.k.toFixed(2)}）与D（${kdj.d.toFixed(2)}）${kdj.k > kdj.d ? '金叉' : '死叉'}，J（${kdj.j.toFixed(2)}）${kdj.j > 80 ? '超买' : kdj.j < 20 ? '超卖' : '中性'}。`);
        
        console.log(`\n资金与量价分析：`);
        console.log(`资金费率：${fundingRate.toFixed(6)}%（${fundingRate > 0.01 ? '多头付费' : fundingRate < -0.01 ? '空头付费' : '中性'}）。`);
        console.log(`成交量：${volumeAnalysis}`);
        console.log(`K线形态：${candleAnalysis.text}`);

        console.log(`\n--- 分析结果 ---`);
        console.log(`综合信号评分：${signalScore.toFixed(2)}分`);
        reversalAnalysis.signals.forEach(s => console.log(` - ${s}`));
        console.log(`方向：${direction}`);
        console.log(`入场时机：${entryStrategy}`);
        
        // 根据方向动态打印止损和目标价位
        if (direction.includes('看涨') || direction.includes('震荡偏多')) {
            console.log(`止损设定：止损位 ${pp.s3.toFixed(2)}，约${(Math.abs(currentPrice - pp.s3) / currentPrice * 100).toFixed(2)}%风险控制。`);
            console.log(`目标价位：第一目标 ${pp.r1.toFixed(2)}，第二目标 ${pp.r2.toFixed(2)}。`);
        } else if (direction.includes('看空') || direction.includes('震荡偏空')) {
            console.log(`止损设定：止损位 ${pp.r3.toFixed(2)}，约${(Math.abs(currentPrice - pp.r3) / currentPrice * 100).toFixed(2)}%风险控制。`);
            console.log(`目标价位：第一目标 ${pp.s1.toFixed(2)}，第二目标 ${pp.s2.toFixed(2)}。`);
        } else {
            console.log(`\n--- 详细交易策略（震荡行情） ---`);
            console.log(`多头策略：`);
            console.log(`  - 入场：价格有效突破R1 ${resistance1.toFixed(2)} 后考虑入场。`);
            console.log(`  - 止损：设置在S1 ${support1.toFixed(2)} 附近。`);
            console.log(`  - 目标：第一目标R2 ${resistance2.toFixed(2)}，第二目标R3 ${pp.r3.toFixed(2)}。`);
            console.log(`空头策略：`);
            console.log(`  - 入场：价格有效跌破S1 ${support1.toFixed(2)} 后考虑入场。`);
            console.log(`  - 止损：设置在R1 ${resistance1.toFixed(2)} 附近。`);
            console.log(`  - 目标：第一目标S2 ${support2.toFixed(2)}，第二目标S3 ${pp.s3.toFixed(2)}。`);
        }
        
        console.log(`提示：本分析仅供参考，不构成任何投资建议！`);
        
        // 返回分析结果
        resolve();
        
    } catch (error) {
        console.error('在执行脚本时发生错误:', error.message);
        reject(error);
    }
});
}

// 导出 runAnalysis 函数
// module.exports = { runAnalysis };

export default { runAnalysis };

// 如果直接运行此文件，则执行分析
if (typeof window === 'undefined' && require.main === module) {
  // 从命令行参数获取交易对和时间周期
  const symbol = process.argv[2] || 'BTCUSDT';
  const interval = process.argv[3] || '15m';
  
  console.log(`开始分析 ${symbol} ${interval} 数据...`);
  runAnalysis(symbol, interval).catch(console.error);
}