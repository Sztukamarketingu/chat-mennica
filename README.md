# Mennica Bitrix App

Minimalna aplikacja lokalna Bitrix24 obsługująca AI bota Mennica.pl.

## Endpointy

| URL | Opis |
|-----|------|
| `GET /install` | Strona instalacji (otwierana w iframe w Bitrix) |
| `POST /handler` | Odbiera eventy z Bitrix (ONAPPINSTALL, ONIMBOTMESSAGEADD) |
| `GET /health` | Health check |

## Deploy na VPS

```bash
git clone https://github.com/Sztukamarketingu/chat-mennica.git
cd chat-mennica
npm install
pm2 start ecosystem.config.js
pm2 save
```

## Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name chat-mennica.aikuznia.cloud;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Po dodaniu konfiguracji:
```bash
sudo ln -s /etc/nginx/sites-available/chat-mennica /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d chat-mennica.aikuznia.cloud
```

## Bitrix — ustawienia aplikacji

- **Ścieżka obsługi:** `https://chat-mennica.aikuznia.cloud/handler`
- **Ścieżka instalacji:** `https://chat-mennica.aikuznia.cloud/install`
- **Uprawnienia:** `imbot`, `imopenlines`, `im`, `crm`
