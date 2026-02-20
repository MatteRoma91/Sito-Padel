# Comandi per l’avvio del server – Banana Padel Tour

Esegui questi comandi **in ordine** dopo l’avvio del server (o dopo un riavvio) per far funzionare il sito.

**Altre guide**: [README.md](README.md) (installazione, funzionalità, backup) · [GUIDA-SERVER.md](GUIDA-SERVER.md) (architettura, cronologia, variabili d’ambiente, troubleshooting)

---

## 1. Verifica servizi di sistema

```bash
# Nginx (reverse proxy e SSL) deve essere attivo
sudo systemctl status nginx
# Se non è attivo:
sudo systemctl start nginx
```

---

## 2. Entra nella cartella del progetto

```bash
cd /home/ubuntu/Sito-Padel
```

---

## 3. Build (solo se hai modificato il codice o è la prima volta)

```bash
npm run build
```

Se non hai toccato il codice e la cartella `.next` esiste già, puoi saltare questo step.

---

## 4. Avvia l’applicazione con PM2

```bash
pm2 start ecosystem.config.js
```

Oppure, se l’app è già in lista PM2 ma ferma:

```bash
pm2 start padel-tour
# oppure
pm2 restart padel-tour
```

---

## 5. Salva la lista PM2 (per riavvii futuri)

```bash
pm2 save
```

Così al prossimo reboot del server PM2 riavvierà da solo `padel-tour`.

---

## 6. Controllo rapido

```bash
# Stato dell’app
pm2 status

# L’app deve essere in ascolto sulla porta 3000
ss -tlnp | grep 3000
# oppure
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Risposta attesa: **200**, **302** o **307** (redirect verso login è normale). Se ottieni **000** o connessione rifiutata, vedi sotto “Se il sito non risponde”.

---

## Riepilogo – copia e incolla

Da eseguire **una volta** dopo l’avvio del server:

```bash
sudo systemctl start nginx
cd /home/ubuntu/Sito-Padel
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

Se il build è già stato fatto in precedenza:

```bash
sudo systemctl start nginx
cd /home/ubuntu/Sito-Padel
pm2 start ecosystem.config.js
pm2 save
pm2 status
```

---

## Primo setup completo (solo la prima volta sul server)

Se è la **prima** installazione sul server:

1. `cd /home/ubuntu/Sito-Padel`
2. `npm install`
3. Configurare `.env` (e `DATABASE_PATH` se necessario)
4. `npm run build`
5. `pm2 start ecosystem.config.js`
6. `pm2 save`
7. `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu`  
   (avvio automatico di PM2 al boot)

Dopo questo, ai successivi avvii del server bastano i comandi della sezione **Riepilogo** (senza `pm2 startup`, già fatto).

---

## Se il sito non risponde

1. **Controlla i log**: `pm2 logs padel-tour` (ultime righe). Se compaiono errori tipo “Could not find a production build” o “MODULE_NOT_FOUND”, la build è mancante o corrotta.
2. **Rifai la build**: `cd /home/ubuntu/Sito-Padel` → `npm run build` → `pm2 restart padel-tour`.
3. **Verifica Nginx**: `sudo systemctl status nginx`; se non è attivo, `sudo systemctl start nginx`.
4. **Verifica porta 3000**: `ss -tlnp | grep 3000` deve mostrare un processo in ascolto. Se non c’è, l’app non è partita: controlla di nuovo i log PM2.

Per variabili d’ambiente, backup e ripristino vedi [GUIDA-SERVER.md](GUIDA-SERVER.md) e [README.md](README.md).
