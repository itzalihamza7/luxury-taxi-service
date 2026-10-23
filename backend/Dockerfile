# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

# --- Compile TypeScript (needs the dev dependencies) --------------------------
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- Production dependencies only ---------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- IP geolocation database ---------------------------------------------------
# DB-IP's free city database (CC BY 4.0), published monthly: this month's, or last
# month's early in a month. Without it the site still works; clicks just have no place.
FROM alpine:3 AS geoip
RUN apk add --no-cache curl && mkdir /geoip && cd /geoip \
  && for month in "$(date +%Y-%m)" "$(date -d "@$(( $(date +%s) - 2678400 ))" +%Y-%m)"; do \
       curl -fsSL "https://download.db-ip.com/free/dbip-city-lite-$month.mmdb.gz" | gunzip > dbip-city-lite.mmdb && break; \
       rm -f dbip-city-lite.mmdb; \
     done; \
  [ -s dbip-city-lite.mmdb ] || echo "IP geolocation database unavailable"

# --- Runtime image --------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Owned by the runtime user: files synced out of a dev container can arrive on the
# host readable by their owner only, and COPY would preserve that.
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node package.json ./
COPY --from=geoip --chown=node:node /geoip ./geoip
ENV GEOIP_DB=/app/geoip/dbip-city-lite.mmdb
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Bring the database schema up to date, add any missing starting data, then serve.
# `exec` makes Node the main process, so it receives the stop signal and shuts down cleanly.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && exec node dist/server.js"]
