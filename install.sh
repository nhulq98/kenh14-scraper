#!/bin/bash
# Installation script for Trending Stats setup

echo "🚀 Kênh14 Scraper + Trending Stats Setup"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js found: $VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 14+ from https://nodejs.org${NC}"
    exit 1
fi

# Step 2: Check npm
echo ""
echo "2️⃣  Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm found: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Step 3: Install dependencies
echo ""
echo "3️⃣  Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Step 4: Create .env file
echo ""
echo "4️⃣  Creating .env file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env created from .env.example${NC}"
    echo -e "${YELLOW}⚠️  Edit .env and add your API keys:${NC}"
    echo "   - GEMINI_API_KEY (required)"
    echo "   - FB_ACCESS_TOKEN (optional)"
    echo ""
else
    echo -e "${YELLOW}⚠️  .env already exists${NC}"
fi

# Step 5: Install optional packages
echo ""
echo "5️⃣  Installing optional packages for real stats..."
echo -e "${YELLOW}This may take a few minutes...${NC}"

read -p "Install google-trends-api? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install google-trends-api --save-dev
    echo -e "${GREEN}✅ google-trends-api installed${NC}"
fi

read -p "Install tiktok-scraper? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install tiktok-scraper --save-dev
    echo -e "${GREEN}✅ tiktok-scraper installed${NC}"
fi

# Step 6: Test setup
echo ""
echo "6️⃣  Testing setup..."
read -p "Run test-stats.js? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    node test-stats.js
fi

# Summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file and add API keys"
echo "2. Run: npm start (or npm run dev)"
echo "3. Visit: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "- SETUP_STATS.md - Detailed setup guide"
echo "- STATS_SETUP.md - API configuration"
echo ""
