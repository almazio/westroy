import { describe, it, expect } from 'vitest';
import {
    formatPrice,
    normalizeUnit,
    convertQuantity,
    formatRelativePriceUpdate,
    getOfferImage,
} from '../../app/search/search-utils';

describe('formatPrice', () => {
    it('should format numbers with Russian locale', () => {
        expect(formatPrice(28000)).toBe('28\u00A0000');
    });

    it('should handle zero', () => {
        expect(formatPrice(0)).toBe('0');
    });
});

describe('normalizeUnit', () => {
    it('should normalize cubic meter variants', () => {
        expect(normalizeUnit('м3')).toBe('m3');
        expect(normalizeUnit('м³')).toBe('m3');
        expect(normalizeUnit('куб')).toBe('m3');
    });

    it('should normalize ton', () => {
        expect(normalizeUnit('тонна')).toBe('t');
        expect(normalizeUnit('тонн')).toBe('t');
    });

    it('should normalize pieces', () => {
        expect(normalizeUnit('шт')).toBe('pcs');
    });

    it('should return null for unknown units', () => {
        expect(normalizeUnit('рейс')).toBeNull();
        expect(normalizeUnit(null)).toBeNull();
        expect(normalizeUnit(undefined)).toBeNull();
    });
});

describe('convertQuantity', () => {
    it('should return same quantity for same units', () => {
        expect(convertQuantity(10, 'm3', 'm3')).toBe(10);
    });

    it('should convert m3 to tons (factor 1.5)', () => {
        expect(convertQuantity(10, 'm3', 't')).toBe(15);
    });

    it('should convert tons to m3', () => {
        expect(convertQuantity(15, 't', 'm3')).toBe(10);
    });
});

describe('formatRelativePriceUpdate', () => {
    it('should return "сегодня" for today', () => {
        expect(formatRelativePriceUpdate(new Date().toISOString())).toBe('сегодня');
    });

    it('should return null for invalid dates', () => {
        expect(formatRelativePriceUpdate('invalid')).toBeNull();
        expect(formatRelativePriceUpdate(undefined)).toBeNull();
    });

    it('should return days ago for past dates', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
        const result = formatRelativePriceUpdate(twoDaysAgo);
        expect(result).toContain('дн');
    });
});

describe('getOfferImage', () => {
    it('should return PVC image for profile products', () => {
        expect(getOfferImage({
            productName: 'ПВХ профиль',
            productDescription: 'Для окон',
            companyName: 'Test',
        })).toBe('/images/catalog/pvc-profile.jpg');
    });

    it('should return concrete image for бетон', () => {
        expect(getOfferImage({
            productName: 'Бетон М300',
            productDescription: 'Товарный',
            companyName: 'Test',
        })).toBe('/images/catalog/concrete.jpg');
    });

    it('should return default for unknown products', () => {
        expect(getOfferImage({
            productName: 'Что-то странное',
            productDescription: 'Описание',
            companyName: 'Test',
        })).toBe('/images/catalog/materials.jpg');
    });
});
