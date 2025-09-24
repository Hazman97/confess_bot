FROM node:18-alpine

WORKDIR /usr/src/app

# Install build dependencies for sqlite3
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    pkgconf \
    sqlite-dev \
 && ln -sf /usr/bin/python3 /usr/bin/python

COPY package*.json ./

RUN npm ci --production --unsafe-perm --no-audit --no-fund \
 && npm rebuild sqlite3 --build-from-source --unsafe-perm \
 && rm -rf /root/.npm /root/.cache

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
