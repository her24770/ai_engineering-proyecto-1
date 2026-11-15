# syntax=docker/dockerfile:1
# Un solo Dockerfile con dos destinos:
#   --target server -> backend Node (agente + endpoints)
#   --target web    -> Caddy sirviendo el widget y haciendo de reverse proxy

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/src/index.ts"]

FROM caddy:2-alpine AS web
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
