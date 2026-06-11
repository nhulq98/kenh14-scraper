# Use Node.js slim image
FROM node:18-slim

# Update and install only essential dependencies for Chromium
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libxss1 \
    libasound2 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgbm1 \
    libdrm2 \
    libx11-6 \
    libxcb1 \
    libxrandr2 \
    libxext6 \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libxtst6 \
    fonts-liberation \
    xdg-utils \
    wget \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies (production only)
RUN npm install --production --silent

# Copy app files
COPY . .

# Expose port
EXPOSE 3000

# Environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["npm", "start"]
