'use client';

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

export function trackHubEvent(eventName: string, payload: AnalyticsPayload = {}) {
    if (typeof window === 'undefined') return;

    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
    }

    if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
            event: eventName,
            ...payload,
        });
    }

    const body = JSON.stringify({
        eventName,
        payload,
        pageUrl: window.location.href,
        ts: new Date().toISOString(),
    });

    if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/hub', blob);
        return;
    }

    void fetch('/api/analytics/hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    });
}
