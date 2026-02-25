'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface LiveScore {
  score_pair1: number;
  score_pair2: number;
  winner_pair_id: string | null;
}

/**
 * Hook per punteggi live via WebSocket.
 * Si connette solo quando montato; lazy load di socket.io-client.
 * Restituisce getScore(matchId) per il valore live o undefined.
 */
export function useLiveMatchScores(tournamentId: string | null) {
  const [scores, setScores] = useState<Map<string, LiveScore>>(new Map());
  const socketRef = useRef<{ emit: (e: string, id: string) => void; disconnect: () => void } | null>(null);

  const getScore = useCallback(
    (matchId: string): LiveScore | undefined => scores.get(matchId),
    [scores]
  );

  useEffect(() => {
    if (!tournamentId) return;

    import('socket.io-client').then(({ io }) => {
      const url = typeof window !== 'undefined' ? window.location.origin : '';
      const socket = io(url, {
        path: '/api/socket',
        addTrailingSlash: false,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('tournament:join', tournamentId);
      });

      socket.on('match:score', (payload: unknown) => {
        const p = payload as { matchId?: string; score_pair1?: number; score_pair2?: number; winner_pair_id?: string | null };
        const { matchId, score_pair1, score_pair2, winner_pair_id } = p ?? {};
        if (matchId != null && typeof score_pair1 === 'number' && typeof score_pair2 === 'number') {
          setScores(prev => {
            const next = new Map(prev);
            next.set(matchId, {
              score_pair1,
              score_pair2,
              winner_pair_id: winner_pair_id ?? null,
            });
            return next;
          });
        }
      });
    });

    return () => {
      const s = socketRef.current;
      if (s) {
        s.emit('tournament:leave', tournamentId);
        s.disconnect();
        socketRef.current = null;
      }
    };
  }, [tournamentId]);

  return { getScore };
}
