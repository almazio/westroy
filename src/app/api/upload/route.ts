
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { auth } from '@/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validation
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Check size (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        // Check type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only images allowed' }, { status: 400 });
        }

        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.name);
        const filename = `upload-${uniqueSuffix}${ext}`;

        // Save to public/uploads
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return URL
        const url = `/uploads/${filename}`;
        return NextResponse.json({ url });

    } catch (error) {
        log.error('Upload failed:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
