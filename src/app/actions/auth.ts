
'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        const redirectTo = (formData.get('redirectTo') as string) || '/';
        await signIn('credentials', { ...Object.fromEntries(formData), redirectTo })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.'
                default:
                    return 'Something went wrong.'
            }
        }
        throw error
    }
}

export async function register(prevState: string | undefined, formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;

    if (!email || !password || !name || !phone) {
        return 'Missing fields';
    }

    // Check if user exists (email or phone)
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { phone }
            ]
        },
    });

    if (existingUser) {
        return 'Email or Phone already registered';
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    try {
        await prisma.user.create({
            data: {
                name,
                email,
                phone,
                passwordHash: hashedPassword,
                role: 'client',
            },
        });
    } catch (err) {
        console.error(err);
        return 'Failed to create user';
    }

    redirect('/login?registered=1');
}
