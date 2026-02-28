# Comandi per l'avvio del server – Banana Padel Tour + Ibuche

Esegui questi comandi **in ordine** dopo l'avvio del server, **solo se PM2 non ha riavviato le app automaticamente**.

> PM2 è configurato con `pm2 startup` (servizio systemd `pm2-ubuntu.service`): al boot riavvia automaticamente le app salvate con `pm2 save`. Normalmente non serve intervento manuale.

**Siti sul server**:
| Sito | URL | Porta | PM2 name |
|------|-----|-------|-----------|
| Banana Padel Tour | https://bananapadeltour.duckdns.org | 3000 | padel-tour |
| Roma-Buche (Ibuche) | https://ibuche.duckdns.org | 3001 | roma-buche |

**Stack**: Node.js 22 LTS (via nvm) · Next.js 15 · React 19 · PM2 6 · Nginx 1.24 · UFW attivo

**Altre guide**: [README.md](README.md) · [GUIDA-SERVER.md](GUIDA-SERVER.md) (architettura, troubleshooting)

---

## 1. Verifica stato

```bash
pm2 status
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
```

Se entrambe le app sono `online` e i health check restituiscono `{"status":"ok"}`, il server è operativo. Non servono altri passaggi.

---

## 2. Verifica Nginx

```bash
sudo systemctl status nginx
# Se non è attivo:
sudo systemctl start nginx
```

---

## 3. Avvia entrambe le applicazioni

```bash
# Banana Padel Tour (porta 3000)
cd /home/ubuntu/Sito-Padel
pm2 start ecosystem.config.js

# Roma-Buche (porta 3001)
cd /home/ubuntu/Roma-Buche
pm2 start ecosystem.config.js
```

Oppure, se le app sono già in lista PM2 ma ferme:

```bash
pm2 start padel-tour
pm2 start roma-buche
# oppure riavvio di entrambe:
pm2 restart padel-tour roma-buche
```

---

## 4. Salva la lista PM2

```bash
pm2 save
```

Così al prossimo reboot PM2 riavvierà **entrambe** le app automaticamente.

---

## 5. Build (solo se necessario)

Se hai modificato il codice di uno dei progetti:

```bash
# Per Banana Padel Tour
cd /home/ubuntu/Sito-Padel && npm run build && pm2 restart padel-tour

# Per Roma-Buche
cd /home/ubuntu/Roma-Buche && npm run build && pm2 restart roma-buche
```

---

## Riepilogo rapido (avvio manuale dopo reboot)

```bash
sudo systemctl start nginx
cd /home/ubuntu/Sito-Padel && pm2 start ecosystem.config.js
cd /home/ubuntu/Roma-Buche && pm2 start ecosystem.config.js
pm2 save
pm2 status
```

---

## Aggiornamento configurazione Nginx

Se modifichi `scripts/nginx-padel.conf` o `scripts/nginx-ibuche.conf`, usa lo script unificato:

```bash
cd /home/ubuntu/Sito-Padel
sudo ./scripts/update-nginx.sh
```

Lo script copia **entrambe** le config e ricarica Nginx, evitando conflitti tra i due siti.

---

## Controllo rapido

```bash
pm2 status
ss -tlnp | grep -E '3000|3001'
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
```

---

## Se un sito non risponde

1. **Health check**: `curl http://localhost:3000/api/health` → se `503`, problema DB
2. **Log PM2**: `pm2 logs padel-tour` oppure `pm2 logs roma-buche`
3. **Build corrotta**: rifare `npm run build` nel progetto, poi `pm2 restart <nome>`
4. **Nginx**: `sudo systemctl status nginx`
5. **Porte**: `ss -tlnp | grep -E '3000|3001'` – devono essere in ascolto
6. **Node.js non trovato**: `source ~/.bashrc` per caricare nvm, poi `nvm use default`

Per variabili d'ambiente, backup e ripristino vedi [GUIDA-SERVER.md](GUIDA-SERVER.md).
