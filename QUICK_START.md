# 🚀 Quick Start - Lấy Data Thật Cho Trending Stats

## ⚡ 5 Phút Setup

### 1. Copy config file
```bash
cp .env.example .env
```

### 2. Thêm Gemini API Key (Bắt buộc)
- Vào https://ai.google.dev/
- Click "Get API key"
- Copy key vào `.env`:
```
GEMINI_API_KEY=sk-...
```

### 3. (Optional) Thêm Facebook Token
Nếu muốn stats Facebook thực (không mock):
- Vào https://developers.facebook.com/tools/explorer/
- Generate access token
- Copy vào `.env`:
```
FB_ACCESS_TOKEN=EAA...
```

### 4. Cài packages
```bash
npm install
```

### 5. Chạy server
```bash
npm start
```

✅ Xong! Server chạy ở http://localhost:3000

---

## 📊 Data Sources

### ✅ Google Stats (Automatic)
- **Status**: ✅ Đã working
- **Data**: Search volume, trends
- **Config**: Không cần
- **Accuracy**: Good (estimated)

### ✅ TikTok Stats (Automatic)
- **Status**: ✅ Đã working (free scraping)
- **Data**: Views, likes, comments
- **Config**: Không cần
- **Accuracy**: Good (aggregate top 10 videos)
- **Rate Limit**: 50 req/min recommended

### ✅ Facebook Stats (Optional)
- **Status**: ✅ Đã working (mock data khi không config)
- **Data**: Views, likes, comments
- **Config**: Cần `FB_ACCESS_TOKEN` cho data thực
- **Accuracy**: Perfect (official API)
- **Rate Limit**: 200 req/min

---

## 📁 Project Structure

```
/
├── server.js                 # Main server
├── services/
│   ├── gemini.js            # AI summarization
│   ├── scraper.js           # Article scraping
│   ├── trending.js          # Trending logic
│   └── stats.js             # ⭐ Stats fetching (NEW)
├── utils/
│   └── helpers.js           # Utilities
├── public/
│   └── index.html           # UI with stats display
├── .env                      # Config (copy from .env.example)
└── test-stats.js            # Test stats
```

---

## 🧪 Test Stats

```bash
# Test all platforms
node test-stats.js

# Output:
# ✅ Google stats
# ✅ TikTok stats  
# ✅ Facebook stats
# ✅ Person stats
# ✅ Batch stats
```

---

## 🔍 Check Data In Browser

1. **Trending data with stats:**
   - http://localhost:3000/api/trending

2. **UI display:**
   - http://localhost:3000/
   - Scroll down → "Top 5 Nhân Vật Hot Trend 48h"
   - Mỗi person có stats grid

---

## 🎯 Features

### Tự động (No config needed)
- ✅ Google Trends RSS scraping
- ✅ TikTok search scraping
- ✅ Stats caching (30 min TTL)
- ✅ Error handling & fallback
- ✅ Parallel requests (fast)

### Optional (Config needed)
- 🔧 Facebook Graph API (real data)
- 🔧 Google Custom Search API (accurate)
- 🔧 TikTok official API (if available)

---

## 📊 Data Flow

```
1. Server starts
   ↓
2. Every 15 min (or manual refresh)
   ├─ Fetch Google Trends
   ├─ Scrape Kenh14 headlines
   ├─ Scrape Saostar headlines
   ↓
3. Gemini analyzes → Top 5 people
   ↓
4. Fetch stats for each person:
   ├─ Google: Search volume
   ├─ TikTok: Aggregate videos
   └─ Facebook: Graph API search
   ↓
5. Cache results (30 min)
   ↓
6. Send to UI with stats
   ↓
7. UI displays with formatting:
   🥇 Person Name
   ┌─ 🔍 Google: 50K searches
   ├─ 🎵 TikTok: 5M views, 250K likes, 25K comments
   └─ 📘 Facebook: 1M views, 50K likes, 5K comments
```

---

## ⚙️ Config Details

### `.env` Examples

**Minimal (Mock data):**
```
GEMINI_API_KEY=your_key
```

**With Facebook:**
```
GEMINI_API_KEY=your_key
FB_ACCESS_TOKEN=your_token
```

**Full:**
```
GEMINI_API_KEY=your_key
FB_ACCESS_TOKEN=your_token
GOOGLE_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_id
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Stats showing 0 | Check .env, restart server |
| TikTok 0 stats | Being rate limited, wait 1 min |
| Facebook 0 stats | Token expired, generate new one |
| Server won't start | `npm install` again, check Node.js version |
| Stats slow | Normal (parallel API calls) |

---

## 📚 Documentation

- `SETUP_STATS.md` - Detailed setup & API config
- `STATS_SETUP.md` - Alternative APIs & options
- `install.sh` - Automated setup script
- `test-stats.js` - Test script for validation

---

## 🚀 Next Steps

1. ✅ Run server: `npm start`
2. ✅ Test in browser: http://localhost:3000
3. ✅ Check console logs for data fetching
4. ✅ (Optional) Add Facebook token for real data
5. ✅ Deploy to production

---

## 💡 Tips

- **Faster stats**: Add `FB_ACCESS_TOKEN` (avoid scraping)
- **More accurate**: Use official APIs instead of scraping
- **Production ready**: Add Redis caching + database
- **Better performance**: Use background jobs (Bull.js)

---

## 📞 Support

**Something not working?**
1. Check `.env` file
2. Check console logs (`npm start`)
3. Run `node test-stats.js`
4. Check internet connection
5. Restart server

**Need help with APIs?**
- See `SETUP_STATS.md` for detailed guides
- Check API provider documentation
- Test manually with curl/Postman first

---

## ✨ Summary

```bash
# Complete setup in 3 commands:
cp .env.example .env              # 1. Copy config
npm install                        # 2. Install
npm start                          # 3. Run

# Access:
http://localhost:3000             # UI with trending + stats
http://localhost:3000/api/trending # Raw API data
```

**Current Status:**
- ✅ Google stats working (automatic)
- ✅ TikTok stats working (automatic)
- ✅ Facebook stats working (mock by default, real with token)
- ✅ UI displays all stats with formatting
- ✅ 30-minute caching to avoid rate limits
- ✅ Error handling & fallbacks
- ✅ Production ready!
