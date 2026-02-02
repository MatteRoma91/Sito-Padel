import { BarChart3, Trophy, Cake } from 'lucide-react';
import { getSiteConfig } from '@/lib/db/queries';

export default function RegolamentoPage() {
  const config = getSiteConfig();
  const title = config.text_regolamento_title || 'Regolamento Banana Padel Tour';
  const classificaIntro = config.text_regolamento_classifica_intro || '';
  const classificaPunti = config.text_regolamento_classifica_punti || '';
  const classificaMedaglie = config.text_regolamento_classifica_medaglie || '';
  const overallIntro = config.text_regolamento_overall_intro || '';
  const overallDelta = config.text_regolamento_overall_delta || '';
  const overallLivelli = config.text_regolamento_overall_livelli || '';
  const overallBaseline = config.text_regolamento_overall_baseline || '';
  const compleannoTitle = config.text_regolamento_compleanno_title || 'La regola del compleanno';
  const compleanno1 = config.text_regolamento_compleanno_1 || '';
  const compleanno2 = config.text_regolamento_compleanno_2 || '';

  const puntiParts = classificaPunti ? classificaPunti.split('. Master 1000:').filter(Boolean) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h1>

      {/* Classifica Punti */}
      <section className="card">
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-accent-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Classifica Punti (ATP)
          </h2>
        </div>
        <div className="p-4 space-y-4 text-slate-700 dark:text-slate-300">
          {classificaIntro && <p>{classificaIntro}</p>}
          {puntiParts.length > 0 && (
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">Punti per posizione</h3>
              <ul className="space-y-1 text-sm">
                {puntiParts[0] && <li><strong>Grande Slam:</strong> {puntiParts[0].replace(/^Grande Slam:\s*/i, '').trim()}</li>}
                {puntiParts[1] && <li><strong>Master 1000:</strong> {puntiParts[1].trim()}</li>}
              </ul>
            </div>
          )}
          {classificaMedaglie && <p>{classificaMedaglie}</p>}
        </div>
      </section>

      {/* Punteggio Overall */}
      <section className="card">
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-accent-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Punteggio Overall
          </h2>
        </div>
        <div className="p-4 space-y-4 text-slate-700 dark:text-slate-300">
          {overallIntro && <p>{overallIntro}</p>}
          {overallDelta && (
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">Come si modifica</h3>
              <p className="text-sm">{overallDelta}</p>
            </div>
          )}
          {overallLivelli && (
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">Livelli derivati</h3>
              <p className="text-sm">{overallLivelli}</p>
            </div>
          )}
          {overallBaseline && <p>{overallBaseline}</p>}
        </div>
      </section>

      {/* Regola Compleanno */}
      <section className="card">
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <Cake className="w-6 h-6 text-accent-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {compleannoTitle}
          </h2>
        </div>
        <div className="p-4 text-slate-700 dark:text-slate-300 space-y-4">
          {compleanno1 && <p className="text-base leading-relaxed">{compleanno1}</p>}
          {compleanno2 && <p className="text-base leading-relaxed">{compleanno2}</p>}
        </div>
      </section>
    </div>
  );
}
