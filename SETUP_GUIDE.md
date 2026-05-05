# 🚀 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG

## 📦 Các Files Bạn Nhận Được

```
kenh14-scraper/
├── server.js              ← Express server (backend)
├── package.json           ← Dependencies
├── README.md              ← Tài liệu
├── QUICKSTART.txt         ← Hướng dẫn nhanh
└── public/
    └── index.html         ← Giao diện web
```

---

## 🔧 BƯỚC 1: CÀI ĐẶT NODEJS & NPM

### Windows:
1. Tải Node.js từ https://nodejs.org/ (LTS version)
2. Chạy file .msi và cài đặt
3. Mở Command Prompt, kiểm tra:
   ```bash
   node --version
   npm --version
   ```

### macOS:
```bash
# Dùng Homebrew
brew install node
```

### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install nodejs npm
```

---

## ✅ BƯỚC 2: SETUP PROJECT

### 1. Tạo thư mục project
```bash
mkdir kenh14-scraper
cd kenh14-scraper
```

### 2. Copy tất cả files vào thư mục
- Đặt `server.js`
- Đặt `package.json`
- Tạo thư mục `public/` và đặt `index.html` vào

### 3. Cài đặt dependencies
```bash
npm install
```

Output sẽ giống như này:
```
added 131 packages, audited 132 packages in 9s
found 0 vulnerabilities
```

---

## 🎯 BƯỚC 3: CHẠY SERVER

```bash
npm start
```

Nếu thành công, bạn sẽ thấy:
```
🚀 Server running at http://localhost:3000
📰 Kênh14 Scraper is ready!
```

---

## 🌐 BƯỚC 4: MỞ TRÌNH DUYỆT

1. Mở Chrome/Firefox/Safari/Edge
2. Truy cập: **http://localhost:3000**
3. Bạn sẽ thấy giao diện scraper

---

## 🔥 BƯỚC 5: SỬ DỤNG

### Ví dụ URL Kênh14:
```
https://kenh14.vn/dau-ai-ngo-o-met-gala-lisa-blackpink-dung-mat-ban-trai-tin-don-chi-6-giay-tuong-tac-thoi-da-du-gay-chu-y-215260505102013763.chn
```

### Quy trình:
1. **Dán URL** vào ô input
2. **Nhấn "Lấy Nội Dung"** hoặc Enter
3. **Chờ lấy dữ liệu** (thường 2-5 giây)
4. **Xem nội dung** bài viết ở textarea
5. **Nhấn "Copy Text"** để sao chép

---

## ⚙️ CẤU HÌNH NÂNG CAO

### Thay Đổi Port

Nếu port 3000 bị chiếm, mở `server.js`:

```javascript
const PORT = 3000;  // Thay thành port khác
```

Ví dụ, thay thành `8080`:
```javascript
const PORT = 8080;
```

Sau đó mở `http://localhost:8080`

### Auto-reload (Nodemon)

Để server tự động restart khi bạn sửa code:

```bash
npm install --save-dev nodemon
npm run dev
```

---

## 🐛 TROUBLESHOOTING

### ❌ Error: "Cannot find module 'express'"
```bash
npm install
```

### ❌ "Port 3000 is already in use"
Thay đổi PORT trong server.js hoặc đóng app khác dùng port này

**Windows (tìm process):**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

### ❌ "Cannot GET /"
- Kiểm tra file `public/index.html` có tồn tại không
- Kiểm tra đường dẫn folder `public/` đúng không

### ❌ Scraper không lấy được nội dung
- Kiểm tra URL có từ kenh14.vn không
- Xem console browser (F12) để xem lỗi chi tiết
- Cấu trúc HTML kenh14 có thể đã thay đổi

---

## 📊 CẤU TRÚC CÓ THỂM RỮ

### Server (backend)
```javascript
// server.js
- Nhận URL từ client
- Fetch HTML từ kenh14.vn
- Parse HTML bằng cheerio
- Trích xuất tiêu đề & nội dung
- Trả về JSON response
```

### Client (frontend)
```html
<!-- public/index.html -->
- Giao diện input & output
- Gửi request POST đến /api/scrape
- Hiển thị kết quả
- Copy clipboard
```

---

## 🎨 TÙYCHỈNH GIAO DIỆN

Nếu muốn thay đổi màu sắc, mở `public/index.html` tìm:

```css
:root {
    --primary: #FF4655;      /* Màu chính (đỏ) */
    --accent: #00d4ff;       /* Màu accent (xanh) */
    --text-primary: #1a1a2e; /* Màu chữ chính */
    /* ... */
}
```

Thay đổi mã HEX theo ý thích!

---

## 🚀 TRIỂN KHAI PRODUCTION

Để chạy online (không chỉ localhost):

### Option 1: Dùng Heroku (miễn phí)
1. Tạo tài khoản Heroku: https://www.heroku.com
2. Cài Heroku CLI
3. Deploy:
```bash
heroku login
heroku create my-kenh14-scraper
git push heroku main
```

### Option 2: Dùng Railway
1. Truy cập https://railway.app
2. Connect GitHub repo
3. Deploy tự động

### Option 3: Dùng VPS
- DigitalOcean
- Linode
- AWS EC2

---

## 📈 GIỚI HẠN & LƯU Ý

⚠️ **Pháp lý:**
- Sử dụng cho học tập & nghiên cứu cá nhân
- Tuân thủ Terms of Service của kenh14.vn
- Không scrape quá nhiều trang trong thời gian ngắn

⚠️ **Kỹ thuật:**
- Một số bài viết có cấu trúc HTML khác, có thể cần điều chỉnh
- kenh14.vn có thể thay đổi cấu trúc HTML → cần update code
- Tốc độ tùy thuộc vào kết nối internet

---

## 💡 MẸO & TRICKS

### 1. Lấy batch URL
Viết một script để lấy nhiều bài:
```javascript
const urls = [
  'https://kenh14.vn/...',
  'https://kenh14.vn/...',
  // ...
];

for (const url of urls) {
  // Scrape mỗi URL
}
```

### 2. Lưu vào file
Thêm endpoint `/api/export` để export CSV/JSON

### 3. Database
Thêm MongoDB để lưu trữ dữ liệu đã scrape

### 4. Scheduler
Dùng `node-schedule` để scrape tự động theo lịch

---

## 📚 TÀI LIỆU THAM KHẢO

- **Express.js:** https://expressjs.com
- **Cheerio:** https://cheerio.js.org
- **Axios:** https://axios-http.com

---

## 🤝 SUPPORT & FEEDBACK

Nếu có lỗi:

1. **Kiểm tra console:**
   - Browser: Nhấn F12 → Console
   - Terminal: Xem output từ `npm start`

2. **Google error message:** Thường có solution

3. **GitHub Issues:** Search hoặc tạo issue mới

---

## ✨ THÀNH CÔNG!

Nếu bạn nhìn thấy:
- ✅ Server chạy tại http://localhost:3000
- ✅ Giao diện load đúng
- ✅ Có thể nhập URL & lấy nội dung

**Chúc mừng! Bạn đã setup thành công! 🎉**

---

**Vui lòng liên hệ nếu có vấn đề!**
