'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { getAnalyticsConsent, trackPageView } from '@/lib/analytics';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-WN7K3LQ';
const YM_ID = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID || '106920149';

export default function AnalyticsManager() {
    const [consent, setConsent] = useState<'granted' | 'denied' | 'unknown'>('unknown');
    const pathname = usePathname();

    useEffect(() => {
        const current = getAnalyticsConsent();
        setConsent(current);
        if (typeof window !== 'undefined') {
            window.__westroyAnalyticsConsent = current;
        }

        const onConsentUpdated = (event: Event) => {
            const detail = (event as CustomEvent<'granted' | 'denied'>).detail;
            const nextConsent = detail === 'granted' || detail === 'denied' ? detail : getAnalyticsConsent();
            setConsent(nextConsent);
            if (typeof window !== 'undefined') {
                window.__westroyAnalyticsConsent = nextConsent;
            }
        };

        window.addEventListener('westroy:analytics-consent-updated', onConsentUpdated);
        return () => window.removeEventListener('westroy:analytics-consent-updated', onConsentUpdated);
    }, []);

    const query = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.search.replace(/^\?/, '');
    }, [pathname]);

    useEffect(() => {
        if (consent !== 'granted') return;
        trackPageView(pathname || '/', query);
    }, [consent, pathname, query]);

    if (consent !== 'granted') return null;

    return (
        <>
            <Script id="westroy-data-layer" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];`}
            </Script>

            <Script id="westroy-gtm-loader" strategy="afterInteractive">
                {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
            </Script>

            <Script id="westroy-ym-loader" strategy="afterInteractive">
                {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');ym(${YM_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:'dataLayer', referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
            </Script>
        </>
    );
}
