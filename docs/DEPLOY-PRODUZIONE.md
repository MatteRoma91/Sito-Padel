# Deploy Produzione - Sito Padel

Configurazione pronta per produzione con PM2, Nginx e security headers.

## 1. PM2

### Avvio
```bash
cd /home/ubuntu/Sito-Padel
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # esegui il comando suggerito per avvio al boot
```

### Log rotation (una tantum)
```bash
pm2 install pm2-logrotate
# Configurazione: pm2 set pm2-logrotate:max_size 10M
# pm2 set pm2-logrotate:retain 7
# pm2 set pm2-logrotate:compress true
```

### Comandi utili
```bash
pm2 status
pm2 logs padel-tour
pm2 monit
pm2 restart padel-tour
```

## 2. Nginx

### Setup
```bash
sudo cp /home/ubuntu/Sito-Padel/scripts/nginx-padel.conf /etc/nginx/sites-available/padel
sudo ln -sf /etc/nginx/sites-available/padel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL + HTTP/2 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bananapadeltour.duckdns.org
```

Poi decommentare nel file nginx le righe per `listen 443 ssl http2` e i path dei certificati, oppure certbot le aggiunge automaticamente.

## 3. Riepilogo attivato

| Componente        | Dettaglio                                              |
|------------------|--------------------------------------------------------|
| PM2 cluster      | `instances: 'max'` (un processo per core CPU)          |
| PM2 restart      | `autorestart: true`, `max_memory_restart: 500M`        |
| PM2 log rotation | Via modulo `pm2-logrotate`                              |
| Nginx gzip       | Tipi: json, js, css, fonts, svg, xml                    |
| Nginx HTTP/2     | Con SSL (dopo certbot)                                 |
| Nginx cache      | `/_next/static/` 1 anno, immagini/font 1 giorno        |
| Security headers | X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy |
