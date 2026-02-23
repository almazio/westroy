import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../rate-limit';

describe('checkRateLimit', () => {
    const config = { windowMs: 1000, maxRequests: 3 };

    it('should allow requests under the limit', () => {
        const id = `test-under-${Date.now()}`;
        const r1 = checkRateLimit(id, config);
        expect(r1.success).toBe(true);
        expect(r1.remaining).toBe(2);
    });

    it('should reject requests over the limit', () => {
        const id = `test-over-${Date.now()}`;
        checkRateLimit(id, config);
        checkRateLimit(id, config);
        checkRateLimit(id, config);
        const r4 = checkRateLimit(id, config);
        expect(r4.success).toBe(false);
        expect(r4.remaining).toBe(0);
    });

    it('should allow requests after window expires', async () => {
        const shortConfig = { windowMs: 50, maxRequests: 1 };
        const id = `test-expire-${Date.now()}`;
        checkRateLimit(id, shortConfig);
        const r2 = checkRateLimit(id, shortConfig);
        expect(r2.success).toBe(false);

        // Wait for window to expire
        await new Promise((r) => setTimeout(r, 60));
        const r3 = checkRateLimit(id, shortConfig);
        expect(r3.success).toBe(true);
    });

    it('should track different identifiers independently', () => {
        const ts = Date.now();
        const id1 = `test-id1-${ts}`;
        const id2 = `test-id2-${ts}`;
        checkRateLimit(id1, config);
        checkRateLimit(id1, config);
        checkRateLimit(id1, config);

        const r1 = checkRateLimit(id1, config);
        expect(r1.success).toBe(false);

        const r2 = checkRateLimit(id2, config);
        expect(r2.success).toBe(true);
    });
});
