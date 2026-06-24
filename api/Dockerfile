FROM node:22-alpine
WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/

# Install only api workspace deps (production)
RUN npm ci --workspace=api --omit=dev

COPY api/ ./api/
EXPOSE 3000
CMD ["node", "api/src/server.js"]
