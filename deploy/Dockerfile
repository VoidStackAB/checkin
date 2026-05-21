# API only — static SPA is served by host Caddy from /var/www/checkin
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci -w api --omit=dev

COPY api/src ./api/src

WORKDIR /app/api

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/server.js"]
