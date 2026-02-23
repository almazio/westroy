import { describe, it, expect, vi } from 'vitest';

// Mock llm-parser to avoid OpenAI initialization in test env
vi.mock('../../lib/llm-parser', () => ({
    parseQueryLLM: vi.fn(),
}));

import { parseQueryRegex } from '../ai-parser';

describe('parseQueryRegex', () => {
    it('should parse category from query', () => {
        const result = parseQueryRegex('бетон М300 20 кубов');
        expect(result.category).not.toBeNull();
        expect(result.categoryId).toBe('concrete');
    });

    it('should extract volume and unit', () => {
        const result = parseQueryRegex('песок 30 тонн с доставкой');
        expect(result.volume).toBe('30');
        expect(result.unit).toContain('т');
    });

    it('should detect delivery need', () => {
        const result = parseQueryRegex('щебень 10 тонн с доставкой в Шымкент');
        expect(result.delivery).toBe(true);
    });

    it('should detect city', () => {
        const result = parseQueryRegex('бетон в Шымкент');
        expect(result.city?.toLowerCase()).toContain('шымкент');
    });

    it('should detect grade', () => {
        const result = parseQueryRegex('бетон м300 50 кубов');
        expect(result.grade).toContain('300');
    });

    it('should fuzzy match categories', () => {
        const result = parseQueryRegex('нужен бетн для фундамента');
        // "бетн" is a typo of "бетон" — should still match via fuzzy
        expect(result.categoryId).toBe('concrete');
    });

    it('should handle no match gracefully', () => {
        const result = parseQueryRegex('привет как дела');
        expect(result.confidence).toBeLessThan(0.5);
    });

    it('should preserve originalQuery', () => {
        const query = 'арматура 10 тонн Шымкент';
        const result = parseQueryRegex(query);
        expect(result.originalQuery).toBe(query);
    });
});
