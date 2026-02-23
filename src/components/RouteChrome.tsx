'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AppShell from '@/components/AppShell';

const APP_PREFIXES = ['/dashboard', '/admin', '/search', '/company'];

function isAppRoute(pathname: string) {
    return APP_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

function shouldHideNavbar(pathname: string) {
    const hiddenPrefixes = ['/offline'];
    return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function shouldHideFooter(pathname: string) {
    const hiddenPrefixes = ['/admin', '/dashboard', '/login', '/register', '/offline', '/search', '/company'];
    return hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default function RouteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // App routes get the AppShell (sidebar layout)
    if (isAppRoute(pathname)) {
        return <AppShell>{children}</AppShell>;
    }

    // Landing/marketing routes get Navbar + Footer
    const hideNavbar = shouldHideNavbar(pathname);
    const hideFooter = shouldHideFooter(pathname);

    return (
        <>
            {!hideNavbar && <Navbar />}
            <main>{children}</main>
            {!hideFooter && <Footer />}
        </>
    );
}
