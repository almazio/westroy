import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

function isValidRole(role: string): role is 'client' | 'producer' | 'admin' {
    return role === 'client' || role === 'producer' || role === 'admin';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const nextName = body.name !== undefined ? String(body.name).trim() : undefined;
        const nextPhone = body.phone !== undefined ? String(body.phone).trim() : undefined;
        const nextRole = body.role !== undefined ? String(body.role) : undefined;
        const nextPassword = body.password !== undefined ? String(body.password) : undefined;

        if (nextRole !== undefined && !isValidRole(nextRole)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        if (session.user.id === id && nextRole && nextRole !== 'admin') {
            return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 });
        }
        if (nextPassword !== undefined && nextPassword.length > 0 && nextPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 chars' }, { status: 400 });
        }

        if (nextPhone && nextPhone !== existing.phone) {
            const phoneConflict = await prisma.user.findUnique({
                where: { phone: nextPhone },
                select: { id: true }
            });
            if (phoneConflict) {
                return NextResponse.json({ error: 'Phone already exists' }, { status: 409 });
            }
        }

        const data: {
            name?: string;
            phone?: string;
            role?: 'client' | 'producer' | 'admin';
            passwordHash?: string;
        } = {};

        if (nextName !== undefined && nextName.length > 0) data.name = nextName;
        if (nextPhone !== undefined && nextPhone.length > 0) data.phone = nextPhone;
        if (nextRole !== undefined) data.role = nextRole;
        if (nextPassword && nextPassword.length > 0) {
            data.passwordHash = await bcrypt.hash(nextPassword, 10);
        }

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (session.user.id === id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    try {
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.request.deleteMany({ where: { userId: id } });

            const company = await tx.company.findUnique({ where: { ownerId: id } });
            if (company) {
                await tx.offer.deleteMany({ where: { companyId: company.id } });
                await tx.product.deleteMany({ where: { companyId: company.id } });
                await tx.company.delete({ where: { id: company.id } });
            }

            await tx.user.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
