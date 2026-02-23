import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

function isValidRole(role: string): role is 'client' | 'producer' | 'admin' {
    return role === 'client' || role === 'producer' || role === 'admin';
}

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        requests: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(users);
    } catch (error) {
        log.error('Failed to fetch users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const phone = String(body.phone || '').trim();
        const password = String(body.password || '');
        const role = String(body.role || 'client');

        if (!name || !email || !phone || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!isValidRole(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 chars' }, { status: 400 });
        }

        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }]
            },
            select: { id: true }
        });
        if (existing) {
            return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                role,
                passwordHash
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true
            }
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        log.error('Failed to create user:', error);
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
            const target = (error as { meta?: { target?: string[] } }).meta?.target?.join(', ') || 'email/phone';
            return NextResponse.json({ error: `Уже существует пользователь с полем: ${target}` }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
