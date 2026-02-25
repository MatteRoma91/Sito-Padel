'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';

const POLL_INTERVAL_MS = 45_000;

interface ChatLinkWithBadgeProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ChatLinkWithBadge({ href, children, className, onClick }: ChatLinkWithBadgeProps) {
  const [count, setCount] = useState(0);
  const socketRef = useRef<{ off: (e: string) => void; close: () => void } | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/unread-count');
      const data = await res.json();
      if (data.success && typeof data.count === 'number') {
        setCount(data.count);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    const handler = () => fetchCount();
    window.addEventListener('chat:unread-update', handler);
    return () => window.removeEventListener('chat:unread-update', handler);
  }, [fetchCount]);

  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
        path: '/api/socket',
        addTrailingSlash: false,
      });
      socketRef.current = socket;
      socket.on('chat:unread', () => fetchCount());
    });
    return () => {
      const s = socketRef.current;
      if (s) {
        s.off('chat:unread');
        s.close();
        socketRef.current = null;
      }
    };
  }, [fetchCount]);

  return (
    <Link href={href} onClick={onClick} className={`relative inline-flex ${className ?? ''}`}>
      {children}
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold"
          aria-label={`${count} messaggi non letti`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
