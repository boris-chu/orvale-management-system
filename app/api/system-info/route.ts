import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const systemInfo = {
        ip_address: request.ip || request.headers.get('x-forwarded-for') || 'localhost',
        user_agent: request.headers.get('user-agent') || '',
        timestamp: new Date().toISOString(),
        referer: request.headers.get('referer') || 'Direct'
    };

    return NextResponse.json({
        success: true,
        system_info: systemInfo
    });
}