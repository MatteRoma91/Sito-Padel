import { BarChart3, Trophy, Cake, Users, Star } from 'lucide-react';
import { getSiteConfig } from '@/lib/db/queries';

export default function RegolamentoPage() {
  const config = getSiteConfig();
  const title = config.text_regolamento_title || 'Regolamento Banana Padel Tour';
  const classificaIntro = config.text_regolamento_classifica_intro || '';
  const classificaPunti = config.text_regolamento_classifica_punti || '';
  const classificaPuntiGS = config.text_regolamento_classifica_punti_gs || '';
  const classificaPuntiM1000 = config.text_regolamento_classifica_punti_m1000 || '';
  const classificaPuntiBrocco = config.text_regolamento_classifica_punti_brocco || '';
  const classificaMedaglie = config.text_regolamento_classifica_medaglie || '';
  const modalita16 = config.text_regolamento_modalita_16 || '';
  const modalita8 = config.text_regolamento_modalita_8 || '';
  const overallIntro = config.text_regolamento_overall_intro || '';
  const overallDelta = config.text_regolamento_overall_delta || '';
  const overall8 = config.text_regolamento_overall_8 || '';
  const overallLivelli = config.text_regolamento_overall_livelli || '';
  const overallBaseline = config.text_regolamento_overall_baseline || '';
  const compleannoTitle = config.text_regolamento_compleanno_title || 'La regola del compleanno';
  const compleanno1 = config.text_regolamento_compleanno_1 || '';
  const compleanno2 = config.text_regolamento_compleanno_2 || '';
  const mvpTitle = config.text_regolamento_mvp_title || 'Votazione MVP';
  const mvpText = config.text_regolamento_mvp || '';

  // Backward compat: se le chiavi specifiche per categoria non sono impostate,
  // tentiamo comunque di estrarre GS/M1000 da text_regolamento_classifica_punti.
  const puntiParts =
    !classificaPuntiGS &&
    !classificaPuntiM1000 &&
    classificaPunti
      ? classificaPunti.split('. Master 1000:').filter(Boolean)
      : [];

  return (
    <div className="max-w-4xl w-full mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h1>

      {/* Modalità di torneo */}
      {(modalita16 || modalita8) && (
        <section className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <Users className="w-6 h-6 text-accent-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Modalità di torneo
            </h2>
          </div>
          <div className="p-4 space-y-4 text-slate-700 dark:text-slate-300">
            {modalita16 && (
              <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-1">
                  Torneo a 16 giocatori (8 coppie)
                </h3>
                <p className="text-sm">{modalita16}</p>
              </div>
            )}
            {modalita8 && (
              <div>
                <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-1">
                  Torneo a 8 giocatori (4 coppie) – BroccoChallenger 500
                </h3>
                <p className="text-sm">{modalita8}</p>
              </div>
            )}
          </div>
        </section>
      )}

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
          {(classificaPuntiGS || classificaPuntiM1000 || classificaPuntiBrocco || puntiParts.length > 0) && (
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">Punti per posizione</h3>
              <ul className="space-y-1 text-sm">
                {(classificaPuntiGS || puntiParts[0]) && (
                  <li>
                    <strong>Grande Slam:</strong>{' '}
                    {classificaPuntiGS || puntiParts[0].replace(/^Grande Slam:\s*/i, '').trim()}
                  </li>
                )}
                {(classificaPuntiM1000 || puntiParts[1]) && (
                  <li>
                    <strong>Master 1000:</strong>{' '}
                    {classificaPuntiM1000 || puntiParts[1].trim()}
                  </li>
                )}
                {classificaPuntiBrocco && (
                  <li>
                    <strong>BroccoChallenger 500 (torneo a 8):</strong> {classificaPuntiBrocco}
                  </li>
                )}
              </ul>
            </div>
          )}
          {classificaMedaglie && <p>{classificaMedaglie}</p>}
        </div>
      </section>

      {/* Votazione MVP */}
      {mvpText && (
        <section className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <Star className="w-6 h-6 text-accent-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {mvpTitle}
            </h2>
          </div>
          <div className="p-4 space-y-4 text-slate-700 dark:text-slate-300">
            <p className="text-sm">{mvpText}</p>
          </div>
        </section>
      )}

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
          {(overallDelta || overall8) && (
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">Come si modifica</h3>
              {overallDelta && <p className="text-sm">{overallDelta}</p>}
              {overall8 && <p className="text-sm mt-2">{overall8}</p>}
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
