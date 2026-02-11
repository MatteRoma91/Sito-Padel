import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { getTournaments, getTournamentsFuture, getTournamentsPast, getUsers, getCumulativeRankings, getSiteConfig, getTournamentsWithOpenMvpVoting } from '@/lib/db/queries';
import { getVisibleUsers } from '@/lib/visibility';
import { Trophy, Users, Calendar, BarChart3, Plus } from 'lucide-react';
import { CountdownBroccoburgher } from '@/components/home/CountdownBroccoburgher';
import { MvpVoteCard } from '@/components/home/MvpVoteCard';
import { HomeCalendar } from '@/components/home/HomeCalendar';
import { Avatar } from '@/components/ui/Avatar';

export default async function HomePage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  
  const upcomingTournamentsAll = getTournamentsFuture();
  // Countdown solo per tornei realmente in programma (open o in_progress), non draft
  const nextBroccoburgher = upcomingTournamentsAll.find((t) => t.status === 'open' || t.status === 'in_progress') ?? null;
  const recentTournaments = getTournamentsPast().slice(0, 3);
  const allTournaments = getTournaments();
  const allPlayers = getUsers();
  // Exclude only the 'admin' user account from rankings display (not all admins)
  // Also filter hidden users based on viewer permissions
  const players = getVisibleUsers(allPlayers.filter(p => p.username !== 'admin'), user);
  const rankings = getCumulativeRankings();

  const calendarTournaments = allTournaments.map((t) => ({
    id: t.id,
    name: t.name,
    date: t.date,
    time: t.time,
  }));
  const calendarBirthdays = players
    .filter((p): p is typeof p & { birth_date: string } => !!p.birth_date)
    .map((u) => ({
      id: u.id,
      name: u.nickname || u.full_name || u.username || '',
      birthDate: u.birth_date,
    }));

  const config = getSiteConfig();
  const tourName = config.text_tour_name || 'Banana Padel Tour';
  const welcomeSubtitle = config.text_welcome_subtitle || "Ricordati che vincere non è importante... ma il Broccoburgher sì!!";

  const mvpVotingTournaments = user ? getTournamentsWithOpenMvpVoting(user.id, isAdmin) : [];

  // Top 5 players (excluding admins)
  const topPlayers = rankings.map(r => {
    const player = players.find(p => p.id === r.user_id);
    return { ...r, player };
  }).filter(r => r.player).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 via-primary-300 to-primary-100 p-6 shadow-lg">
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
              Benvenuto nel <span className="font-bold text-accent-500">{tourName}</span>
            </p>
            <p className="text-white/90 mt-1 text-base">
              {welcomeSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* My Profile quick action - visible to everyone */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href={`/profiles/${user?.id}`} className="card p-4 flex flex-col items-center gap-2 hover:border-accent-500 hover:shadow-lg transition-all duration-200">
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
          <Link href="/tournaments/new" className="card p-4 flex flex-col items-center gap-2 hover:border-accent-500 hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nuovo Torneo</span>
          </Link>
          <Link href="/profiles" className="card p-4 flex flex-col items-center gap-2 hover:border-accent-500 hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Giocatori</span>
          </Link>
          <Link href="/calendar" className="card p-4 flex flex-col items-center gap-2 hover:border-accent-500 hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Calendario</span>
          </Link>
          <Link href="/rankings" className="card p-4 flex flex-col items-center gap-2 hover:border-accent-500 hover:shadow-lg transition-all duration-200">
            <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Classifiche</span>
          </Link>
        </div>
      )}

      {/* MVP Voting - subito sotto le quick action, sopra calendario (striscia gialla) */}
      {mvpVotingTournaments.map(({ tournament, status }) => (
        <MvpVoteCard
          key={tournament.id}
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          closesAt={status.closesAt}
          allVoted={status.allVoted}
          candidates={status.candidates}
          canVote={status.voterCanVote && !status.userHasVoted}
          isAdmin={isAdmin}
          needsAdminAssignment={status.needsAdminAssignment}
        />
      ))}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendario unificato: tornei e compleanni per mese */}
        <HomeCalendar tournaments={calendarTournaments} birthdays={calendarBirthdays} />

        {/* Top players */}
        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent-500" />
              Top 5 Classifica
            </h2>
            <Link href="/rankings" className="text-sm text-accent-500 hover:underline font-medium">
              Classifica completa
            </Link>
          </div>
          <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
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
                      i === 2 ? 'bg-amber-600 text-white' :
                      'bg-primary-300 text-white'}
                  `}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {r.player?.nickname || r.player?.full_name || r.player?.username}
                    </p>
                  </div>
                  <span className="font-semibold text-accent-500">{r.total_points} pt</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent tournaments */}
        <div className="card md:col-span-2">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent-500" />
              Tornei Recenti
            </h2>
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-primary-100 dark:divide-primary-300/50">
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
