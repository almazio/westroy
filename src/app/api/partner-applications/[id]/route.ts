import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { notifyOps } from '@/lib/notifications';
import { createLogger } from '@/lib/logger';

const log = createLogger('api');

function isValidStatus(value: string): value is 'pending' | 'approved' | 'rejected' {
    return value === 'pending' || value === 'approved' || value === 'rejected';
}

function generateTemporaryPassword(length = 12) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i += 1) {
        password += alphabet[bytes[i] % alphabet.length];
    }
    return password;
}

async function resolveCategoryId(input: string) {
    const normalized = input.trim().toLowerCase();
    if (!normalized) {
        const fallback = await prisma.category.findFirst({ select: { id: true } });
        return fallback?.id ?? null;
    }

    const category = await prisma.category.findFirst({
        where: {
            OR: [
                { id: { contains: normalized, mode: 'insensitive' } },
                { name: { contains: normalized, mode: 'insensitive' } },
                { nameRu: { contains: normalized, mode: 'insensitive' } },
            ],
        },
        select: { id: true },
    });
    if (category) return category.id;

    const fallback = await prisma.category.findFirst({ select: { id: true } });
    return fallback?.id ?? null;
}

async function resolveRegionId(city: string) {
    const normalized = city.trim().toLowerCase();
    if (normalized) {
        const region = await prisma.region.findFirst({
            where: {
                OR: [
                    { id: { contains: normalized, mode: 'insensitive' } },
                    { name: { contains: normalized, mode: 'insensitive' } },
                    { nameRu: { contains: normalized, mode: 'insensitive' } },
                ],
            },
            select: { id: true },
        });
        if (region) return region.id;
    }

    const fallback = await prisma.region.findFirst({ select: { id: true } });
    return fallback?.id ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const status = String(body.status || '').trim();
        if (!isValidStatus(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const existingApplication = await prisma.partnerApplication.findUnique({ where: { id } });
        if (!existingApplication) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        if (status !== 'approved') {
            const updated = await prisma.partnerApplication.update({
                where: { id },
                data: { status },
            });
            return NextResponse.json(updated);
        }

        const [categoryId, baseCityId] = await Promise.all([
            resolveCategoryId(existingApplication.category || ''),
            resolveRegionId(existingApplication.city || ''),
        ]);
        if (!categoryId || !baseCityId) {
            return NextResponse.json(
                { error: 'Missing category/region setup in DB. Seed categories and regions first.' },
                { status: 500 }
            );
        }

        let temporaryPassword: string | null = null;
        let createdNewUser = false;

        const result = await prisma.$transaction(async (tx) => {
            const application = await tx.partnerApplication.update({
                where: { id },
                data: { status: 'approved' },
            });

            let user = await tx.user.findFirst({
                where: {
                    OR: [
                        { email: application.email },
                        { phone: application.phone },
                    ],
                },
            });

            if (!user) {
                temporaryPassword = generateTemporaryPassword();
                const passwordHash = await bcrypt.hash(temporaryPassword, 10);
                user = await tx.user.create({
                    data: {
                        name: application.name,
                        email: application.email,
                        phone: application.phone,
                        role: 'producer',
                        passwordHash,
                    },
                });
                createdNewUser = true;
            } else if (user.role !== 'admin') {
                user = await tx.user.update({
                    where: { id: user.id },
                    data: { role: 'producer' },
                });
            }

            let company = await tx.company.findFirst({
                where: {
                    OR: [
                        { ownerId: user.id },
                        { name: application.companyName },
                    ],
                },
            });

            if (!company) {
                company = await tx.company.create({
                    data: {
                        name: application.companyName,
                        description: application.message || `${application.category} · ${application.city}`,
                        address: application.city,
                        phone: application.phone,
                        delivery: true,
                        verified: true,
                        categories: {
                            create: { categoryId }
                        },
                        baseCityId,
                        ownerId: user.id,
                    },
                });
            } else {
                company = await tx.company.update({
                    where: { id: company.id },
                    data: {
                        ownerId: company.ownerId || user.id,
                        verified: true,
                        phone: company.phone || application.phone,
                        address: company.address || application.city,
                        baseCityId: company.baseCityId || baseCityId,
                    },
                });
            }

            return { application, user, company };
        });

        await notifyOps(
            `Партнер одобрен: ${result.company.name}`,
            `Заявка: ${result.application.id}\nКомпания: ${result.company.name}\nПользователь: ${result.user.email}\nНовый аккаунт: ${createdNewUser ? 'да' : 'нет'}\n${temporaryPassword ? `Временный пароль: ${temporaryPassword}` : 'Пароль: существующий'}\n\nОткрыть: /admin`,
            { partnerApplicationId: result.application.id, userId: result.user.id, companyId: result.company.id }
        );

        return NextResponse.json({
            ...result.application,
            onboarding: {
                userId: result.user.id,
                email: result.user.email,
                phone: result.user.phone,
                companyId: result.company.id,
                companyName: result.company.name,
                isNewUser: createdNewUser,
                temporaryPassword,
            },
        });
    } catch (error) {
        log.error('Failed to update partner application:', error);
        return NextResponse.json({ error: 'Failed to update partner application' }, { status: 500 });
    }
}
