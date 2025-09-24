FROM --platform=linux/arm64 node:18-slim

WORKDIR /app

COPY package*.json ./

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    apt-transport-https \
    python3 \
    make \
    g++ \
    pkg-config \
    libsqlite3-dev \
 && npm install --production \
 && npm rebuild sqlite3 --build-from-source \
 && apt-get purge -y --auto-remove make g++ pkg-config \
 && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["node", "index.js"]
