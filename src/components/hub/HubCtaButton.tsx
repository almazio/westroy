'use client';

import Link from 'next/link';
import { trackHubEvent } from '@/lib/analytics';

interface HubCtaButtonProps {
    href: string;
    label: string;
    className?: string;
    placement: string;
}

export default function HubCtaButton({ href, label, className, placement }: HubCtaButtonProps) {
    return (
        <Link
            href={href}
            className={className}
            onClick={() => trackHubEvent('hub_to_app_click', { placement, href })}
        >
            {label}
        </Link>
    );
}

