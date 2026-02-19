import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type HubAnalyticsBody = {
    source?: string;
    eventName?: string;
    payload?: Record<string, unknown>;
    pageUrl?: string;
    ts?: string;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as HubAnalyticsBody;
        const eventName = String(body.eventName || '').trim();
        const source = String(body.source || 'web').trim() || 'web';
        const payload = body.payload || {};
        const pageUrl = String(body.pageUrl || '').trim();
        const ts = body.ts || new Date().toISOString();

        if (!eventName) {
            return NextResponse.json({ error: 'Missing eventName' }, { status: 400 });
        }

        const record = {
            source,
            eventName,
            payload,
            pageUrl,
            ts,
        };

        // Vercel: rely on runtime logs
        console.info('[HubAnalytics]', JSON.stringify(record));

        // Local/dev fallback: append to file
        try {
            const logPath = path.join(process.cwd(), 'analytics-events.log');
            fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`);
        } catch {
            // ignore file errors in serverless runtime
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to ingest analytics event', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
