import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getBookingById, getBookingParticipants, getUsers, getCourtsOrdered } from '@/lib/db/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { ArrowLeft, Trophy } from 'lucide-react';
import { BookingDetailClient } from './BookingDetailClient';
import { LayoutGrid } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const booking = getBookingById(id);
  if (!booking || booking.status !== 'confirmed') {
    notFound();
  }

  const participants = getBookingParticipants(id);
  const users = getUsers().filter((u) => !u.is_hidden);
  const courts = getCourtsOrdered();
  const court = courts.find((c) => c.id === booking.court_id);
  const courtName = court?.name ?? booking.court_id;

  const isAdmin = user.role === 'admin';
  const isOwner = booking.booked_by_user_id === user.id || booking.created_by === user.id;
  const canEdit = isAdmin || isOwner;

  const participantsByPosition = [1, 2, 3, 4].map((pos) => ({
    position: pos,
    user_id: participants.find((p) => p.position === pos)?.user_id ?? null,
  }));

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <PageHeader
        title="Partita"
        subtitle={booking.booking_name}
        icon={LayoutGrid}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Centro sportivo', href: '/sports-center' },
          { label: booking.booking_name },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/sports-center"
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna al centro sportivo
        </Link>
        {booking.tournament_id && (
          <Link
            href={`/tournaments/${booking.tournament_id}`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            <Trophy className="w-4 h-4" />
            Vai al torneo
          </Link>
        )}
      </div>

      <BookingDetailClient
        booking={{
          id: booking.id,
          booking_name: booking.booking_name,
          court_id: booking.court_id,
          court_name: courtName,
          court_type: court?.type ?? 'indoor',
          date: booking.date,
          slot_start: booking.slot_start,
          slot_end: booking.slot_end,
        }}
        courts={courts.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        initialParticipants={participantsByPosition.map((p) => p.user_id)}
        users={users.map((u) => ({
          id: u.id,
          nickname: u.nickname,
          full_name: u.full_name,
          username: u.username,
        }))}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />
    </div>
  );
}
