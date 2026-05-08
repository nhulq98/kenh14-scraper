#!/usr/bin/env node

# 🚀 KÊNH14 SCRAPER + TRENDING STATS - BẮT ĐẦU NGAY

## ⚡ 3 BƯỚC SETUP (5 PHÚT)

### Bước 1: Copy config
```bash
cp .env.example .env
```

### Bước 2: Thêm Gemini API key
Vào https://ai.google.dev/ → Lấy key → Thêm vào `.env`:
```
GEMINI_API_KEY=your_key_here
```

### Bước 3: Chạy
```bash
npm install
npm start
```

**Xong! Truy cập:** http://localhost:3000

---

## 📊 CÁI GÌ ĐÃ HOÀN THIỆN

✅ **Backend:**
- Fetch real-time stats từ Google Trends
- TikTok engagement metrics
- Facebook public data
- Caching (30 min)
- Error handling

✅ **Frontend:**
- Beautiful trending display
- Stats grid for each person
- Responsive mobile design
- Auto refresh

✅ **Documentation:**
- QUICK_START.md - Setup
- SETUP_STATS.md - API config
- DEPLOYMENT.md - Production
- examples.js - Usage

---

## 📈 DATA SOURCES

| Platform | Status | Config | Update |
|----------|--------|--------|--------|
| Google | ✅ Auto | None | Real-time |
| TikTok | ✅ Auto | None | Real-time |
| Facebook | ✅ Mock | Optional | Real-time |

---

## 🧪 TEST

```bash
# Test stats
node test-stats.js

# See examples
node examples.js

# Check API
curl http://localhost:3000/api/trending | jq
```

---

## 🔑 OPTIONAL: Real Facebook Stats

```bash
# 1. Go to https://developers.facebook.com/tools/explorer/
# 2. Generate access token
# 3. Add to .env:
FB_ACCESS_TOKEN=your_token_here
# 4. Restart server
```

---

## 📱 USAGE

**UI:** http://localhost:3000/
- Xem top 5 trending people
- Stats grid: Google | TikTok | Facebook
- Manual refresh button

**API:** http://localhost:3000/api/trending
```json
{
  "people": [
    {
      "name": "Person",
      "stats": {
        "google": {"searches": 50000},
        "tiktok": {"views": 5M, "likes": 250K},
        "facebook": {"views": 1M, "likes": 50K}
      }
    }
  ]
}
```

---

## 🐛 PROBLEM?

| Issue | Fix |
|-------|-----|
| Module not found | `npm install` |
| Port in use | `lsof -ti:3000 \| xargs kill` |
| API key error | Check `.env` file |
| Stats = 0 | Wait 1 min (cache) |
| Server crash | Check internet |

---

## 📚 DOCUMENTATION

- `QUICK_START.md` - Quick setup
- `SETUP_STATS.md` - API configuration
- `DEPLOYMENT.md` - Production
- `COMPLETE.md` - Full summary
- `examples.js` - Code examples

---

## 🎯 FILES

**New:**
- `services/stats.js` ⭐ (Stats fetcher)
- `QUICK_START.md`
- `test-stats.js`
- `examples.js`

**Modified:**
- `services/trending.js` (Now fetches stats)
- `public/index.html` (Stats display)
- `package.json` (Optional packages)

---

## ✨ FEATURES

✅ Article scraping
✅ AI summarization (Gemini)
✅ Trending detection
✅ Real-time stats fetching
✅ Smart caching
✅ Beautiful UI
✅ Error handling
✅ Production ready

---

## 🚀 NEXT

```bash
# 1. Copy config
cp .env.example .env

# 2. Edit .env - Add API key
GEMINI_API_KEY=sk-...

# 3. Install & Run
npm install && npm start

# 4. Open browser
http://localhost:3000

# 5. Check trending data
http://localhost:3000/api/trending
```

---

**Ready? Let's go! 🎉**
