// Simple in-memory rate limiter for serverless environment
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ip: string, limit = 10, windowMs = 60000): { success: boolean; headers: Record<string, string> } {
    const now = Date.now();
    const current = rateLimitMap.get(ip);

    if (!current || current.expiresAt < now) {
        rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs });
        return { success: true, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': (limit - 1).toString() } };
    }

    if (current.count >= limit) {
        return { success: false, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': "0", 'Retry-After': Math.ceil((current.expiresAt - now) / 1000).toString() } };
    }

    current.count += 1;
    rateLimitMap.set(ip, current);
    
    // Cleanup old entries occasionally to prevent memory leaks in long-running instances
    if (Math.random() < 0.1) {
        for (const [key, value] of rateLimitMap.entries()) {
            if (value.expiresAt < now) rateLimitMap.delete(key);
        }
    }

    return { success: true, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': (limit - current.count).toString() } };
}
