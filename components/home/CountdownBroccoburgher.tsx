'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';

interface CountdownBroccoburgherProps {
  tournamentName: string;
  tournamentId: string;
  date: string;
}

function getTimeLeft(targetDate: Date): { days: number; hours: number; minutes: number; seconds: number; isPast: boolean } {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

export function CountdownBroccoburgher({ tournamentName, tournamentId, date }: CountdownBroccoburgherProps) {
  const targetDate = new Date(date + 'T00:00:00');
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const target = new Date(date + 'T00:00:00');
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [date]);

  if (timeLeft.isPast) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 text-slate-600">
          <Clock className="w-6 h-6 text-[#B2FF00]" />
          <p className="font-medium">Il Broccoburgher è arrivato! Buon divertimento!</p>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/tournaments/${tournamentId}`} className="block">
      <div className="card p-6 hover:border-[#B2FF00] hover:shadow-lg transition-all">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-[#B2FF00]" />
          <h2 className="font-bold text-slate-800 text-lg">Countdown al prossimo Broccoburgher</h2>
        </div>
        <p className="font-semibold text-slate-800 mb-1">{tournamentName}</p>
        <p className="text-sm text-slate-600 flex items-center gap-1 mb-4">
          <Calendar className="w-4 h-4" />
          {targetDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col items-center min-w-[4rem]">
            <span className="text-2xl font-bold text-[#B2FF00]">{timeLeft.days}</span>
            <span className="text-xs text-slate-600">giorni</span>
          </div>
          <div className="flex flex-col items-center min-w-[4rem]">
            <span className="text-2xl font-bold text-[#B2FF00]">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-xs text-slate-600">ore</span>
          </div>
          <div className="flex flex-col items-center min-w-[4rem]">
            <span className="text-2xl font-bold text-[#B2FF00]">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="text-xs text-slate-600">min</span>
          </div>
          <div className="flex flex-col items-center min-w-[4rem]">
            <span className="text-2xl font-bold text-[#B2FF00]">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="text-xs text-slate-600">sec</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
