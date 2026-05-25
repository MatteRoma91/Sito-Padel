'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { jsPDF } from 'jspdf';
import type { Pair, Match, TournamentRanking, User } from '@/lib/types';
import { ROUND_LABELS } from '@/lib/bracket';
import { getSaliscendiMatches } from '@/lib/tournaments/saliscendi';

interface ExportPdfButtonProps {
  tournament: {
    name: string;
    date: string;
    time: string | null;
    venue: string | null;
  };
  pairs: Pair[];
  matches: Match[];
  rankings: TournamentRanking[];
  userMap: Map<string, User>;
}

export function ExportPdfButton({ 
  tournament, 
  pairs, 
  matches, 
  rankings,
  userMap 
}: ExportPdfButtonProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const pairMap = new Map(pairs.map(p => [p.id, p]));

  function getPairName(pairId: string | null): string {
    if (!pairId) return 'TBD';
    const pair = pairMap.get(pairId);
    if (!pair) return 'TBD';
    const p1 = userMap.get(pair.player1_id);
    const p2 = userMap.get(pair.player2_id);
    const n1 = p1?.nickname || p1?.full_name || '?';
    const n2 = p2?.nickname || p2?.full_name || '?';
    return `${n1} / ${n2}`;
  }

  function generatePdf() {
    setLoading(true);

    try {
      const doc = new jsPDF();
      let y = 20;

      // Title
      doc.setFontSize(20);
      doc.text(tournament.name, 105, y, { align: 'center' });
      y += 10;

      // Date and details
      doc.setFontSize(12);
      doc.setTextColor(100);
      const dateStr = new Date(tournament.date).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.text(dateStr, 105, y, { align: 'center' });
      y += 6;

      if (tournament.time) {
        doc.text(`Ore ${tournament.time}`, 105, y, { align: 'center' });
        y += 6;
      }
      if (tournament.venue) {
        doc.text(tournament.venue, 105, y, { align: 'center' });
        y += 6;
      }

      y += 10;
      doc.setTextColor(0);

      // Pairs
      if (pairs.length > 0) {
        doc.setFontSize(14);
        doc.text('Coppie', 14, y);
        y += 8;

        doc.setFontSize(10);
        pairs.sort((a, b) => a.seed - b.seed).forEach(pair => {
          const p1 = userMap.get(pair.player1_id);
          const p2 = userMap.get(pair.player2_id);
          const n1 = p1?.nickname || p1?.full_name || '?';
          const n2 = p2?.nickname || p2?.full_name || '?';
          doc.text(`Coppia ${pair.seed}: ${n1} / ${n2}`, 14, y);
          y += 5;
        });
        y += 5;
      }

      // Matches
      if (matches.length > 0) {
        const salMatches = matches.filter((m) => m.round === 'saliscendi');
        if (salMatches.length > 0) {
          doc.setFontSize(14);
          doc.text('Torneo Saliscendi', 14, y);
          y += 8;
          doc.setFontSize(10);
          const ordered = getSaliscendiMatches(matches);
          let lastRn = 0;
          for (const m of ordered) {
            const rn = m.round_number ?? 0;
            if (rn !== lastRn) {
              lastRn = rn;
              doc.setFontSize(11);
              doc.text(
                `Round ${rn}${(m.is_final_round ?? 0) === 1 ? ' (finale)' : ''}`,
                14,
                y
              );
              y += 5;
              doc.setFontSize(10);
            }
            const tier = m.court_tier === 'oro' ? 'Oro' : m.court_tier === 'argento' ? 'Argento' : 'Bronzo';
            const score = m.winner_pair_id ? `${m.score_pair1} - ${m.score_pair2}` : 'vs';
            doc.text(`  ${tier}: ${getPairName(m.pair1_id)} ${score} ${getPairName(m.pair2_id)}`, 16, y);
            y += 5;
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
          }
          y += 5;
        }

        const mainMatches = matches.filter(m => m.bracket_type === 'main' && m.round !== 'saliscendi');
        const consolationMatches = matches.filter(m => m.bracket_type === 'consolation');

        const rounds = ['quarterfinal', 'semifinal', 'final', 'third_place'] as const;
        const mainHasContent = rounds.some((round) => mainMatches.some((m) => m.round === round));
        if (mainHasContent) {
          doc.setFontSize(14);
          doc.text('Tabellone Principale', 14, y);
          y += 8;

          doc.setFontSize(10);
          rounds.forEach((round) => {
            const roundMatches = mainMatches.filter((m) => m.round === round);
            if (roundMatches.length > 0) {
              doc.setFontSize(11);
              doc.text(ROUND_LABELS[round], 14, y);
              y += 5;
              doc.setFontSize(10);

              roundMatches.sort((a, b) => a.order_in_round - b.order_in_round).forEach((m) => {
                const score = m.winner_pair_id ? `${m.score_pair1} - ${m.score_pair2}` : 'vs';
                doc.text(`${getPairName(m.pair1_id)} ${score} ${getPairName(m.pair2_id)}`, 20, y);
                y += 5;
              });
              y += 2;
            }
          });
          y += 5;
        }

        const consolationRounds = ['consolation_semi', 'consolation_final', 'consolation_seventh'] as const;
        const consolationHasContent = consolationRounds.some((round) =>
          consolationMatches.some((m) => m.round === round)
        );
        if (consolationHasContent) {
          doc.setFontSize(14);
          doc.text('Tabellone Consolazione', 14, y);
          y += 8;

          consolationRounds.forEach((round) => {
            const roundMatches = consolationMatches.filter((m) => m.round === round);
            if (roundMatches.length > 0) {
              doc.setFontSize(11);
              doc.text(ROUND_LABELS[round], 14, y);
              y += 5;
              doc.setFontSize(10);

              roundMatches.sort((a, b) => a.order_in_round - b.order_in_round).forEach((m) => {
                const score = m.winner_pair_id ? `${m.score_pair1} - ${m.score_pair2}` : 'vs';
                doc.text(`${getPairName(m.pair1_id)} ${score} ${getPairName(m.pair2_id)}`, 20, y);
                y += 5;
              });
              y += 2;
            }
          });
        }
      }

      // Rankings
      if (rankings.length > 0) {
        // Check if we need a new page
        if (y > 230) {
          doc.addPage();
          y = 20;
        }

        y += 5;
        doc.setFontSize(14);
        doc.text('Classifica Finale', 14, y);
        y += 8;

        doc.setFontSize(10);
        rankings.sort((a, b) => a.position - b.position).forEach(r => {
          doc.text(`${r.position}° - ${getPairName(r.pair_id)} (${r.points} pt)`, 14, y);
          y += 5;
        });
      }

      // Save
      doc.save(`${tournament.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      showToast('Errore durante la generazione del PDF', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={generatePdf}
      disabled={loading}
      className="btn btn-secondary flex items-center gap-2"
    >
      <FileDown className="w-4 h-4" />
      {loading ? 'Generazione...' : 'Esporta PDF'}
    </button>
  );
}
