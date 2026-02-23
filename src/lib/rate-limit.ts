// ============================================
// WESTROY — Rate Limiter (In-Memory Sliding Window)
// ============================================

interface RateLimitConfig {
    windowMs: number;   // Time window in milliseconds
    maxRequests: number; // Max requests per window
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetMs: number;
}

// Store: IP -> timestamps[]
const store = new Map<string, number[]>();

// Periodical cleanup to avoid memory leaks (every 5 min)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    const cutoff = now - windowMs;
    for (const [key, timestamps] of store.entries()) {
        const valid = timestamps.filter((t) => t > cutoff);
        if (valid.length === 0) {
            store.delete(key);
        } else {
            store.set(key, valid);
        }
    }
}

export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const { windowMs, maxRequests } = config;

    cleanup(windowMs);

    const timestamps = store.get(identifier) || [];
    const cutoff = now - windowMs;
    const valid = timestamps.filter((t) => t > cutoff);

    if (valid.length >= maxRequests) {
        const oldestInWindow = valid[0];
        const resetMs = oldestInWindow + windowMs - now;
        return {
            success: false,
            remaining: 0,
            resetMs: Math.max(resetMs, 0),
        };
    }

    valid.push(now);
    store.set(identifier, valid);

    return {
        success: true,
        remaining: maxRequests - valid.length,
        resetMs: windowMs,
    };
}

export function getClientIp(request: Request): string {
    const headers = new Headers(request.headers);
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}

// Pre-configured rate limiters
export const rateLimits = {
    api: { windowMs: 60_000, maxRequests: 10 },       // 10 req/min
    guestForm: { windowMs: 60_000, maxRequests: 5 },   // 5 req/min
    auth: { windowMs: 300_000, maxRequests: 10 },       // 10 req/5min
} as const;
