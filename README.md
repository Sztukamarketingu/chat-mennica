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
git clone https://github.com/TWOJ-ORG/mennica-bitrix-app
cd mennica-bitrix-app
npm install
pm2 start ecosystem.config.js
```

## Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name bitrix-app.TWOJA-DOMENA.pl;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Bitrix — ustawienia aplikacji

- **Ścieżka obsługi:** `https://bitrix-app.TWOJA-DOMENA.pl/handler`
- **Ścieżka instalacji:** `https://bitrix-app.TWOJA-DOMENA.pl/install`
- **Uprawnienia:** `imbot`, `imopenlines`, `im`, `crm`
