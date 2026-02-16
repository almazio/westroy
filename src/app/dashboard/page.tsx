import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardEntryPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login?callbackUrl=%2Fdashboard');
    }

    if (session.user.role === 'admin') {
        redirect('/admin');
    }

    if (session.user.role === 'producer') {
        redirect('/dashboard/producer');
    }

    redirect('/dashboard/client');
}
