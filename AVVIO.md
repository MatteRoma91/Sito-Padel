# Comandi per l'avvio del server – Banana Padel Tour + Ibuche

Esegui questi comandi **in ordine** dopo l'avvio del server (o dopo un riavvio) per far funzionare **entrambi** i siti.

**Siti sul server**:
| Sito | URL | Porta | PM2 name |
|------|-----|-------|-----------|
| Banana Padel Tour | https://bananapadeltour.duckdns.org | 3000 | padel-tour |
| Roma-Buche (Ibuche) | https://ibuche.duckdns.org | 3001 | roma-buche |

**Altre guide**: [README.md](README.md) · [GUIDA-SERVER.md](GUIDA-SERVER.md) (architettura, troubleshooting)

---

## 1. Verifica Nginx

```bash
sudo systemctl status nginx
# Se non è attivo:
sudo systemctl start nginx
```

---

## 2. Avvia entrambe le applicazioni

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

## 3. Salva la lista PM2

```bash
pm2 save
```

Così al prossimo reboot PM2 riavvierà **entrambe** le app automaticamente.

---

## 4. Build (solo se necessario)

Se hai modificato il codice di uno dei progetti:

```bash
# Per Banana Padel Tour
cd /home/ubuntu/Sito-Padel && npm run build && pm2 restart padel-tour

# Per Roma-Buche
cd /home/ubuntu/Roma-Buche && npm run build && pm2 restart roma-buche
```

---

## Riepilogo rapido (avvio dopo reboot)

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
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # atteso: 200/302/307
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001   # atteso: 200/302/307
```

---

## Se un sito non risponde

1. **Log PM2**: `pm2 logs padel-tour` oppure `pm2 logs roma-buche`
2. **Build corrotta**: rifare `npm run build` nel progetto, poi `pm2 restart <nome>`
3. **Nginx**: `sudo systemctl status nginx`
4. **Porte**: `ss -tlnp | grep -E '3000|3001'` – devono essere in ascolto

Per variabili d'ambiente, backup e ripristino vedi [GUIDA-SERVER.md](GUIDA-SERVER.md).
