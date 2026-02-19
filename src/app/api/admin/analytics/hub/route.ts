import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';

type HubEvent = {
    source?: string;
    eventName?: string;
    payload?: Record<string, unknown>;
    pageUrl?: string;
    ts?: string;
};

function readEventsFromLog(): HubEvent[] {
    const logPath = path.join(process.cwd(), 'analytics-events.log');
    if (!fs.existsSync(logPath)) return [];

    const raw = fs.readFileSync(logPath, 'utf8');
    return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            try {
                return JSON.parse(line) as HubEvent;
            } catch {
                return null;
            }
        })
        .filter((item): item is HubEvent => Boolean(item))
        .filter((item) => item.source === 'hub');
}

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const events = readEventsFromLog();
        const total = events.length;
        const hubToAppClicks = events.filter((e) => e.eventName === 'hub_to_app_click').length;
        const uniquePages = new Set(events.map((e) => e.pageUrl).filter(Boolean)).size;

        const byPlacement = new Map<string, number>();
        for (const event of events) {
            const placement = String(event.payload?.placement || 'unknown');
            byPlacement.set(placement, (byPlacement.get(placement) || 0) + 1);
        }

        const topPlacements = Array.from(byPlacement.entries())
            .map(([placement, count]) => ({ placement, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const recentEvents = events
            .slice(-100)
            .reverse()
            .map((event) => ({
                eventName: event.eventName || 'unknown',
                pageUrl: event.pageUrl || '',
                ts: event.ts || '',
                payload: event.payload || {},
            }));

        return NextResponse.json({
            summary: {
                total,
                hubToAppClicks,
                uniquePages,
            },
            topPlacements,
            recentEvents,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to read hub analytics', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

