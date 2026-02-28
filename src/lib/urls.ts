const PROD_APP_ORIGIN = "https://app.westroy.kz";

function normalizePath(path: string) {
    if (!path) return "/";
    return path.startsWith("/") ? path : `/${path}`;
}

function runtimeAppOrigin() {
    if (typeof window === "undefined") return null;
    const host = window.location.hostname.toLowerCase();

    // Support Vercel preview URLs
    if (host.includes("vercel.app") || host === "localhost" || host === "127.0.0.1") {
        return window.location.origin;
    }

    if (host === "app.westroy.kz") {
        return window.location.origin;
    }
    return null;
}

export function getAppOrigin() {
    return runtimeAppOrigin() || process.env.NEXT_PUBLIC_APP_ORIGIN || PROD_APP_ORIGIN;
}

export function toAppUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    return normalizePath(path);
}

export function toAbsoluteUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${getAppOrigin()}${normalizePath(path)}`;
}
