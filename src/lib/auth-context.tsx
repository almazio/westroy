
'use client';

import { useSession, signOut } from 'next-auth/react';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'client' | 'producer' | 'admin';
    companyId?: string;
}

export function useAuth() {
    const { data: session, status } = useSession();

    return {
        user: session?.user as User | null,
        isLoading: status === 'loading',
        login: () => { window.location.href = '/login' },
        logout: () => signOut({ callbackUrl: '/' }),
        switchRole: () => { console.warn('Switch role not supported in real auth') },
        isDemo: false
    };
}
