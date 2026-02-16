'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function shouldHideChrome(pathname: string) {
    const hiddenPrefixes = ['/admin', '/dashboard', '/login', '/register', '/offline'];
    return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default function RouteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideChrome = shouldHideChrome(pathname);

    if (hideChrome) {
        return <main>{children}</main>;
    }

    return (
        <>
            <Navbar />
            <main>{children}</main>
            <Footer />
        </>
    );
}
