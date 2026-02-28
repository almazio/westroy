'use client';

import Link from 'next/link';
import { ProductOffer, GuestFormState, formatPrice, formatRelativePriceUpdate, getOfferImage, normalizeUnit, convertQuantity } from './search-utils';
import GuestRequestForm from './GuestRequestForm';
import styles from './page.module.css';

interface OfferCardProps {
    offer: ProductOffer;
    index: number;
    isSelected: boolean;
    showGuestInline: boolean;
    guestForm: GuestFormState;
    setGuestForm: (updater: (prev: GuestFormState) => GuestFormState) => void;
    guestSent: boolean;
    guestSubmitting: boolean;
    guestSeller: { name: string; type: 'producer' | 'dealer' } | null;
    requestedQuantity: number;
    hasRequestedQuantity: boolean;
    requestedUnit: 'm3' | 't' | 'pcs' | null;
    isAggregatesCategory: boolean;
    viewMode: 'grid-2' | 'grid-3' | 'list';
    onToggleProduct: (companyId: string, productId: string) => void;
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
    guestForm,
    setGuestForm,
    guestSent,
    guestSubmitting,
    guestSeller,
    requestedQuantity,
    hasRequestedQuantity,
    requestedUnit,
    isAggregatesCategory,
    viewMode,
    onToggleProduct,
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
    const isPriceOnRequest = offer.priceFrom <= 0 || (offer.priceUnit || '').toLowerCase().includes('запрос');
    return (
        <article className={`${styles.offerCard} ${viewMode === 'list' ? styles.offerCardList : ''}`} style={{ animationDelay: `${index * 0.04}s` }}>
            <div className={styles.offerImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={offer.imageUrl || getOfferImage(offer)}
                    alt={offer.productName}
                    className={styles.offerImage}
                    loading="lazy"
                />
            </div>
            <div className={styles.offerTitle}>{offer.productName}</div>
            <div className={styles.offerPrice}>
                {isPriceOnRequest ? 'Цена по запросу' : `${formatPrice(offer.priceFrom)} ₸`}
                <span>{isPriceOnRequest ? '' : offer.priceUnit}</span>
            </div>
            <p className={styles.offerDesc}>{offer.productDescription}</p>
            {(offer.productArticle || offer.productBrand || offer.boxQuantity) && (
                <div className={styles.offerMeta}>
                    {offer.productArticle && <span className="badge">Артикул: {offer.productArticle}</span>}
                    {offer.productBrand && <span className="badge">{offer.productBrand}</span>}
                    {offer.boxQuantity && <span className="badge">Упаковка: {offer.boxQuantity} шт</span>}
                </div>
            )}

            <div className={styles.offerMeta}>
                {offer.companyDelivery && <span className="badge badge-success">🚚 Доставка</span>}
                {offer.companyVerified && <span className="badge badge-info">✓ Проверен</span>}
                {offer.inStock ? <span className="badge badge-success">В наличии</span> : <span className="badge">Под заказ</span>}
                {offer.companyStats?.avgResponseMinutes !== null && offer.companyStats?.avgResponseMinutes !== undefined && (
                    <span className="badge badge-warning">⚡ {offer.companyStats.avgResponseMinutes} мин</span>
                )}
                {offer.companyStats?.rating !== undefined && offer.companyStats?.reviewCount !== undefined && offer.companyStats.reviewCount > 0 && (
                    <span className="badge" style={{ backgroundColor: '#FFD700', color: '#000', fontWeight: 'bold' }}>
                        ⭐ {offer.companyStats.rating} ({offer.companyStats.reviewCount})
                    </span>
                )}
            </div>

            {estimatedTotal !== null && (
                <div className={styles.offerTotal}>Итого для запроса: от {formatPrice(estimatedTotal)} ₸</div>
            )}

            <div className={styles.offerSupplier}>
                От: <Link href={`/company/${offer.companySlug || offer.companyId}`}>{offer.companyName}</Link>
            </div>
            <div className={styles.offerAddress}>{offer.companyAddress}</div>
            <div className={styles.offerUpdate}>Прайс обновлен: {formatRelativePriceUpdate(offer.updatedAt) || 'недавно'}</div>

            <div className={styles.offerActions}>
                <button
                    type="button"
                    className={`btn btn-primary btn-sm ${isSelected ? styles.offerSelectActive : ''}`}
                    onClick={() => onToggleProduct(offer.companyId, offer.productId)}
                >
                    {isSelected ? 'В заявке' : 'Добавить в заявку'}
                </button>
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
