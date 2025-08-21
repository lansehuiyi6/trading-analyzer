import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { pair, timeframe } = await request.json();

    if (!pair || !timeframe) {
      return NextResponse.json(
        { error: '缺少必要参数: pair 和 timeframe' },
        { status: 400 }
      );
    }

    // 检查 analysis.js 文件是否存在
    // const analysisScriptPath = path.join(process.cwd(), 'analysis.js');
    const analysisScriptPath = path.join(process.cwd(), 'app/api/analysis/analysis.js');
    
    try {
      // 尝试执行 analysis.js 脚本
      const { stdout, stderr } = await execAsync(
        `node "${analysisScriptPath}" "${pair}" "${timeframe}"`
      );

      if (stderr) {
        console.error('Script stderr:', stderr);
      }

      return NextResponse.json({
        success: true,
        result: stdout || '脚本执行完成，无输出内容',
        pair,
        timeframe,
        timestamp: new Date().toISOString()
      });

    } catch (execError) {
      // 如果脚本不存在或执行失败，返回模拟结果
      console.log('analysis.js 不存在或执行失败，返回模拟数据');
      
      const mockResults = {
        'BTCUSDT': {
          '5m': '短期波动较大，建议观望',
          '15m': '技术指标显示超买，可能回调',
          '30m': '均线支撑较强，趋势向上',
          '1h': '突破关键阻力位，看涨信号',
          '2h': 'MACD金叉，建议买入',
          '4h': '长期趋势良好，持续看涨',
          '6h': 'RSI进入超买区域，注意风险',
          '8h': '成交量放大，趋势确认',
          '12h': '日线级别支撑有效',
          '1d': '长期牛市格局未变'
        },
        'ETHUSDT': {
          '5m': 'ETH短期震荡，等待方向选择',
          '15m': '技术面偏弱，建议减仓',
          '30m': '关键支撑位附近，可适量买入',
          '1h': 'DeFi概念推动，看涨',
          '2h': '与BTC联动性增强',
          '4h': '升级预期支撑价格',
          '6h': '机构资金流入明显',
          '8h': '技术面转强，建议持有',
          '12h': '中期趋势向好',
          '1d': 'ETH 2.0利好持续发酵'
        }
      };

      const defaultResult = `${pair} ${timeframe} ${execError} 周期分析结果：
- 当前价格：模拟数据
- 24h涨跌：+2.34%
- 技术分析：${mockResults[pair as keyof typeof mockResults]?.[timeframe as keyof typeof mockResults['BTCUSDT']] || '数据分析中...'}
- 建议：请根据实际市场情况判断`;

      return NextResponse.json({
        success: true,
        result: defaultResult,
        pair,
        timeframe,
        timestamp: new Date().toISOString(),
        note: '这是模拟数据，请创建 analysis.js 文件以获取真实分析结果'
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}