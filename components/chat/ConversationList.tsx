'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Users, Trophy, Megaphone } from 'lucide-react';

interface Conversation {
  id: string;
  type: string;
  tournament_id?: string | null;
  title: string;
  otherUser?: { id: string; full_name: string | null; nickname: string | null } | null;
  tournament?: { id: string; name: string } | null;
  last_message_at?: string | null;
}

interface UserItem {
  id: string;
  full_name: string | null;
  nickname: string | null;
  username: string;
}

interface TournamentItem {
  id: string;
  name: string;
  date: string;
}

interface ConversationListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  deletedConversationId?: string | null;
}

export function ConversationList({ activeId, onSelect, deletedConversationId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/chat/conversations').then(r => r.json()),
      fetch('/api/chat/users').then(r => r.json()),
      fetch('/api/chat/tournaments').then(r => r.json()),
    ]).then(([convRes, usersRes, tourRes]) => {
      if (cancelled) return;
      if (convRes.success) setConversations(convRes.conversations);
      if (usersRes.success) setUsers(usersRes.users);
      if (tourRes.success) setTournaments(tourRes.tournaments);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const openOrCreateDm = async (userId: string) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ other_user_id: userId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Impossibile avviare la chat');
        return;
      }
      const convId = data.conversation?.id;
      if (!convId) {
        alert('Risposta non valida dal server');
        return;
      }
      setConversations(prev => {
        const existing = prev.find(c => c.id === convId);
        if (existing) return prev;
        const other = users.find(u => u.id === userId);
        return [{
          id: convId,
          type: 'dm',
          title: other ? (other.nickname || other.full_name || other.username) : 'Utente',
          otherUser: other ? { id: other.id, full_name: other.full_name, nickname: other.nickname } : null,
        }, ...prev];
      });
      onSelect(convId);
      setShowNew(false);
    } catch (err) {
      console.error('openOrCreateDm error', err);
      alert('Errore di connessione. Riprova.');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openOrCreateFromSelection = async () => {
    const ids = Array.from(selectedUserIds);
    setCreatingChat(true);
    if (ids.length === 0) {
      setCreatingChat(false);
      alert('Seleziona almeno un utente');
      return;
    }
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: ids }),
      });
      const data = await res.json();
      if (!data.success) {
        setCreatingChat(false);
        alert(data.error || 'Impossibile avviare la chat');
        return;
      }
      const convId = data.conversation?.id;
      if (!convId) {
        setCreatingChat(false);
        alert('Risposta non valida dal server');
        return;
      }
      const title = ids.length === 1
        ? (users.find(u => u.id === ids[0])?.nickname || users.find(u => u.id === ids[0])?.full_name || users.find(u => u.id === ids[0])?.username || 'Utente')
        : ids.map(id => users.find(u => u.id === id)?.nickname || users.find(u => u.id === id)?.full_name || users.find(u => u.id === id)?.username || '?').join(', ');
      setConversations(prev => {
        if (prev.find(c => c.id === convId)) return prev;
        return [{ id: convId, type: data.conversation.type, title }, ...prev];
      });
      onSelect(convId);
      setSelectedUserIds(new Set());
      setShowNew(false);
    } catch (err) {
      console.error('openOrCreateFromSelection error', err);
      alert('Errore di connessione. Riprova.');
    } finally {
      setCreatingChat(false);
    }
  };

  const openOrCreateBroadcast = async () => {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcast: true }),
    });
    const data = await res.json();
    if (data.success) {
      setConversations(prev => {
        const existing = prev.find(c => c.id === data.conversation.id);
        if (existing) return prev;
        return [{
          id: data.conversation.id,
          type: 'broadcast',
          title: 'Chat con tutti',
        }, ...prev];
      });
      onSelect(data.conversation.id);
      setShowNew(false);
    }
  };

  const openOrCreateTournament = async (tournamentId: string) => {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament_id: tournamentId }),
    });
    const data = await res.json();
    if (data.success) {
      const t = tournaments.find(t => t.id === tournamentId);
      setConversations(prev => {
        const existing = prev.find(c => c.id === data.conversation.id);
        if (existing) return prev;
        return [{
          id: data.conversation.id,
          type: 'tournament',
          tournament_id: tournamentId,
          title: t?.name ?? 'Torneo',
          tournament: t ? { id: t.id, name: t.name } : null,
        }, ...prev];
      });
      onSelect(data.conversation.id);
      setShowNew(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-slate-600 dark:text-slate-400">Caricamento...</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat
        </h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="mt-2 text-sm text-accent-600 dark:text-accent-400 hover:underline"
        >
          {showNew ? 'Annulla' : '+ Nuova chat'}
        </button>
      </div>

      {showNew && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 max-h-64 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Megaphone className="w-4 h-4" /> Messaggio a tutti
            </p>
            <button
              onClick={openOrCreateBroadcast}
              className="block w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium bg-primary-50 dark:bg-primary-900/20"
            >
              Chat con tutti gli utenti
            </button>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-4 h-4" /> Messaggio privato o gruppo
            </p>
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun utente disponibile</p>
            ) : (
              <div className="space-y-1">
                {users.map(u => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(u.id)}
                      onChange={() => toggleUserSelection(u.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="flex-1">{u.nickname || u.full_name || u.username}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); openOrCreateDm(u.id); }}
                      className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
                    >
                      Solo lui
                    </button>
                  </label>
                ))}
                {selectedUserIds.size > 0 && (
                  <button
                    type="button"
                    disabled={creatingChat}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openOrCreateFromSelection(); }}
                    className="mt-2 w-full px-3 py-2 rounded bg-accent-500 text-slate-900 font-medium text-sm hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingChat ? 'Creazione...' : `Avvia chat ${selectedUserIds.size === 1 ? 'privata' : `di gruppo (${selectedUserIds.size})`}`}
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Trophy className="w-4 h-4" /> Chat torneo
            </p>
            {tournaments.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun torneo a cui partecipi</p>
            ) : (
              <div className="space-y-1">
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openOrCreateTournament(t.id)}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && !showNew ? (
          <p className="p-4 text-slate-600 dark:text-slate-400 text-sm">
            Nessuna conversazione. Clicca &quot;Nuova chat&quot; per iniziare.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {conversations
              .filter(c => {
                if (c.id === deletedConversationId) return false;
                const t = (c.title || '').trim();
                return t.length > 0 && t !== '?';
              })
              .map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${
                  activeId === c.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 flex-shrink-0 bg-primary-200 dark:bg-primary-800">
                  {c.type === 'broadcast' ? <Megaphone className="w-5 h-5" /> : c.type === 'tournament' ? <Trophy className="w-5 h-5" /> : (
                    <span className="text-sm font-semibold">
                      {(c.title || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{c.title}</p>
                  {c.last_message_at && (
                    <p className="text-xs text-slate-500">Ultimo messaggio</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
