# Dockerfile (recommended) - Debian-based (Node 18)
FROM node:18-bullseye-slim

WORKDIR /usr/src/app

# Install build deps required to compile sqlite3 native addon
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    python3 \
    pkg-config \
    libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install production deps and build native addon.
# --unsafe-perm is useful when running npm as root inside Docker
RUN npm ci --production --unsafe-perm --no-audit --no-fund \
 && npm rebuild sqlite3 --build-from-source --unsafe-perm \
 && rm -rf /root/.npm /root/.cache

# Copy app source
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
