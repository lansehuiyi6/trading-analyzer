import { NextResponse } from 'next/server';
import { runAnalysis } from './analysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { pair = 'BTCUSDT', timeframe = '15m' } = await request.json();
        
        if (!pair || !timeframe) {
            return NextResponse.json(
                { success: false, error: 'Missing parameters' },
                { status: 400 }
            );
        }

        // 重写控制台方法以捕获输出
        const logs: string[] = [];
        const originalConsole = {
            log: console.log,
            error: console.error
        };

        console.log = (...args: any[]) => {
            const message = args.map(arg => String(arg)).join(' ');
            logs.push(message);
            originalConsole.log(...args);
        };

        console.error = (...args: any[]) => {
            const message = args.map(arg => String(arg)).join(' ');
            logs.push(`[ERROR] ${message}`);
            originalConsole.error(...args);
        };

        // 执行分析
      await runAnalysis(pair, timeframe);
        
        // 恢复原始控制台方法
        console.log = originalConsole.log;
        console.error = originalConsole.error;

        return NextResponse.json({
            success: true,
        logs,
        result: '分析完成',
        pair,
        timeframe,
        timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Analysis failed',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
            },
            { status: 500 }
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