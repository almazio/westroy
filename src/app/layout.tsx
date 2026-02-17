import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import RouteChrome from "@/components/RouteChrome";

export const metadata: Metadata = {
  title: "WESTROY — Маркетплейс строительных решений в Шымкенте",
  description: "Опишите задачу и получите предложения от поставщиков бетона, инертных материалов, арматуры, блоков и спецтехники в Шымкенте.",
  keywords: ["Шымкент", "бетон", "строительные материалы", "производители", "стройматериалы", "арматура", "песок", "щебень"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WESTROY",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('westroy-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var v=(t==='light'||t==='dark')?t:m;document.documentElement.setAttribute('data-theme',v);document.documentElement.style.colorScheme=v;}catch(e){}})();`,
          }}
        />
        <Providers>
          <RouteChrome>{children}</RouteChrome>
        </Providers>
      </body>
    </html>
  );
}
