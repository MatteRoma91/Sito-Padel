# Guida: Ripristino e gestione repo Git delle 3 webapp

## Situazione attuale (dopo pulizia)

| Webapp | Cartella | Repo | Stato |
|--------|----------|------|-------|
| **Sito-Padel** | `/home/ubuntu/Sito-Padel` | Sito-Padel.git | ✅ OK – remote solo origin |
| **Roma-Buche** | `/home/ubuntu/Roma-Buche` | Ibuche.git | ✅ OK – repo separata |
| **control-room** | `/home/ubuntu/control-room` | Control-Room.git | ✅ OK – repo separata |

## Cosa è stato fatto

1. **Rimossi remote duplicati** da Sito-Padel (sitopadel, upstream) – resta solo `origin`
2. **Regola Cursor** `.cursor/rules/git-repos-separati.mdc` – l’AI sa che ogni webapp va sulla propria repo
3. **Workspace aggiornato** – include tutte e 3 le cartelle
4. **Roma-Buche** aggiunta a `.gitignore` in Sito-Padel – evita commit accidentali

## Branch in Sito-Padel (da sistemare manualmente)

Nel repo Sito-Padel ci sono ancora **branch con nomi strani** che ricordano le altre repo:

```
git@github.com-MatteRoma91/Sito-Padel.git  ← branch "Sito-Padel" (attuale)
git@github.com-MatteRoma91/Ibuche.git       ← codice Roma-Buche (NON usare)
git@github.com-MatteRoma91/Control-Room.git ← codice control-room (NON usare)
main                                         ← branch principale
```

### Opzione A: Usare `main` come branch principale

```bash
cd /home/ubuntu/Sito-Padel

# Assicurati che main sia aggiornata (merge dalla branch attuale)
git checkout main
git merge git@github.com-MatteRoma91/Sito-Padel.git -m "Merge branch Sito-Padel into main"
git push origin main

# Poi elimina le branch inutili (DOPO aver verificato che main sia OK)
git branch -d git@github.com-MatteRoma91/Sito-Padel.git
git branch -D git@github.com-MatteRoma91/Ibuche.git        # -D forza, contiene altro progetto
git branch -D git@github.com-MatteRoma91/Control-Room.git # -D forza
```

### Opzione B: Tenere la branch attuale e rinominarla

```bash
git branch -m git@github.com-MatteRoma91/Sito-Padel.git main-sitopadel
# Poi push: git push origin main-sitopadel
```

## Workflow consigliato

1. **Apri il workspace** `Sito-Padel.code-workspace` – vedi tutte e 3 le webapp
2. **Modifiche a Sito-Padel** → lavora in `/home/ubuntu/Sito-Padel`, push su Sito-Padel.git
3. **Modifiche a Roma-Buche** → lavora in `/home/ubuntu/Roma-Buche`, push su Ibuche.git
4. **Modifiche a control-room** → lavora in `/home/ubuntu/control-room`, push su Control-Room.git

## Verifica prima di ogni push

```bash
pwd              # Sei nella cartella giusta?
git remote -v    # origin punta alla repo corretta?
git status       # Stai committando solo file del progetto giusto?
```

## Riferimenti repo

- Sito-Padel: https://github.com/MatteRoma91/Sito-Padel
- Roma-Buche: https://github.com/MatteRoma91/Ibuche
- control-room: https://github.com/MatteRoma91/Control-Room
