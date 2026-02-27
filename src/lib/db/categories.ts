import { prisma } from '../db';
import { Category, Region } from '../types';
import { mapCategory, mapRegion } from './mappers';

function hasConfiguredDatabaseUrl() {
    return Boolean(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}

export async function getRegions(): Promise<Region[]> {
    const regions = await prisma.region.findMany();
    return regions.map(mapRegion);
}

export async function getCategories(rootOnly = true): Promise<Category[]> {
    try {
        const categories = await prisma.category.findMany({
            where: rootOnly ? { parentId: null } : undefined,
            include: {
                children: true, // Fetch next level
            },
            orderBy: {
                nameRu: 'asc', // Sort alphabetically for better UX
            }
        });
        return categories.map(c => mapCategory(c as any));
    } catch (error) {
        if (!hasConfiguredDatabaseUrl()) {
            console.warn('[DB] getCategories fallback (no DB url):', error);
            return [
                { id: 'concrete', name: 'concrete', nameRu: 'Бетон', icon: '🧱', keywords: ['бетон', 'м300'] },
                { id: 'rebar', name: 'rebar', nameRu: 'Арматура', icon: '🔩', keywords: ['арматура', 'a500'] },
                { id: 'aggregates', name: 'aggregates', nameRu: 'Инертные', icon: '⛰️', keywords: ['щебень', 'песок'] },
                { id: 'blocks', name: 'blocks', nameRu: 'Блоки и кирпич', icon: '🧱', keywords: ['блок', 'кирпич'] },
            ];
        }
        throw error;
    }
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
    try {
        const category = await prisma.category.findUnique({
            where: { id },
            include: { children: true }
        });
        return category ? mapCategory(category as any) : undefined;
    } catch (error) {
        if (hasConfiguredDatabaseUrl()) throw error;
        console.warn('[DB] getCategoryById fallback (no DB url):', error);
        return (await getCategories(false)).find((c) => c.id === id);
    }
}
