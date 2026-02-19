import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const APP_HOST = "app.westroy.kz";
const ROOT_HOSTS = new Set(["westroy.kz", "www.westroy.kz"]);
const APP_PATH_PREFIXES = ["/login", "/register", "/dashboard", "/admin", "/search", "/company"];

export default auth((request) => {
    const host = (request.headers.get("host") || "").toLowerCase();
    const { pathname, search } = request.nextUrl;
    const isRscRequest = request.headers.get("rsc") === "1" || request.nextUrl.searchParams.has("_rsc");

    const withAppNoIndex = (response: NextResponse) => {
        response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        return response;
    };

    // Marketing domain: keep landing routes here, move app routes to app subdomain
    if (ROOT_HOSTS.has(host)) {
        const isAppPath = APP_PATH_PREFIXES.some((prefix) =>
            pathname === prefix || pathname.startsWith(`${prefix}/`)
        );
        if (isAppPath) {
            if (isRscRequest) {
                return NextResponse.next();
            }
            const target = new URL(`https://${APP_HOST}${pathname}${search}`);
            return NextResponse.redirect(target);
        }
        return NextResponse.next();
    }

    if (host === APP_HOST) {
        return withAppNoIndex(NextResponse.next());
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
