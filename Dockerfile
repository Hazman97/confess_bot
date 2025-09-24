FROM --platform=linux/arm64 node:18-slim

WORKDIR /app

COPY package*.json ./

# Install build deps + rebuild sqlite3 for ARM
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 build-essential \
    && npm install --production \
    && npm rebuild sqlite3 --build-from-source \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["node", "index.js"]
