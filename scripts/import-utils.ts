import { PrismaClient } from '@prisma/client';

export function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

export function extractSourceUrl(description: string): string | null {
  const match = description.match(/Источник:\s*(https?:\/\/\S+)/i);
  return match?.[1] || null;
}

export function extractSourceHost(description: string): string | null {
  const url = extractSourceUrl(description);
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return null;
  }
}

type ExistingCompany = {
  id: string;
  name: string;
  phone: string;
  description: string;
};

export async function findExistingCompanySmart(
  prisma: PrismaClient,
  payload: { name: string; phone: string; description: string }
): Promise<ExistingCompany | null> {
  const targetPhone = normalizePhone(payload.phone);
  const targetHost = extractSourceHost(payload.description);
  const targetName = payload.name.trim().toLowerCase();

  const candidates = await prisma.company.findMany({
    where: {
      OR: [
        { name: payload.name },
        { phone: payload.phone },
      ],
    },
    select: { id: true, name: true, phone: true, description: true },
    take: 25,
  });

  for (const row of candidates) {
    if (normalizePhone(row.phone) === targetPhone && targetPhone) return row;
    if (row.name.trim().toLowerCase() === targetName) return row;
  }

  if (targetHost) {
    const byHost = await prisma.company.findMany({
      where: { description: { contains: targetHost, mode: 'insensitive' } },
      select: { id: true, name: true, phone: true, description: true },
      take: 10,
    });

    if (byHost.length > 0) {
      for (const row of byHost) {
        if (normalizePhone(row.phone) === targetPhone && targetPhone) return row;
      }
      return byHost[0];
    }
  }

  return null;
}
