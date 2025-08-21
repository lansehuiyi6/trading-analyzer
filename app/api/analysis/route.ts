import { NextResponse } from 'next/server';
import { runAnalysis } from '../../../analysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 解析请求体
    const { pair, timeframe } = await request.json();
    
    // 验证参数
    if (!pair || !timeframe) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing parameters',
          message: 'Both pair and timeframe are required'
        },
        { status: 400 }
      );
    }

    // 执行分析
    const logs: string[] = [];
    const originalConsole = {
      log: console.log,
      error: console.error
    };

    try {
      // 重写控制台方法以捕获输出
      console.log = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        logs.push(`${message}`);
        originalConsole.log(...args);
      };

      console.error = (...args: any[]) => {
        const message = args.map(arg => String(arg)).join(' ');
        logs.push(`[ERROR] ${message}`);
        originalConsole.error(...args);
      };

      // 执行分析
      await runAnalysis(pair, timeframe);

      // 返回成功响应
      return NextResponse.json({
        success: true,
        logs,
        result: '分析完成',
        pair,
        timeframe,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 记录错误
      logs.push(`[ERROR] 分析执行失败: ${errorMessage}`);
      
      return NextResponse.json(
        { 
          success: false,
          error: '分析执行失败',
          message: errorMessage,
          logs,
          ...(process.env.NODE_ENV === 'development' && {
            stack: error instanceof Error ? error.stack : undefined
          })
        },
        { status: 500 }
      );
    } finally {
      // 恢复原始控制台方法
      console.log = originalConsole.log;
      console.error = originalConsole.error;
    }

  } catch (error) {
    // 处理请求解析错误
    const errorMessage = error instanceof Error ? error.message : 'Invalid request';
    
    return NextResponse.json(
      { 
        success: false,
        error: '请求处理失败',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: 400 }
    );
  }
}

// 添加 GET 方法用于测试
export async function GET() {
  return NextResponse.json({
    status: 'API is working',
    timestamp: new Date().toISOString()
  });
}