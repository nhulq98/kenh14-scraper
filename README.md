# 📰 Kênh14 Content Scraper

Ứng dụng web scraper để lấy nội dung từ các bài viết trên Kênh14.vn

## 🚀 Cài đặt

### 1. Yêu cầu
- Node.js (phiên bản 14+)
- npm

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Chạy server
```bash
npm start
```

Server sẽ chạy tại: **http://localhost:3000**

## 💻 Sử dụng

1. Mở trình duyệt và truy cập `http://localhost:3000`
2. Dán URL bài viết từ kenh14.vn vào input
3. Nhấn "Lấy Nội Dung" hoặc Enter
4. Nội dung bài viết sẽ hiển thị trong textarea
5. Nhấn "Copy Text" để sao chép vào clipboard

## 📁 Cấu trúc project

```
kenh14-scraper/
├── server.js           # Express server & scraping logic
├── package.json        # Dependencies
├── public/
│   └── index.html      # Frontend HTML
└── README.md           # Tài liệu này
```

## 🔧 Tính năng

- ✅ Lấy tiêu đề bài viết
- ✅ Lấy toàn bộ nội dung bài viết
- ✅ Đếm ký tự và từ
- ✅ Copy nhanh vào clipboard
- ✅ Giao diện hiện đại & responsive
- ✅ Xử lý lỗi chi tiết

## 📊 Endpoints API

### POST /api/scrape
Lấy nội dung từ bài viết

**Request:**
```json
{
  "url": "https://kenh14.vn/..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "title": "Tiêu đề bài viết",
  "content": "Nội dung đầy đủ...",
  "charCount": 1000,
  "wordCount": 150
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Thông báo lỗi"
}
```

## ⚠️ Lưu ý

- Chỉ hỗ trợ URL từ kenh14.vn
- Một số bài viết có cấu trúc HTML khác nhau, có thể cần điều chỉnh selectors
- Tuân thủ điều khoản sử dụng của kenh14.vn

## 🛠️ Troubleshooting

### Lỗi: "Cannot find module 'express'"
```bash
npm install
```

### Server không chạy được
- Kiểm tra port 3000 có bị chiếm không
- Thay đổi PORT trong server.js nếu cần

### Không lấy được nội dung
- Kiểm tra URL có hợp lệ không
- Xem console log để biết chi tiết lỗi
- Có thể cấu trúc HTML của kenh14 đã thay đổi

## 📝 Giấy phép

MIT

## 👨‍💻 Phát triển thêm

Để phát triển, sử dụng:
```bash
npm install --save-dev nodemon
npm run dev
```

Server sẽ tự động restart khi code thay đổi.

---

**Made with ❤️ for Vietnamese news scraping**
