
'use client'

import { authenticate } from '@/app/actions/auth'
import { useFormState, useFormStatus } from 'react-dom'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button className="btn btn-primary" aria-disabled={pending}>
            {pending ? 'Вход...' : 'Войти'}
        </button>
    )
}

function LoginPageContent() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined)
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'

    return (
        <div className={styles.container}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Вход в систему</h2>
                <form action={dispatch} className="flex flex-col gap-16">
                    <input type="hidden" name="redirectTo" value={callbackUrl} />
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input className="input" id="email" type="email" name="email" placeholder="example@mail.com" required />
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
                        Нет аккаунта заказчика? <Link href="/register">Зарегистрироваться</Link>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Я производитель: <Link href="/partners">Подать заявку на подключение</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div className="card">Загрузка...</div></div>}>
            <LoginPageContent />
        </Suspense>
    );
}
