export interface DealerCard {
    id: string;
    name: string;
    city: string;
    rating: number;
    reviewCount: number;
    responseMinutes: number;
    delivery: boolean;
    type: 'producer' | 'dealer';
    priceFrom: number;
    priceUnit: string;
}

const TEST_DEALERS_BY_COMPANY: Record<string, Array<Omit<DealerCard, 'priceFrom' | 'priceUnit' | 'type'>>> = {
    'Идеал Пласт': [
        { id: 'ideal-trade', name: 'Ideal Trade Center', city: 'Шымкент', rating: 4.8, reviewCount: 41, responseMinutes: 18, delivery: true },
        { id: 'okna-city', name: 'Окна City Дилер', city: 'Шымкент', rating: 4.7, reviewCount: 29, responseMinutes: 24, delivery: true },
    ],
    'Торговый Дом Мансуров': [
        { id: 'mansurov-profi', name: 'Mansurov Profi Store', city: 'Шымкент', rating: 4.9, reviewCount: 57, responseMinutes: 16, delivery: true },
        { id: 'sairam-stroy', name: 'Сайрам Строй Дилер', city: 'Шымкент', rating: 4.6, reviewCount: 33, responseMinutes: 27, delivery: false },
    ],
};

function applyDealerMarkup(basePrice: number, index: number): number {
    if (!basePrice || basePrice <= 0) return 0;
    const markup = index === 0 ? 1.04 : 1.08;
    return Math.round(basePrice * markup);
}

export function getDealersForOffer(params: {
    companyId: string;
    companyName: string;
    priceFrom: number;
    priceUnit: string;
    companyDelivery: boolean;
}): DealerCard[] {
    const { companyId, companyName, priceFrom, priceUnit, companyDelivery } = params;

    const producer: DealerCard = {
        id: `${companyId}-producer`,
        name: companyName,
        city: 'Шымкент',
        rating: 5,
        reviewCount: 0,
        responseMinutes: 12,
        delivery: companyDelivery,
        type: 'producer',
        priceFrom,
        priceUnit,
    };

    const base = TEST_DEALERS_BY_COMPANY[companyName] || [
        { id: 'market-plus', name: 'Market Plus', city: 'Шымкент', rating: 4.7, reviewCount: 18, responseMinutes: 22, delivery: true },
        { id: 'region-trade', name: 'Region Trade', city: 'Шымкент', rating: 4.5, reviewCount: 12, responseMinutes: 31, delivery: false },
    ];

    const dealers: DealerCard[] = base.map((dealer, index) => ({
        ...dealer,
        id: `${companyId}-${dealer.id}`,
        type: 'dealer',
        priceFrom: applyDealerMarkup(priceFrom, index),
        priceUnit,
    }));

    return [producer, ...dealers];
}
