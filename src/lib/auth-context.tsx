
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'client' | 'producer' | 'admin';
    companyId?: string;
}

export function useAuth() {
    const { data: session, status } = useSession();
    const router = useRouter();

    return {
        user: session?.user as User | null,
        isLoading: status === 'loading',
        login: () => { router.push('/login'); },
        logout: async () => {
            await signOut({ redirect: false });
            router.push('/');
            router.refresh();
        },
        switchRole: () => { console.warn('Switch role not supported in real auth') },
        isDemo: false
    };
}
