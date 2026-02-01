import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentsFuture, getTournamentsPast, getUsers, getCumulativeRankings } from '@/lib/db/queries';
import { Trophy, Users, Calendar, BarChart3, Plus, Cake } from 'lucide-react';
import { CountdownBroccoburgher } from '@/components/home/CountdownBroccoburgher';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/lib/types';

/** Users with birth_date, sorted by next birthday (month/day) from today. */
function usersByNextBirthday(users: User[]): User[] {
  const withBirthDate = users.filter((u): u is User & { birth_date: string } => !!u.birth_date);
  const now = new Date();
  const currentYear = now.getFullYear();

  return [...withBirthDate].sort((a, b) => {
    const [aMonth, aDay] = (a.birth_date.match(/^\d{4}-(\d{2})-(\d{2})$/) || []).slice(1).map(Number);
    const [bMonth, bDay] = (b.birth_date.match(/^\d{4}-(\d{2})-(\d{2})$/) || []).slice(1).map(Number);
    if (!aMonth || !bMonth) return 0;

    const aNext = new Date(currentYear, aMonth - 1, aDay);
    if (aNext.getTime() < now.getTime()) aNext.setFullYear(currentYear + 1);
    const bNext = new Date(currentYear, bMonth - 1, bDay);
    if (bNext.getTime() < now.getTime()) bNext.setFullYear(currentYear + 1);

    return aNext.getTime() - bNext.getTime();
  });
}

/** Format birth_date (YYYY-MM-DD) as "15 lug" (day + short month, no year). */
function formatBirthdayDisplay(birthDate: string): string {
  const [, month, day] = birthDate.match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
  if (!month || !day) return birthDate;
  const d = new Date(2000, parseInt(month, 10) - 1, parseInt(day, 10));
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  
  const upcomingTournamentsAll = getTournamentsFuture();
  const upcomingTournaments = upcomingTournamentsAll.slice(0, 3);
  // Countdown solo per tornei realmente in programma (open o in_progress), non draft
  const nextBroccoburgher = upcomingTournamentsAll.find((t) => t.status === 'open' || t.status === 'in_progress') ?? null;
  const recentTournaments = getTournamentsPast().slice(0, 3);
  const allPlayers = getUsers();
  // Exclude only the 'admin' user account from rankings display (not all admins)
  const players = allPlayers.filter(p => p.username !== 'admin');
  const rankings = getCumulativeRankings();

  // Memo compleanni: utenti con data di nascita ordinati per prossimo compleanno
  const birthdayMemo = usersByNextBirthday(players);

  // Top 5 players (excluding admins)
  const topPlayers = rankings.map(r => {
    const player = players.find(p => p.id === r.user_id);
    return { ...r, player };
  }).filter(r => r.player).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3445F1] via-[#6270F3] to-[#9AB0F8] p-6 shadow-lg">
        <div className="absolute -right-4 -bottom-4 opacity-30">
          <Image src="/logo.png" alt="" width={150} height={150} className="rotate-12" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <Image src="/logo.png" alt="Banana Padel Tour" width={80} height={80} className="rounded-2xl shadow-md hidden sm:block" />
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">
              Ciao, {user?.nickname || user?.full_name || user?.username}! 👋
            </h1>
            <p className="text-white/95 mt-2 text-lg font-medium">
              Benvenuto nel <span className="font-bold text-[#B2FF00]">Banana Padel Tour</span>
            </p>
            <p className="text-white/90 mt-1 text-base">
              Ricordati che vincere non è importante... ma il Broccoburgher sì!!
            </p>
          </div>
        </div>
      </div>

      {/* My Profile quick action - visible to everyone */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href={`/profiles/${user?.id}`} className="card p-4 flex flex-col items-center gap-2 hover:border-[#B2FF00] hover:shadow-lg transition-all duration-200">
          <Avatar
            src={user?.avatar ?? null}
            name={user?.nickname || user?.full_name || user?.username || 'Utente'}
            size="lg"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Il Mio Profilo</span>
        </Link>
      </div>

      {/* Countdown al prossimo Broccoburgher - solo se esiste un torneo futuro */}
      {nextBroccoburgher && (
        <CountdownBroccoburgher
          tournamentName={nextBroccoburgher.name}
          tournamentId={nextBroccoburgher.id}
          date={nextBroccoburgher.date}
        />
      )}

      {/* Admin quick actions */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/tournaments/new" className="card p-4 flex flex-col items-center gap-2 hover:border-[#B2FF00] hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#B2FF00]" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nuovo Torneo</span>
          </Link>
          <Link href="/profiles" className="card p-4 flex flex-col items-center gap-2 hover:border-[#B2FF00] hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#B2FF00]" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Giocatori</span>
          </Link>
          <Link href="/calendar" className="card p-4 flex flex-col items-center gap-2 hover:border-[#B2FF00] hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#B2FF00]" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Calendario</span>
          </Link>
          <Link href="/rankings" className="card p-4 flex flex-col items-center gap-2 hover:border-[#B2FF00] hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#B2FF00]" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Classifiche</span>
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming tournaments */}
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#B2FF00]" />
              Prossimi Tornei
            </h2>
            <Link href="/calendar" className="text-sm text-[#B2FF00] hover:underline font-medium">
              Vedi tutti
            </Link>
          </div>
          <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
            {upcomingTournaments.length === 0 ? (
              <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
                Nessun torneo in programma
              </p>
            ) : (
              upcomingTournaments.map(t => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="block p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(t.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {t.time && ` • ${t.time}`}
                  </p>
                </Link>
              ))
            )}
          </div>
          {/* Memo compleanni: utenti ordinati per prossima data (giorno/mese) */}
          {birthdayMemo.length > 0 && (
            <>
              <div className="p-4 border-t border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center gap-2">
                <Cake className="w-5 h-5 text-[#B2FF00]" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Compleanni</h3>
              </div>
              <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
                {birthdayMemo.map(u => (
                  <Link key={u.id} href={`/profiles/${u.id}`} className="block p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {u.nickname || u.full_name || u.username}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {u.birth_date ? formatBirthdayDisplay(u.birth_date) : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top players */}
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#B2FF00]" />
              Top 5 Classifica
            </h2>
            <Link href="/rankings" className="text-sm text-[#B2FF00] hover:underline font-medium">
              Classifica completa
            </Link>
          </div>
          <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
            {topPlayers.length === 0 ? (
              <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
                Nessuna classifica disponibile
              </p>
            ) : (
              topPlayers.map((r, i) => (
                <div key={r.user_id} className="p-4 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${i === 0 ? 'bg-yellow-400 text-yellow-900' : 
                      i === 1 ? 'bg-slate-300 text-slate-700' :
                      i === 2 ? 'bg-[#6270F3] text-white' :
                      'bg-slate-100 text-slate-700'}
                  `}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {r.player?.nickname || r.player?.full_name || r.player?.username}
                    </p>
                  </div>
                  <span className="font-semibold text-[#B2FF00]">{r.total_points} pt</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent tournaments */}
        <div className="card md:col-span-2">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#B2FF00]" />
              Tornei Recenti
            </h2>
            <Link href="/archive" className="text-sm text-[#B2FF00] hover:underline font-medium">
              Vedi archivio
            </Link>
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#9AB0F8] dark:divide-[#6270F3]/50">
            {recentTournaments.length === 0 ? (
              <p className="p-4 text-slate-700 dark:text-slate-300 text-sm col-span-3">
                Nessun torneo completato
              </p>
            ) : (
              recentTournaments.map(t => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="block p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
