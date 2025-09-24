FROM node:18-bullseye-slim

WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies & rebuild sqlite3 for ARM
RUN npm ci --production --unsafe-perm --no-audit --no-fund \
 && npm rebuild sqlite3 --build-from-source --unsafe-perm \
 && rm -rf /root/.npm /root/.cache

# Copy application source
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
