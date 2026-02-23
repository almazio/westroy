// ============================================
// WESTROY — Search Page Utilities & Constants
// ============================================

export const REQUEST_INTENT_KEY = 'westroy_request_intent';

export { CATEGORY_LABELS } from '@/lib/constants';

export const recommendationByCategory: Record<string, string[]> = {
    aggregates: [
        'Мытый песок подходит для бетона и штукатурки.',
        'Карьерный песок выгоднее для засыпки и подушки под фундамент.',
    ],
    concrete: [
        'Для несущих конструкций чаще выбирают бетон М300 и выше.',
        'Проверьте время подачи миксера и возможность заливки в один цикл.',
    ],
    blocks: [
        'Газоблок удобен для теплых стен и быстрой кладки.',
        'Сразу уточняйте клей/раствор и подрезку под проект.',
    ],
    rebar: [
        'Сравнивайте не только цену, но и класс/диаметр арматуры.',
        'Уточняйте наличие сертификатов и длину прутка.',
    ],
    cement: [
        'Уточняйте марку цемента и дату фасовки перед заказом.',
        'Для больших объемов лучше сразу сравнивать навал и мешки.',
    ],
    'pvc-profiles': [
        'Сверяйте количество камер и метраж профиля перед заказом.',
        'Для ламинации заранее уточняйте доступные цвета и срок поставки.',
    ],
    'general-materials': [
        'Для материалов без цены отправляйте заявку сразу нескольким поставщикам.',
        'Перед оплатой уточняйте остатки, сроки и упаковку на складе.',
    ],
    'painting-tools': [
        'Выбирайте инструмент под тип покрытия: ворс для краски, резина для шпаклевки.',
        'Проверяйте расходники и совместимость с вашими материалами.',
    ],
    'hand-tools': [
        'Сравнивайте комплектацию и материал рукоятки для интенсивных работ.',
        'Для бригад выгоднее брать наборы с запасом расходников.',
    ],
    fasteners: [
        'Для внешних работ выбирайте оцинкованный крепеж.',
        'Проверяйте шаг резьбы и длину под конкретное основание.',
    ],
    electrical: [
        'Уточняйте сечение кабеля и класс защиты перед покупкой.',
        'Для щитов и автоматики проверяйте совместимость серий.',
    ],
    plumbing: [
        'Проверяйте диаметр и тип резьбы перед заказом фитингов.',
        'Сразу уточняйте наличие комплектующих для монтажа.',
    ],
    safety: [
        'Подбирайте СИЗ по типу работ и уровню защиты.',
        'Для постоянных объектов выгодно брать упаковками.',
    ],
    'adhesives-sealants': [
        'Выбирайте состав по температуре эксплуатации и типу основания.',
        'Проверяйте срок годности и условия хранения.',
    ],
};

// --- Types ---

export interface SearchResultData {
    company: {
        id: string; name: string; description: string; delivery: boolean;
        verified: boolean; address: string; phone: string; categoryId: string;
    };
    products: {
        id: string;
        name: string;
        description: string;
        article?: string;
        brand?: string;
        boxQuantity?: number;
        imageUrl?: string;
        source?: string;
        priceFrom: number;
        priceUnit: string;
        unit: string;
        updatedAt?: string;
        inStock?: boolean;
    }[];
    priceFrom: number;
    priceUnit: string;
    relevanceScore: number;
    stats?: {
        completedOrders: number;
        avgResponseMinutes: number | null;
    };
}

export interface ParsedData {
    category: string | null;
    categoryId: string | null;
    volume: string | null;
    unit: string | null;
    city: string | null;
    delivery: boolean | null;
    grade: string | null;
    confidence: number;
    suggestions: { type: string; label: string; value: string }[];
    originalQuery: string;
}

export interface GuestFormState {
    name: string;
    phone: string;
    quantity: string;
    address: string;
}

export interface PendingAuthIntent {
    payload: {
        categoryId: string;
        query: string;
        parsedCategory: string;
        parsedVolume?: string;
        parsedCity?: string | null;
        deliveryNeeded: boolean;
        address?: string;
        deadline?: string;
    };
}

export interface ProductOffer {
    productId: string;
    productName: string;
    productDescription: string;
    productArticle?: string;
    productBrand?: string;
    boxQuantity?: number;
    imageUrl?: string;
    source?: string;
    priceFrom: number;
    priceUnit: string;
    inStock: boolean;
    updatedAt?: string;
    companyId: string;
    companyName: string;
    companyAddress: string;
    companyDelivery: boolean;
    companyVerified: boolean;
    companyStats?: {
        completedOrders: number;
        avgResponseMinutes: number | null;
    };
}

// --- Helpers ---

export function formatPrice(price: number) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

export type UnitType = 'm3' | 't' | 'pcs' | null;

export function normalizeUnit(value?: string | null): UnitType {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (normalized.includes('м3') || normalized.includes('м³') || normalized.includes('куб')) return 'm3';
    if (normalized.includes('шт')) return 'pcs';
    if (normalized.includes('т')) return 't';
    return null;
}

export function convertQuantity(quantity: number, from: 'm3' | 't', to: 'm3' | 't') {
    if (from === to) return quantity;
    const densityFactor = 1.5;
    return from === 't' ? quantity / densityFactor : quantity * densityFactor;
}

export function formatRelativePriceUpdate(isoDate?: string) {
    if (!isoDate) return null;
    const updatedAt = new Date(isoDate);
    if (Number.isNaN(updatedAt.getTime())) return null;
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor((now.getTime() - updatedAt.getTime()) / dayMs);
    if (days <= 0) return 'сегодня';
    if (days === 1) return '1 день назад';
    if (days >= 2 && days <= 4) return `${days} дня назад`;
    return `${days} дней назад`;
}

export function getOfferImage(offer: { productName: string; productDescription: string; companyName: string }) {
    const text = `${offer.productName} ${offer.productDescription} ${offer.companyName}`.toLowerCase();
    if (text.includes('подокон') || text.includes('профил') || text.includes('ламбри') || text.includes('штапик') || text.includes('пвх')) {
        return '/images/catalog/pvc-profile.jpg';
    }
    if (text.includes('фанер') || text.includes('осп') || text.includes('дсп') || text.includes('двп')) {
        return '/images/catalog/wood-board.jpg';
    }
    if (text.includes('гипсокартон') || text.includes('штукатур') || text.includes('клей')) {
        return '/images/catalog/drywall.jpg';
    }
    if (text.includes('керамогранит') || text.includes('плитк')) {
        return '/images/catalog/tile.jpg';
    }
    if (text.includes('утепл') || text.includes('вата') || text.includes('подложк')) {
        return '/images/catalog/insulation.jpg';
    }
    if (text.includes('труба') || text.includes('муфта') || text.includes('канализа')) {
        return '/images/catalog/pipes.jpg';
    }
    if (text.includes('бетон') || text.includes('цемент')) {
        return '/images/catalog/concrete.jpg';
    }
    if (text.includes('песок') || text.includes('щеб')) {
        return '/images/catalog/aggregates.jpg';
    }
    return '/images/catalog/materials.jpg';
}
