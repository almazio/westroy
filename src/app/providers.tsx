
'use client'

import dynamic from "next/dynamic"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/lib/theme-context"
import AnalyticsManager from "@/components/analytics/AnalyticsManager"
import CookieConsentBanner from "@/components/analytics/CookieConsentBanner"

const PWAWidget = dynamic(() => import("@/components/pwa/PWAWidget"), { ssr: false })

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SessionProvider>
                {children}
                <AnalyticsManager />
                <CookieConsentBanner />
                <PWAWidget />
            </SessionProvider>
        </ThemeProvider>
    )
}
