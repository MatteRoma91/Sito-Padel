/** Valori di default per site_config. Usato per seed iniziale e ripristino. */
export const DEFAULT_SITE_CONFIG: Record<string, string> = {
  // Colori accent (verde)
  color_accent_50: '#f2ffcc',
  color_accent_100: '#e5ff99',
  color_accent_200: '#e5ff99',
  color_accent_300: '#d6ff66',
  color_accent_400: '#c4ff33',
  color_accent_500: '#B2FF00',
  color_accent_600: '#9ee600',
  color_accent_700: '#8acc00',
  color_accent_800: '#76b300',
  color_accent_900: '#629900',
  // Colori primary (blu)
  color_primary_50: '#c5d4fc',
  color_primary_100: '#9AB0F8',
  color_primary_200: '#9AB0F8',
  color_primary_300: '#6270F3',
  color_primary_400: '#4d5cf4',
  color_primary_500: '#3445F1',
  color_primary_600: '#2a38c9',
  color_primary_700: '#202ca1',
  color_primary_800: '#162079',
  color_primary_900: '#0c1451',
  // Testi
  text_tour_name: 'Banana Padel Tour',
  text_welcome_subtitle: "Ricordati che vincere non è importante... ma il Broccoburgher sì!!",
  text_regolamento_title: 'Regolamento Banana Padel Tour',
  text_regolamento_classifica_intro:
    "I punti ATP si assegnano in base alla posizione finale di ogni torneo. Ogni torneo appartiene a una delle due categorie: Grande Slam o Master 1000.",
  text_regolamento_classifica_punti:
    "Grande Slam: 1° = 2000 pt, 2° = 1300, 3° = 800, 4° = 400, 5° = 200, 6° = 100, 7° = 50, 8° = 10. Master 1000: 1° = 1000 pt, 2° = 650, 3° = 400, 4° = 200, 5° = 100, 6° = 50, 7° = 25, 8° = 10.",
  text_regolamento_classifica_medaglie:
    'I punti si sommano nel tempo: la classifica generale è cumulativa e riflette tutti i tornei disputati. Medaglie: Oro (1°), Argento (2°), Bronzo (3°), Cucchiarella (8°).',
  text_regolamento_overall_intro:
    "Il punteggio overall è una scala da 0 a 100 che misura il livello di gioco di ogni partecipante. Si aggiorna automaticamente a fine di ogni torneo completato.",
  text_regolamento_overall_delta:
    "Partita vinta: +1. Partita persa: -1. 1° posto: +2. 8° posto: -2.",
  text_regolamento_overall_livelli:
    "90+ = A Gold, 80+ = A Silver, 70+ = B Gold, 60+ = B Silver, 50+ = C, 40+ = D, sotto 40 = Santiago.",
  text_regolamento_overall_baseline:
    "Ogni giocatore ha un valore di partenza assegnato al 1 gennaio 2025; da quel momento i delta dei tornei ne modificano il punteggio.",
  text_regolamento_compleanno_title: 'La regola del compleanno',
  text_regolamento_compleanno_1:
    "È risaputo che chi compie gli anni nel proprio mese di nascita ha il sacro dovere — o la simpatica scusa — di organizzare una tappa del Banana Padel Tour in quel mese. Così il compleanno diventa un'occasione per tutti: festeggiare insieme sul campo è praticamente legge. Nessuno può sfuggire al proprio turno!",
  text_regolamento_compleanno_2:
    "Ovviamente anche i partecipanti hanno un sacro dovere… garantire un BROCCOBURGHER (con broccoletti, non cicoria — siete vecchie canaglie come Cora, anche il bacon!) al festeggiato e, perché no… offrirgli anche una bella birra!!!",
};
