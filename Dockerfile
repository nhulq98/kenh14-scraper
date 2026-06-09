# Build stage
FROM node:18-slim

# Install Chrome/Chromium and dependencies
RUN apt-get update && apt-get install -y \
    chromium-browser \
    chromium \
    libnss3 \
    libxss1 \
    libasound2 \
    libappindicator1 \
    libindicator7 \
    fonts-liberation \
    xdg-utils \
    wget \
    ca-certificates \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Start the application
CMD ["npm", "start"]
