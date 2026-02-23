// ============================================
// WESTROY — Cache Abstraction
// ============================================
// Uses in-memory Map by default. Can be swapped to Redis
// by setting REDIS_URL env var and installing ioredis.

export interface CacheStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    incr(key: string, ttlSeconds: number): Promise<number>;
}

// --- In-memory fallback (no Redis needed) ---

class MemoryCache implements CacheStore {
    private store = new Map<string, { value: string; expiresAt: number }>();

    async get(key: string): Promise<string | null> {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }

    async del(key: string): Promise<void> {
        this.store.delete(key);
    }

    async incr(key: string, ttlSeconds: number): Promise<number> {
        const entry = this.store.get(key);
        if (!entry || Date.now() > entry.expiresAt) {
            this.store.set(key, { value: '1', expiresAt: Date.now() + ttlSeconds * 1000 });
            return 1;
        }
        const newVal = parseInt(entry.value, 10) + 1;
        entry.value = String(newVal);
        return newVal;
    }
}

// --- Redis adapter (only if REDIS_URL is set) ---

let redisCache: CacheStore | null = null;

async function tryCreateRedisCache(): Promise<CacheStore | null> {
    const url = process.env.REDIS_URL;
    if (!url) return null;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Redis = require('ioredis');
        const client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
        await client.connect();

        return {
            async get(key) { return client.get(key); },
            async set(key, value, ttlSeconds) { await client.set(key, value, 'EX', ttlSeconds); },
            async del(key) { await client.del(key); },
            async incr(key, ttlSeconds) {
                const val = await client.incr(key);
                if (val === 1) await client.expire(key, ttlSeconds);
                return val;
            },
        };
    } catch {
        return null;
    }
}

// --- Singleton ---

const memoryFallback = new MemoryCache();
let initialized = false;

export async function getCache(): Promise<CacheStore> {
    if (!initialized) {
        initialized = true;
        redisCache = await tryCreateRedisCache();
    }
    return redisCache || memoryFallback;
}

// Synchronous accessor for hot paths (uses memory if Redis not ready)
export function getCacheSync(): CacheStore {
    return redisCache || memoryFallback;
}
