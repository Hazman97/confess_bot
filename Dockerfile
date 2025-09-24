FROM --platform=linux/arm64 node:18-slim

WORKDIR /app

COPY package*.json ./

# Install only what we need
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    libsqlite3-dev \
 && npm install --production \
 && npm rebuild sqlite3 --build-from-source

COPY . .

CMD ["node", "index.js"]
