'use client';

import { GuestFormState } from './search-utils';
import styles from './page.module.css';

interface GuestRequestFormProps {
    guestForm: GuestFormState;
    setGuestForm: (updater: (prev: GuestFormState) => GuestFormState) => void;
    guestSent: boolean;
    guestSubmitting: boolean;
    guestSeller: { name: string; type: 'producer' | 'dealer' } | null;
    onSubmit: () => void;
    onRegister: () => void;
    onLogin: () => void;
    onContinue: () => void;
    onPostRegister: () => void;
}

export default function GuestRequestForm({
    guestForm,
    setGuestForm,
    guestSent,
    guestSubmitting,
    guestSeller,
    onSubmit,
    onRegister,
    onLogin,
    onContinue,
    onPostRegister,
}: GuestRequestFormProps) {
    return (
        <div className={styles.guestInline}>
            <h4>📋 Запрос цены</h4>
            {guestSeller && (
                <p className={styles.guestSellerHint}>
                    Канал покупки: {guestSeller.type === 'producer' ? 'Производитель' : 'Дилер'} — {guestSeller.name}
                </p>
            )}
            <div className={styles.guestFields}>
                <input
                    className="input"
                    placeholder="Ваше имя"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                    className="input"
                    placeholder="+7 7XX XXX XX XX"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <input
                    className="input"
                    placeholder="Количество"
                    value={guestForm.quantity}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <input
                    className="input"
                    placeholder="Адрес доставки (опционально)"
                    value={guestForm.address}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, address: e.target.value }))}
                />
            </div>

            {!guestSent ? (
                <div className={styles.guestActions}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={onSubmit}
                        disabled={guestSubmitting}
                    >
                        {guestSubmitting ? 'Отправляем...' : 'Отправить как гость'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={onRegister}>
                        Создать аккаунт
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={onLogin}>
                        Войти
                    </button>
                </div>
            ) : (
                <div className={styles.guestSuccess}>
                    <p>✅ Гостевая заявка отправлена. Поставщик свяжется по телефону.</p>
                    <div className={styles.guestActions}>
                        <button className="btn btn-secondary btn-sm" onClick={onPostRegister}>
                            Создать аккаунт
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={onContinue}>
                            Продолжить поиск
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
