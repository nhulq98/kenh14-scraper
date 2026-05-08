# 🚀 Setup Guide - Lấy Data Thật

Hướng dẫn chi tiết để setup và lấy data thực từ Google, TikTok, Facebook.

## 📋 Yêu Cầu

- Node.js 14+
- npm hoặc yarn
- Account trên các platform (Google, TikTok, Facebook)

## ⚡ Quick Start (5 phút)

### 1. Copy .env.example
```bash
cp .env.example .env
```

### 2. Install packages
```bash
npm install
# Optional: install for real stats
npm install google-trends-api tiktok-scraper --save-dev
```

### 3. Config Gemini API (Bắt buộc)
- Vào https://ai.google.dev/
- Click "Get API key"
- Copy key vào `.env`:
```
GEMINI_API_KEY=your_key_here
```

### 4. Chạy server
```bash
npm start
# Hoặc development mode
npm run dev
```

✅ **Xong! Server sẽ fetch data từ Google Trends + mock data từ TikTok & Facebook**

---

## 📊 Chi Tiết Từng Platform

### 1️⃣ GOOGLE STATS (🔍 Search Volume)

#### Option A: Tự động (Recommended)
**Không cần config, code sẽ tự scrape từ Google Trends RSS**

```javascript
// Đã implement trong services/stats.js
- Lấy trending searches từ Google Trends Vietnam
- Tự động tính toán search volume estimate
- Không cần API key
```

**Ưu điểm:**
- ✅ Miễn phí, không rate limit
- ✅ Không cần authenticate
- ✅ Real-time data

**Nhược điểm:**
- ❌ Estimate value, không 100% chính xác
- ❌ Phụ thuộc vào scraping (có thể break khi Google thay đổi)

#### Option B: Google Custom Search API (Nếu muốn chính xác)

**Setup:**
1. Vào https://developers.google.com/custom-search
2. Click "Create" → Tạo custom search engine
3. Vào https://console.developers.google.com/
4. Enable "Custom Search API"
5. Create API key
6. Thêm vào `.env`:
```
GOOGLE_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

**Cost:** $5 per 1000 queries (hơi đắt nếu dùng nhiều)

---

### 2️⃣ TIKTOK STATS (📱 Views, Likes, Comments)

#### Option A: Scraping (Hiện tại - Free)
**Code đã implement, lấy data từ TikTok search/hashtag**

```bash
npm install axios  # Already installed
```

**Cách hoạt động:**
- Tìm videos về người đó trên TikTok
- Aggregate stats từ top 10 videos
- Total views, likes, comments

**Ưu điểm:**
- ✅ Miễn phí
- ✅ Real-time data
- ✅ Không cần authenticate

**Nhược điểm:**
- ❌ Bị rate limit (50 req/min)
- ❌ Có thể bị block IP
- ❌ Không 100% chính xác

#### Option B: TikTok Unofficial API
```bash
npm install tiktok-scraper --save-dev
```

**Setup:**
1. Cài package
2. Thêm vào `.env`:
```
TIKTOK_SESSION_ID=your_session_id
TIKTOK_CSRF_TOKEN=your_csrf_token
```

3. Lấy session ID:
   - Mở TikTok.com
   - Inspect → Application → Cookies
   - Tìm `sessionid`
   - Copy giá trị

#### Option C: Browser Automation (Slow but Reliable)
```bash
npm install puppeteer --save-dev
```

**Ưu điểm:**
- ✅ Most reliable
- ✅ Like real user

**Nhược điểm:**
- ❌ Rất chậm (10+ seconds per request)
- ❌ CPU intensive
- ❌ Khó deploy

---

### 3️⃣ FACEBOOK STATS (👍 Engagement)

#### Option A: Facebook Graph API (Recommended)

**Setup (5 phút):**

1. **Vào Facebook Developer Console:**
   - https://developers.facebook.com/
   - Login với Facebook account

2. **Create Application (hoặc dùng existing):**
   - Chọn "My Apps" → "Create App"
   - App type: "Business"
   - Điền info

3. **Get Page Access Token:**
   - Vào https://developers.facebook.com/tools/explorer/
   - Bên trái: Chọn app của bạn
   - Bấm "Get User Token"
   - Chọn permissions:
     - ✅ pages_read_engagement
     - ✅ pages_read_user_profile
   - Bấm "Generate Access Token"
   - Copy token vào `.env`:
   ```
   FB_ACCESS_TOKEN=your_access_token_here
   ```

4. **Test API:**
   - Mở Terminal
   - Chạy:
   ```bash
   # Test getting page list
   curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN"
   
   # Test getting page stats
   curl "https://graph.facebook.com/v18.0/PAGE_ID?fields=fan_count,engagement&access_token=YOUR_TOKEN"
   ```

**Ưu điểm:**
- ✅ Official API
- ✅ Accurate data
- ✅ High rate limits

**Nhược điểm:**
- ❌ Cần authenticate
- ❌ Token expires (need refresh)
- ❌ Có limitations trên public data

#### Token Refresh (tự động)
- Token hết hạn sau 60 ngày
- Cần manual refresh bằng cách re-generate
- Hoặc implement auto-refresh logic

---

## 🔧 Implementation Guide

### File: `services/stats.js`

Code hiện tại support:

```javascript
// 1. Google - Tự động
✅ getGoogleStats(personName)
   // Scrapes Google Trends, không cần config

// 2. TikTok - Tự động (free scraping)
✅ getTikTokStats(personName)
   // Search TikTok, lấy top 10 videos stats

// 3. Facebook - Cần Token
✅ getFacebookStats(personName)
   // Dùng Graph API, cần FB_ACCESS_TOKEN
```

### Caching (Tự động)
- TTL: 30 minutes
- Tránh redundant API calls
- Auto-clear old cache

### Error Handling (Tự động)
- Try-catch mỗi platform
- Fallback to 0 nếu error
- Log warnings
- Không crash server

---

## 📈 Performance Tips

### 1. **Reduce API Calls**
```javascript
// Cache stores results 30 min
// Re-run after 30 min hoặc manual refresh
```

### 2. **Batch Requests**
```javascript
// Fetch 5 people cùng lúc (parallel)
// Không sequential (lâu hơn)
```

### 3. **Rate Limiting**
```javascript
// Google: Unlimited (RSS)
// TikTok: 50 req/min recommended
// Facebook: 200 req/min
```

### 4. **Database (Future)**
```bash
# Để tracking historical data
npm install mongoose  # MongoDB
# hoặc
npm install sqlite3   # SQLite
```

---

## 🧪 Testing

### Test Individual Functions:
```bash
# Terminal
node -e "
const stats = require('./services/stats.js');
stats.getPersonStats('Phương Oanh').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

### Test API Endpoint:
```bash
curl http://localhost:3000/api/trending | jq '.people[0]'
```

### View Console Logs:
```bash
# Server log sẽ show:
📊 Google Trends VN: ...
📰 Kenh14 headlines: ...
🔄 Fetching fresh stats for "Name"...
✅ Fetched stats for 5 people
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `FB_ACCESS_TOKEN not configured` | Add token to `.env`, restart server |
| `TikTok returning 0 stats` | API might be rate limited, wait 1 min |
| `Google stats showing 0` | Google Trends might be down, check RSS feed manually |
| `Stats not updating` | Check cache TTL (30 min), or click "Refresh" button |
| `Timeout errors` | Increase timeout in code, check internet |

---

## 📝 Next Steps

1. **Copy .env.example to .env**
   ```bash
   cp .env.example .env
   ```

2. **Add Gemini API Key** (bắt buộc)
   ```
   GEMINI_API_KEY=your_key
   ```

3. **Optional: Add Facebook Token**
   ```
   FB_ACCESS_TOKEN=your_token
   ```

4. **Run server**
   ```bash
   npm start
   ```

5. **Check trending at:**
   - http://localhost:3000/api/trending
   - UI: http://localhost:3000/

---

## 📞 Support

**Có errors?**
1. Check `.env` file có đủ keys không
2. Check console logs cho error messages
3. Check network connection
4. Restart server

**Muốn add platform khác?**
- Thêm hàm vào `services/stats.js`
- Export từ module
- Import ở `services/trending.js`
- Update UI ở `public/index.html`

**Muốn store data?**
- Thêm database ở `services/db.js`
- Save stats sau mỗi fetch
- Query historical data
