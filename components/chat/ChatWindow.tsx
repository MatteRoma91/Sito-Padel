'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  body: string;
  created_at: string;
}

interface ChatWindowProps {
  conversationId: string | null;
  onClose?: () => void;
}

export function ChatWindow({ conversationId, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<{ on: (e: string, cb: (m: Message) => void) => void; emit: (e: string, ...args: unknown[]) => void; disconnect?: () => void } | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setTitle('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/chat/conversations/${conversationId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setTitle(data.conversation?.title ?? 'Chat');
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/chat/conversations/${conversationId}/messages?limit=50`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setMessages(data.messages ?? []);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    import('socket.io-client').then(({ io }) => {
      const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
        path: '/api/socket',
        addTrailingSlash: false,
      });
      socketRef.current = socket;

      socket.emit('chat:join', conversationId);

      socket.on('chat:message', (msg: Message) => {
        if (msg.conversation_id === conversationId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      });
    });

    return () => {
      const s = socketRef.current;
      if (s) {
        s.emit('chat:leave', conversationId);
        socketRef.current = null;
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const body = input.trim();
    if (!body || !conversationId || sending) return;

    setSending(true);
    const socket = socketRef.current;
    if (socket?.emit) {
      socket.emit('chat:message', { conversationId, body });
      setInput('');
      setSending(false);
    } else {
      try {
        const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        });
        const data = await res.json();
        if (data.success && data.message) {
          setMessages(prev => [...prev, data.message]);
          setInput('');
        }
      } finally {
        setSending(false);
      }
    }
  };

  if (!conversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-8">
        <p className="text-center">Seleziona una conversazione o avvia una nuova chat</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Chiudi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{title || 'Chat'}</h3>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading ? (
          <p className="text-slate-500">Caricamento...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-500 text-sm">Nessun messaggio. Scrivi qualcosa per iniziare.</p>
        ) : (
          messages.map(m => (
            <div
              key={m.id}
              className="flex flex-col max-w-[85%]"
            >
              <p className="text-xs text-slate-500 mb-0.5">{m.sender_name ?? 'Utente'}</p>
              <div className="rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 break-words">
                {m.body}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Scrivi un messaggio..."
            maxLength={2000}
            className="flex-1 input py-2"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn btn-primary px-4 py-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
