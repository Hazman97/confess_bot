FROM node:18-slim

WORKDIR /app

COPY package*.json ./

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 \
    && npm install --production --build-from-source sqlite3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["node", "index.js"]
