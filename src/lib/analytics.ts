'use client';

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
        ym?: (...args: unknown[]) => void;
        __westroyAnalyticsConsent?: 'granted' | 'denied' | 'unknown';
    }
}

export const ANALYTICS_CONSENT_KEY = 'westroy-analytics-consent';

export function getAnalyticsConsent(): 'granted' | 'denied' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
    return 'unknown';
}

export function setAnalyticsConsent(value: 'granted' | 'denied') {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    window.__westroyAnalyticsConsent = value;
    window.dispatchEvent(new CustomEvent('westroy:analytics-consent-updated', { detail: value }));
}

function hasAnalyticsConsent() {
    if (typeof window === 'undefined') return false;
    const consent = window.__westroyAnalyticsConsent || getAnalyticsConsent();
    return consent === 'granted';
}

function getYmCounterId(): number | null {
    const raw = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID || '106920149';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

export function trackEvent(eventName: string, payload: AnalyticsPayload = {}, source: 'web' | 'hub' = 'web') {
    if (typeof window === 'undefined') return;
    if (!hasAnalyticsConsent()) return;

    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
    }

    if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
            event: eventName,
            ...payload,
        });
    }

    const ymCounterId = getYmCounterId();
    if (ymCounterId && typeof window.ym === 'function') {
        try {
            window.ym(ymCounterId, 'reachGoal', eventName, payload);
        } catch {
            // noop
        }
    }

    const body = JSON.stringify({
        source,
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

export function trackPageView(pathname: string, search: string = '') {
    trackEvent('page_view', {
        page_path: pathname,
        page_query: search,
    });
}

export function trackHubEvent(eventName: string, payload: AnalyticsPayload = {}) {
    trackEvent(eventName, payload, 'hub');
}
