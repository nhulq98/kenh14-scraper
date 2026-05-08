# Trending Flow - Simplified

## Quy trình:

### 1. Thu thập tiêu đề (Headlines Scraping)
- Lấy 30 tiêu đề từ **kenh14.vn/star.chn**
- Lấy 30 tiêu đề từ **saostar.vn/giai-tri/**
- Tổng: ~60 tiêu đề từ 48h qua

### 2. Phân tích Top 5 Người (Gemini Analysis)
- Gửi toàn bộ tiêu đề cho Gemini
- Gemini xác định **5 tên nổi tiếng nhất** dựa trên:
  - Số lần xuất hiện trong tiêu đề
  - Mức độ hot/trending
- Output: `["Tên 1", "Tên 2", "Tên 3", "Tên 4", "Tên 5"]`

### 3. Fetch Stats
- Lấy Facebook stats cho mỗi 5 người
- Trả về: `views`, `likes`, `comments`

### 4. Tìm 1 Bài Báo/Người (Article Matching) - **MỚI**
- **Qui tắc:** Mỗi trong 5 người nhận **ĐÚNG 1 bài báo**
- **Không trùng:** Không 2 người dùng bài báo cùng 1 URL
- **Nguồn:** Chỉ từ **kenh14** và **saostar**
- **Thời gian:** Bài báo trong 48h qua
- **Quy trình:**
  ```
  Cho Người #1:
    - Tìm bài từ kenh14 → lấy 1 bài đầu tiên
    - Nếu không có → tìm bài từ saostar → lấy 1 bài đầu tiên
  Cho Người #2:
    - Tìm bài từ kenh14 → lấy 1 bài đầu tiên (khác URL đã dùng)
    - Nếu không có → tìm bài từ saostar → lấy 1 bài đầu tiên (khác URL đã dùng)
  ... tương tự cho Người 3, 4, 5
  ```

### 5. Output
- **Trending People:** 5 người + stats + 1 bài báo
- **Total Articles:** ≤ 5 bài (1 cho mỗi người)

## Sự khác biệt so với trước:
- ❌ Xóa: Tìm 5 bài báo độc lập từ nhiều nguồn
- ❌ Xóa: Dedupe chỉ ở mục articles
- ✅ Thêm: 1 bài báo/người, từ kenh14+saostar
- ✅ Thêm: Dedupe theo người + URL

## Kiểm tra:
```bash
node -e "const t = require('./services/trending.js'); console.log(t.getTrendingCache())"
```

Output khi chạy lần đầu (sẽ rỗng cho đến khi updateTrendingData() gọi):
```json
{
  "people": [],
  "articles": [],
  "updatedAt": null
}
```

Sau khi `updateTrendingData()` chạy (với API key):
```json
{
  "people": [
    { "name": "Tên 1", "stats": { "facebook": {...} } },
    { "name": "Tên 2", "stats": { "facebook": {...} } },
    ...
  ],
  "articles": [
    { "title": "...", "url": "...", "source": "Kenh14", "date": "..." },
    { "title": "...", "url": "...", "source": "Saostar", "date": "..." },
    ...
  ],
  "updatedAt": "2026-05-08T..."
}
```
