import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'WESTROY',
        short_name: 'WESTROY',
        description: 'AI-поиск строительных решений и поставщиков стройматериалов',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0f',
        theme_color: '#f59e0b',
        lang: 'ru',
        icons: [
            {
                src: '/icons/icon-192.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'any'
            },
            {
                src: '/icons/icon-512.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'maskable'
            }
        ]
    };
}
