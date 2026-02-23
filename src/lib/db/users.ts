import { prisma } from '../db';
import { User } from '../types';
import { mapUser } from './mappers';

export async function getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(mapUser);
}

export async function getUserById(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapUser(user) : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? mapUser(user) : undefined;
}
