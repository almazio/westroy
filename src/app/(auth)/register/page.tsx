
'use client'

import { register } from '@/app/actions/auth'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import styles from '../login/page.module.css'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button className="btn btn-primary" aria-disabled={pending}>
            {pending ? 'Регистрация...' : 'Создать аккаунт'}
        </button>
    )
}

export default function RegisterPage() {
    const [errorMessage, dispatch] = useFormState(register, undefined)

    return (
        <div className={styles.container}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Регистрация</h2>
                <p style={{ marginBottom: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Регистрация доступна для заказчиков. Производители подключаются через заявку.
                </p>
                <form action={dispatch} className="flex flex-col gap-16">
                    <div className="form-group">
                        <label htmlFor="name">Имя</label>
                        <input className="input" id="name" type="text" name="name" placeholder="Иван Иванов" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input className="input" id="email" type="email" name="email" placeholder="example@mail.com" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Телефон</label>
                        <input className="input" id="phone" type="tel" name="phone" placeholder="+7 700 000 0000" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <input className="input" id="password" type="password" name="password" required minLength={6} />
                    </div>

                    {errorMessage && (
                        <div className="badge badge-error" style={{ justifyContent: 'center' }}>
                            {errorMessage}
                        </div>
                    )}
                    <SubmitButton />
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Уже есть аккаунт? <Link href="/login">Войти</Link>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Я производитель: <Link href="/partners">Подать заявку на подключение</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
