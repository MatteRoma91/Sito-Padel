import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getBookingById,
  getBookingParticipants,
  getMatchByBookingId,
  updateCourtBookingMatchResult,
} from '@/lib/db/queries';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const booking = getBookingById(bookingId);
  if (!booking) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
  }

  const match = getMatchByBookingId(bookingId);
  if (!match) {
    return NextResponse.json(
      { error: 'Partita non confermata: nessun match per questa prenotazione' },
      { status: 400 }
    );
  }

  const endDateTime = new Date(`${booking.date}T${booking.slot_end}`);
  if (endDateTime > new Date()) {
    return NextResponse.json(
      { error: 'Il risultato può essere inserito solo dopo il termine della prenotazione' },
      { status: 400 }
    );
  }

  const isAdmin = user.role === 'admin';
  const participants = getBookingParticipants(bookingId);
  const participantUserIds = new Set(
    participants.map((p) => p.user_id).filter((id): id is string => id != null)
  );
  const isParticipant = participantUserIds.has(user.id);
  if (!isAdmin && !isParticipant) {
    return NextResponse.json(
      { error: 'Solo admin o un partecipante registrato può inserire il risultato' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      result_winner,
      set1,
      set2,
      set3,
    } = body;

    if (result_winner !== 1 && result_winner !== 2) {
      return NextResponse.json(
        { error: 'result_winner deve essere 1 (Coppia 1) o 2 (Coppia 2)' },
        { status: 400 }
      );
    }
    if (
      !set1 ||
      typeof set1.c1 !== 'number' ||
      typeof set1.c2 !== 'number' ||
      !set2 ||
      typeof set2.c1 !== 'number' ||
      typeof set2.c2 !== 'number'
    ) {
      return NextResponse.json(
        { error: 'set1 e set2 sono obbligatori con c1 e c2 numerici' },
        { status: 400 }
      );
    }

    const data: {
      result_winner: 1 | 2;
      result_set1_c1: number;
      result_set1_c2: number;
      result_set2_c1: number;
      result_set2_c2: number;
      result_set3_c1?: number;
      result_set3_c2?: number;
    } = {
      result_winner: result_winner as 1 | 2,
      result_set1_c1: Number(set1.c1),
      result_set1_c2: Number(set1.c2),
      result_set2_c1: Number(set2.c1),
      result_set2_c2: Number(set2.c2),
    };
    if (set3 != null && typeof set3 === 'object' && typeof set3.c1 === 'number' && typeof set3.c2 === 'number') {
      data.result_set3_c1 = Number(set3.c1);
      data.result_set3_c2 = Number(set3.c2);
    }

    updateCourtBookingMatchResult(bookingId, data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update match result error:', err);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
