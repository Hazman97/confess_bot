# Dockerfile (multi-stage)
FROM node:18-bullseye-slim AS builder
WORKDIR /usr/src/app
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --unsafe-perm --no-audit --no-fund
COPY . .
RUN npm rebuild sqlite3 --build-from-source --unsafe-perm

FROM node:18-bullseye-slim AS runtime
WORKDIR /usr/src/app
# install runtime sqlite shared lib only
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libsqlite3-0 ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/app ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
