'use client';

import Link from 'next/link';

type Slot = { slot_start: string; slot_end: string; status: 'free' | 'occupied' | 'closed'; booking_id?: string };

type CourtRow = {
  court_id: string;
  court_name: string;
  court_type: string;
  slots: Slot[];
};

type GridBooking = { id: string; court_id: string; slot_start: string; slot_end: string; booking_name: string; tournament_id?: string | null };

function slotSpan(slotStart: string, slotEnd: string): number {
  const [sh, sm] = slotStart.split(':').map(Number);
  const [eh, em] = slotEnd.split(':').map(Number);
  const startMin = (sh ?? 0) * 60 + (sm ?? 0);
  const endMin = (eh ?? 0) * 60 + (em ?? 0);
  return (endMin - startMin) / 30;
}

function isSlotInside(slotStart: string, b: { slot_start: string; slot_end: string }): boolean {
  const [sh, sm] = slotStart.split(':').map(Number);
  const [bsh, bsm] = b.slot_start.split(':').map(Number);
  const [beh, bem] = b.slot_end.split(':').map(Number);
  const slotMin = (sh ?? 0) * 60 + (sm ?? 0);
  const startMin = (bsh ?? 0) * 60 + (bsm ?? 0);
  const endMin = (beh ?? 0) * 60 + (bem ?? 0);
  return slotMin >= startMin && slotMin < endMin;
}

interface CourtGridProps {
  courts: CourtRow[];
  bookings?: GridBooking[];
  canBook: boolean;
  onSlotClick: (courtId: string, courtName: string, slotStart: string, slotEnd: string) => void;
}

export function CourtGrid({ courts, bookings = [], canBook, onSlotClick }: CourtGridProps) {
  if (!courts.length) return null;

  const allStarts = new Set<string>();
  courts.forEach((c) => c.slots.forEach((s) => allStarts.add(s.slot_start)));
  const sortedStarts = Array.from(allStarts).sort();

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[600px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-200 dark:border-primary-700">
              <th className="text-left p-2 font-semibold text-slate-700 dark:text-slate-300 w-20">Ora</th>
              {courts.map((c) => (
                <th key={c.court_id} className="p-2 font-semibold text-slate-700 dark:text-slate-300">
                  <span>{c.court_name}</span>
                  <span className="ml-1 text-xs font-normal text-slate-500">({c.court_type === 'indoor' ? 'coperto' : 'scoperto'})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStarts.map((slotStart) => {
              const firstSlot = courts[0]?.slots.find((s) => s.slot_start === slotStart);
              const slotEnd = firstSlot?.slot_end ?? '';
              return (
                <tr key={slotStart} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {slotStart}–{slotEnd}
                  </td>
                  {courts.map((court) => {
                    const slot = court.slots.find((s) => s.slot_start === slotStart);
                    const startBooking = bookings.find(
                      (b) => b.court_id === court.court_id && b.slot_start === slotStart
                    );
                    const insideBooking = bookings.some(
                      (b) => b.court_id === court.court_id && isSlotInside(slotStart, b) && b.slot_start !== slotStart
                    );

                    if (insideBooking) {
                      return null;
                    }
                    if (startBooking) {
                      const rowSpan = slotSpan(startBooking.slot_start, startBooking.slot_end);
                      return (
                        <td
                          key={court.court_id}
                          rowSpan={rowSpan}
                          className="relative p-1 align-top"
                        >
                          <span className="absolute inset-0 flex p-1">
                            <Link
                              href={startBooking.tournament_id ? `/tournaments/${startBooking.tournament_id}` : `/sports-center/bookings/${startBooking.id}`}
                              className="flex-1 min-h-0 flex items-center justify-center rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs text-center font-medium hover:bg-primary-200 dark:hover:bg-primary-800/50 transition"
                            >
                              {startBooking.booking_name}
                            </Link>
                          </span>
                        </td>
                      );
                    }

                    if (!slot) return <td key={court.court_id} className="p-1" />;
                    const isFree = slot.status === 'free' && canBook;
                    const isClosed = slot.status === 'closed';
                    const isOccupied = slot.status === 'occupied';
                    return (
                      <td key={court.court_id} className="p-1">
                        {isClosed && (
                          <span className="block px-2 py-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs text-center">
                            Chiuso
                          </span>
                        )}
                        {isOccupied && (
                          <span className="block px-2 py-1.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs text-center">
                            Occupato
                          </span>
                        )}
                        {isFree && (
                          <button
                            type="button"
                            onClick={() => onSlotClick(court.court_id, court.court_name, slot.slot_start, slot.slot_end)}
                            className="w-full px-2 py-1.5 rounded bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-200 text-xs font-medium hover:bg-accent-200 dark:hover:bg-accent-800/50 transition"
                          >
                            Libero
                          </button>
                        )}
                        {slot.status === 'free' && !canBook && (
                          <span className="block px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs text-center">
                            Libero
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
