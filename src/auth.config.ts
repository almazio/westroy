
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
        newUser: '/register',
    },
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const role = auth?.user?.role;
            const isOnClientDashboard = nextUrl.pathname.startsWith('/dashboard/client');
            const isOnProducerDashboard = nextUrl.pathname.startsWith('/dashboard/producer');
            const isOnAdmin = nextUrl.pathname.startsWith('/admin');
            const isOnAuth = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';

            if (isOnAdmin) {
                if (!isLoggedIn) return false;
                if (role !== 'admin') return Response.redirect(new URL('/', nextUrl));
                return true;
            }

            if (isOnClientDashboard) {
                if (!isLoggedIn) return false;
                if (role !== 'client' && role !== 'admin') return Response.redirect(new URL('/', nextUrl));
                return true;
            }

            if (isOnProducerDashboard) {
                if (!isLoggedIn) return false;
                if (role !== 'producer' && role !== 'admin') return Response.redirect(new URL('/', nextUrl));
                return true;
            }

            if (isLoggedIn && isOnAuth) {
                return Response.redirect(new URL('/', nextUrl));
            }

            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
