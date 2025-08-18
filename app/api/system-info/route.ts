import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Get raw IP address
    let rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'localhost';
    
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
    
    // Try to detect domain from various sources
    let detectedDomain = 'Not on domain';
    
    // Check for domain information in headers or host
    const host = request.headers.get('host');
    const userAgent = request.headers.get('user-agent') || '';
    
    // Common domain detection patterns
    if (host && (host.includes('.lacounty.gov') || host.includes('.dpss'))) {
        detectedDomain = 'LACOUNTY';
    } else if (host && host.includes('.local')) {
        detectedDomain = 'LOCAL_DOMAIN';
    } else if (normalizedIp.startsWith('192.168.') || normalizedIp.startsWith('10.') || normalizedIp.startsWith('172.')) {
        // Private IP ranges suggest internal network
        detectedDomain = 'INTERNAL_NETWORK';
    } else if (normalizedIp === 'localhost' || normalizedIp === '127.0.0.1') {
        detectedDomain = 'LOCALHOST';
    }

    return NextResponse.json({
        success: true,
        ip: normalizedIp,
        domain: detectedDomain,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        referer: request.headers.get('referer') || 'Direct',
        host: host || 'Unknown'
    });
}