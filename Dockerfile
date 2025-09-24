FROM --platform=linux/arm64 node:18-slim

WORKDIR /app

COPY package*.json ./

# Install only what we need
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*



COPY . .

CMD ["node", "index.js"]
