# Use Node.js Alpine image for ARM64 (Raspberry Pi 4)
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && \
    npm install --production --no-optional --verbose

# Copy application files
COPY . .

# Create directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Expose port (if you plan to add health checks later)
EXPOSE 3000

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S discordbot -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R discordbot:nodejs /app

# Switch to non-root user
USER discordbot

# Start the bot
CMD ["node", "index.js"]