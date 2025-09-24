# Dockerfile (alpine)
FROM node:18-alpine
WORKDIR /usr/src/app

# build deps for native addons
RUN apk add --no-cache \
      python3 \
      build-base \
      pkgconfig \
      sqlite-dev \
 && ln -sf /usr/bin/python3 /usr/bin/python

COPY package*.json ./

RUN npm ci --production --unsafe-perm --no-audit --no-fund \
 && npm rebuild sqlite3 --build-from-source --unsafe-perm \
 && rm -rf /root/.npm /root/.cache

COPY . .
EXPOSE 3000
CMD ["node","server.js"]
