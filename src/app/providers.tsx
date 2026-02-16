
'use client'

import dynamic from "next/dynamic"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/lib/theme-context"

const PWAWidget = dynamic(() => import("@/components/pwa/PWAWidget"), { ssr: false })

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <SessionProvider>
                {children}
                <PWAWidget />
            </SessionProvider>
        </ThemeProvider>
    )
}
