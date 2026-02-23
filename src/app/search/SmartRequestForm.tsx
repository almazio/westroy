'use client';

import styles from './page.module.css';

interface SmartRequestFormProps {
    requestForm: { address: string; deadline: string };
    onFormChange: (updater: (prev: { address: string; deadline: string }) => { address: string; deadline: string }) => void;
    onSubmit: () => void;
    submitting: boolean;
}

export default function SmartRequestForm({ requestForm, onFormChange, onSubmit, submitting }: SmartRequestFormProps) {
    return (
        <div className={styles.requestForm}>
            <h3>📨 Smart Request — уточните детали</h3>
            <p className={styles.requestFormHint}>
                Производители получат вашу заявку и пришлют точные цены
            </p>
            <div className={styles.requestFormFields}>
                <div className="form-group">
                    <label>Адрес доставки</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="ул. Абая, 100, Шымкент"
                        value={requestForm.address}
                        onChange={e => onFormChange(f => ({ ...f, address: e.target.value }))}
                    />
                </div>
                <div className="form-group">
                    <label>Срок (когда нужно)</label>
                    <input
                        type="date"
                        className="input"
                        value={requestForm.deadline}
                        onChange={e => onFormChange(f => ({ ...f, deadline: e.target.value }))}
                    />
                </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={onSubmit} disabled={submitting}>
                {submitting ? 'Отправляем...' : 'Отправить заявку производителям'}
            </button>
        </div>
    );
}
