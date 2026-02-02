'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, Cake } from 'lucide-react';

export interface HomeCalendarTournament {
  id: string;
  name: string;
  date: string;
  time?: string | null;
}

export interface HomeCalendarBirthday {
  id: string;
  name: string;
  birthDate: string;
}

interface HomeCalendarProps {
  tournaments: HomeCalendarTournament[];
  birthdays: HomeCalendarBirthday[];
}

type CalendarEvent =
  | { type: 'tournament'; id: string; label: string; dateStr: string; day: number; link: string; time?: string }
  | { type: 'birthday'; id: string; label: string; dateStr: string; day: number; link: string };

function formatDayShort(dateStr: string): string {
  const [, m, d] = dateStr.match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
  if (!m || !d) return dateStr;
  const date = new Date(2000, parseInt(m, 10) - 1, parseInt(d, 10));
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function HomeCalendar({ tournaments, birthdays }: HomeCalendarProps) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const monthLabel = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const eventsForMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');

    const result: CalendarEvent[] = [];

    for (const t of tournaments) {
      const [y, m] = (t.date.match(/^(\d{4})-(\d{2})/) || []).slice(1).map(Number);
      if (y === year && m === month) {
        const [, , dayStr] = t.date.match(/^(\d{4})-(\d{2})-(\d{2})$/) || ['', '', '1'];
        result.push({
          type: 'tournament',
          id: t.id,
          label: t.name,
          dateStr: formatDayShort(t.date),
          day: parseInt(dayStr || '1', 10),
          link: `/tournaments/${t.id}`,
          time: t.time ?? undefined,
        });
      }
    }

    for (const b of birthdays) {
      const [, m, d] = b.birthDate.match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
      if (!m || !d) continue;
      const birthMonth = parseInt(m, 10);
      if (birthMonth !== month) continue;
      const day = parseInt(d, 10);
      result.push({
        type: 'birthday',
        id: b.id,
        label: b.name,
        dateStr: formatDayShort(`${year}-${monthStr}-${d}`),
        day,
        link: `/profiles/${b.id}`,
      });
    }

    result.sort((a, b) => a.day - b.day);
    return result;
  }, [currentMonth, tournaments, birthdays]);

  const goPrev = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNext = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="card">
      <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-[#162079]/50 transition text-slate-700 dark:text-slate-300"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 min-w-[160px] text-center">
            {capitalizeFirst(monthLabel)}
          </h2>
          <button
            type="button"
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-[#162079]/50 transition text-slate-700 dark:text-slate-300"
            aria-label="Mese successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Link href="/calendar" className="text-sm text-accent-500 hover:underline font-medium">
          Vedi tutti
        </Link>
      </div>
      <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
        {eventsForMonth.length === 0 ? (
          <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
            Nessun evento in programma
          </p>
        ) : (
          eventsForMonth.map((e) => (
            <Link
              key={`${e.type}-${e.id}`}
              href={e.link}
              className="flex items-center gap-4 p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-primary-100 dark:bg-[#162079]/30">
                {e.type === 'tournament' ? (
                  <Calendar className="w-5 h-5 text-accent-500" />
                ) : (
                  <Cake className="w-5 h-5 text-accent-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                  {e.type === 'tournament' ? e.label : `Compleanno ${e.label}`}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {e.dateStr}
                  {e.type === 'tournament' && e.time ? ` • ${e.time}` : ''}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
