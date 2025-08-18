import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Get raw IP address
    let rawIp = request.ip || request.headers.get('x-forwarded-for') || 'localhost';
    
    // Normalize IP addresses for cleaner display
    let normalizedIp = rawIp;
    if (typeof rawIp === 'string') {
        // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.45 -> 192.168.1.45)
        if (rawIp.startsWith('::ffff:')) {
            normalizedIp = rawIp.substring(7);
        }
        // Handle IPv6 localhost (::1 -> localhost)
        else if (rawIp === '::1') {
            normalizedIp = 'localhost';
        }
        // Handle IPv4 localhost variants
        else if (rawIp === '127.0.0.1' || rawIp === '0.0.0.0') {
            normalizedIp = 'localhost';
        }
    }
    
    const systemInfo = {
        ip_address: normalizedIp,
        user_agent: request.headers.get('user-agent') || '',
        timestamp: new Date().toISOString(),
        referer: request.headers.get('referer') || 'Direct'
    };

    return NextResponse.json({
        success: true,
        system_info: systemInfo
    });
}