FROM node:22-alpine AS build
WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/

RUN npm ci --workspace=web

COPY web/ ./web/
RUN npm run --workspace=web build

FROM nginx:alpine
COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
