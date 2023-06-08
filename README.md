### Telegram bot for MidJourney

Define variables before start

```bash
BOT_TOKEN=
MJ_SERVER_ID=
MJ_CHANNEL_ID=
MJ_TOKEN=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
AUTH_PASSWORD=
```

### RUN

```bash
npm install pm2 -g
npm run build
cd dist
pm2 start app.js
```
