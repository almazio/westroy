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
    viewMode: 'grid-2' | 'grid-3' | 'list';
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
    viewMode,
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
    return (
        <article className={`${styles.offerCard} ${viewMode === 'list' ? styles.offerCardList : ''}`} style={{ animationDelay: `${index * 0.04}s` }}>
            <div className={styles.offerImageWrap}>
                <img
                    src={offer.imageUrl || getOfferImage(offer)}
                    alt={offer.productName}
                    className={styles.offerImage}
                    loading="lazy"
                />
            </div>
            <div className={styles.offerTitle}>{offer.productName}</div>
            <div className={styles.offerPrice}>{formatPrice(offer.priceFrom)} ₸ <span>{offer.priceUnit}</span></div>
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
            </div>

            {estimatedTotal !== null && (
                <div className={styles.offerTotal}>Итого для запроса: от {formatPrice(estimatedTotal)} ₸</div>
            )}

            <div className={styles.offerSupplier}>
                От: <Link href={`/company/${offer.companyId}`}>{offer.companyName}</Link>
            </div>
            <div className={styles.offerAddress}>{offer.companyAddress}</div>
            <div className={styles.offerUpdate}>Прайс обновлен: {formatRelativePriceUpdate(offer.updatedAt) || 'недавно'}</div>
            {offer.source && <div className={styles.offerUpdate}>Источник: {offer.source}</div>}

            <div className={styles.offerActions}>
                <button
                    type="button"
                    className={`btn btn-secondary btn-sm ${isSelected ? styles.offerSelectActive : ''}`}
                    onClick={() => onToggleProduct(offer.companyId, offer.productId)}
                >
                    {isSelected ? 'В заявке' : 'Добавить в заявку'}
                </button>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onProductRequest(offer.companyId, offer.productId, { name: offer.companyName, type: 'producer' })}
                    disabled={requestSubmitting}
                >
                    Запросить цену
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
