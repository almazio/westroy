'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MobileTabBar from '@/components/MobileTabBar';

function shouldHideNavbar(pathname: string) {
    const hiddenPrefixes = ['/offline'];
    return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function shouldHideFooter(pathname: string) {
    const hiddenPrefixes = ['/admin', '/dashboard', '/login', '/register', '/offline'];
    return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default function RouteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideNavbar = shouldHideNavbar(pathname);
    const hideFooter = shouldHideFooter(pathname);

    return (
        <>
            {!hideNavbar && <Navbar />}
            <main>{children}</main>
            {!hideFooter && <Footer />}
            {!hideFooter && <MobileTabBar />}
        </>
    );
}
