# Use the Node 18 image that matches the target architecture (ARM on CM4)
FROM --platform=linux/arm64 node:18-slim

WORKDIR /app

COPY package*.json ./

# Install build dependencies (needed for sqlite3 build)
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 build-essential \
    && npm install --production --build-from-source sqlite3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["node", "index.js"]
