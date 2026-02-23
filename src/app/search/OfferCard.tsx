'use client';

import Link from 'next/link';
import { getDealersForOffer, type DealerCard } from '@/lib/test-dealers';
import { ProductOffer, GuestFormState, formatPrice, formatRelativePriceUpdate, getOfferImage, normalizeUnit, convertQuantity } from './search-utils';
import GuestRequestForm from './GuestRequestForm';
import styles from './page.module.css';

interface OfferCardProps {
    offer: ProductOffer;
    index: number;
    isSelected: boolean;
    showGuestInline: boolean;
    requestSubmitting: boolean;
    guestForm: GuestFormState;
    setGuestForm: (updater: (prev: GuestFormState) => GuestFormState) => void;
    guestSent: boolean;
    guestSubmitting: boolean;
    guestSeller: { name: string; type: 'producer' | 'dealer' } | null;
    requestedQuantity: number;
    hasRequestedQuantity: boolean;
    requestedUnit: 'm3' | 't' | 'pcs' | null;
    isAggregatesCategory: boolean;
    onToggleProduct: (companyId: string, productId: string) => void;
    onProductRequest: (companyId: string, productId: string, seller: { name: string; type: 'producer' | 'dealer' }) => void;
    onGuestSubmit: () => void;
    onGuestRegister: () => void;
    onGuestLogin: () => void;
    onGuestContinue: () => void;
    onGuestPostRegister: () => void;
}

export default function OfferCard({
    offer,
    index,
    isSelected,
    showGuestInline,
    requestSubmitting,
    guestForm,
    setGuestForm,
    guestSent,
    guestSubmitting,
    guestSeller,
    requestedQuantity,
    hasRequestedQuantity,
    requestedUnit,
    isAggregatesCategory,
    onToggleProduct,
    onProductRequest,
    onGuestSubmit,
    onGuestRegister,
    onGuestLogin,
    onGuestContinue,
    onGuestPostRegister,
}: OfferCardProps) {
    const calculateEstimatedTotalByOffer = (priceFrom: number, priceUnit: string) => {
        if (!hasRequestedQuantity) return null;
        const supplierUnit = normalizeUnit(priceUnit);
        if (!supplierUnit || !requestedUnit) return null;
        if (supplierUnit === requestedUnit) return Math.round(requestedQuantity * priceFrom);
        if (isAggregatesCategory && requestedUnit === 't' && supplierUnit === 'm3') {
            return Math.round(convertQuantity(requestedQuantity, 't', 'm3') * priceFrom);
        }
        if (isAggregatesCategory && requestedUnit === 'm3' && supplierUnit === 't') {
            return Math.round(convertQuantity(requestedQuantity, 'm3', 't') * priceFrom);
        }
        return null;
    };

    const estimatedTotal = calculateEstimatedTotalByOffer(offer.priceFrom, offer.priceUnit);
    const sellerCards = getDealersForOffer({
        companyId: offer.companyId,
        companyName: offer.companyName,
        priceFrom: offer.priceFrom,
        priceUnit: offer.priceUnit,
        companyDelivery: offer.companyDelivery,
    });

    return (
        <article className={styles.offerCard} style={{ animationDelay: `${index * 0.04}s` }}>
            <div className={styles.offerImageWrap}>
                <img
                    src={getOfferImage(offer)}
                    alt={offer.productName}
                    className={styles.offerImage}
                    loading="lazy"
                />
            </div>
            <div className={styles.offerTitle}>{offer.productName}</div>
            <div className={styles.offerPrice}>{formatPrice(offer.priceFrom)} ₸ <span>{offer.priceUnit}</span></div>
            <p className={styles.offerDesc}>{offer.productDescription}</p>

            <div className={styles.offerMeta}>
                {offer.companyDelivery && <span className="badge badge-success">🚚 Доставка</span>}
                {offer.companyVerified && <span className="badge badge-info">✓ Проверен</span>}
                {offer.companyStats?.avgResponseMinutes !== null && offer.companyStats?.avgResponseMinutes !== undefined && (
                    <span className="badge badge-warning">⚡ {offer.companyStats.avgResponseMinutes} мин</span>
                )}
            </div>

            {estimatedTotal !== null && (
                <div className={styles.offerTotal}>Итого для запроса: от {formatPrice(estimatedTotal)} ₸</div>
            )}

            <div className={styles.offerSupplier}>
                От: <Link href={`/company/${offer.companyId}`}>{offer.companyName}</Link>
            </div>
            <div className={styles.offerAddress}>{offer.companyAddress}</div>
            <div className={styles.offerUpdate}>Прайс обновлен: {formatRelativePriceUpdate(offer.updatedAt) || 'недавно'}</div>

            <div className={styles.offerActions}>
                <button
                    type="button"
                    className={`btn btn-secondary btn-sm ${isSelected ? styles.offerSelectActive : ''}`}
                    onClick={() => onToggleProduct(offer.companyId, offer.productId)}
                >
                    {isSelected ? 'В заявке' : 'Добавить в заявку'}
                </button>
            </div>

            <div className={styles.sellersList}>
                {sellerCards.map((seller: DealerCard) => {
                    const sellerPrice = seller.priceFrom > 0 ? `${formatPrice(seller.priceFrom)} ₸` : 'По запросу';
                    return (
                        <div
                            key={seller.id}
                            className={`${styles.sellerRow} ${seller.type === 'producer' ? styles.sellerProducer : ''}`}
                        >
                            <div className={styles.sellerMain}>
                                <div className={styles.sellerTitle}>
                                    {seller.type === 'producer' ? '🏭 Производитель' : '🏬 Дилер'}: {seller.name}
                                </div>
                                <div className={styles.sellerMeta}>
                                    <span>⭐ {seller.rating.toFixed(1)} ({seller.reviewCount})</span>
                                    <span>⚡ {seller.responseMinutes} мин</span>
                                    <span>{seller.delivery ? '🚚 Доставка' : 'Самовывоз'}</span>
                                </div>
                            </div>
                            <div className={styles.sellerBuy}>
                                <div className={styles.sellerPrice}>
                                    {sellerPrice} <span>{seller.priceUnit}</span>
                                </div>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => onProductRequest(offer.companyId, offer.productId, { name: seller.name, type: seller.type })}
                                    disabled={requestSubmitting}
                                >
                                    {seller.type === 'producer' ? 'Заказать напрямую' : 'Заказать у дилера'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showGuestInline && (
                <GuestRequestForm
                    guestForm={guestForm}
                    setGuestForm={setGuestForm}
                    guestSent={guestSent}
                    guestSubmitting={guestSubmitting}
                    guestSeller={guestSeller}
                    onSubmit={onGuestSubmit}
                    onRegister={onGuestRegister}
                    onLogin={onGuestLogin}
                    onContinue={onGuestContinue}
                    onPostRegister={onGuestPostRegister}
                />
            )}
        </article>
    );
}
