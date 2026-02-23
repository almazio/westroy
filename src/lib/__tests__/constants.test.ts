import { describe, it, expect } from 'vitest';
import { CATEGORY_LABELS } from '../constants';

describe('CATEGORY_LABELS', () => {
    it('should contain all expected categories', () => {
        expect(CATEGORY_LABELS).toHaveProperty('concrete');
        expect(CATEGORY_LABELS).toHaveProperty('aggregates');
        expect(CATEGORY_LABELS).toHaveProperty('blocks');
        expect(CATEGORY_LABELS).toHaveProperty('rebar');
        expect(CATEGORY_LABELS).toHaveProperty('cement');
        expect(CATEGORY_LABELS).toHaveProperty('machinery');
    });

    it('should have Russian labels', () => {
        expect(CATEGORY_LABELS.concrete).toBe('Бетон');
        expect(CATEGORY_LABELS.aggregates).toBe('Инертные материалы');
    });

    it('should have at least 10 categories', () => {
        expect(Object.keys(CATEGORY_LABELS).length).toBeGreaterThanOrEqual(10);
    });

    it('should not have empty values', () => {
        for (const [key, value] of Object.entries(CATEGORY_LABELS)) {
            expect(value, `Category "${key}" has empty label`).toBeTruthy();
        }
    });
});
