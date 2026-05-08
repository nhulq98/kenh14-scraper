# Trending Logic - Cập Nhật

## Thay Đổi Chính

### Trước (Complex):
- Tìm **5 bài báo** từ **5 nguồn khác nhau** (kenh14, saostar, theanh28, beatvn, yan)
- Dedupe bài báo
- Sau đó map từng bài với người (có thể 2 bài nói về cùng 1 người)

### Sau (Simplified):
- Xác định **5 người hot nhất** bằng Gemini
- Tìm **ĐÚNG 1 bài báo** cho **mỗi người** từ **kenh14 + saostar**
- Đảm bảo **không trùng bài báo** (1 URL chỉ dùng 1 lần)

---

## Flow Chi Tiết

### 1. Fetch Headlines
\`\`\`
kenh14.vn → 30 tiêu đề
saostar.vn → 30 tiêu đề
-----------
Tổng: ~60 tiêu đề
\`\`\`

### 2. Gemini Analysis
\`\`\`
Input: 60 tiêu đề
Gemini: Phân tích → Top 5 hot names
Output: ["Tên 1", "Tên 2", "Tên 3", "Tên 4", "Tên 5"]
\`\`\`

### 3. Fetch Stats
\`\`\`
Cho mỗi 5 tên:
  → getPeopleStats() → Facebook stats (views, likes, comments)
\`\`\`

### 4. Find Articles ⭐ NEW LOGIC
\`\`\`
Cho Người #1:
  → searchKenh14("Tên 1") → found article #1 → usedUrls.add(URL)
  
Cho Người #2:
  → searchKenh14("Tên 2") → found article #2 (URL ≠ article #1)
  → usedUrls.add(URL)
  
Cho Người #3:
  → searchKenh14("Tên 3") → không tìm được
  → searchSaostar("Tên 3") → found article #3 → usedUrls.add(URL)
  
... tương tự Người 4, 5

Result: Max 5 articles, mỗi URL dùng 1 lần, mỗi người max 1 bài
\`\`\`

---

## Code Changes

### File: `services/trending.js`

#### 1. Xóa function cũ
\`\`\`javascript
// Xóa: fetchTop5Articles(people)
\`\`\`

#### 2. Thêm function mới
\`\`\`javascript
async function fetchArticlesForPeople(people) {
    const sources = [
        { url: 'https://kenh14.vn/star.chn', name: 'Kenh14' },
        { url: 'https://www.saostar.vn/giai-tri/', name: 'Saostar' }
    ];

    const results = [];
    const usedUrls = new Set();

    // Cho mỗi người, tìm 1 bài báo từ 2 nguồn
    for (const person of people) {
        if (!person) continue;
        let found = false;

        for (const src of sources) {
            if (found) break;
            const articles = await scrapeArticlesFromSource(src.url, src.name, [person]);
            
            // Lấy bài báo đầu tiên chưa được dùng
            for (const article of articles) {
                if (!usedUrls.has(article.url)) {
                    results.push(article);
                    usedUrls.add(article.url);
                    found = true;
                    console.log(\`📄 \${person}: found article from \${src.name}\`);
                    break;
                }
            }
        }

        if (!found) {
            console.log(\`⚠️ \${person}: không tìm được bài báo\`);
        }
    }

    return results;
}
\`\`\`

#### 3. Update updateTrendingData()
\`\`\`javascript
// Trước:
const top5Articles = await fetchTop5Articles(top5People);

// Sau:
const articles = await fetchArticlesForPeople(top5People);
\`\`\`

---

## Result

✅ **Simpler logic** - 1 article per person, kenh14+saostar only  
✅ **No duplicates** - URL tracking  
✅ **Cache friendly** - 30 min TTL  
✅ **Server compatible** - Đã test syntax  

---

## Test

\`\`\`bash
# Validate module
node -e "require('./services/trending.js'); console.log('✅ OK')"

# Validate server
node -c server.js
\`\`\`

Output: ✅ All pass
