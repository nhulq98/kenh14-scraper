# 🎙️ Viettel Text-to-Speech Integration Guide

## 📝 Tổng Quan

Tính năng Viettel Text-to-Speech đã được tích hợp vào ứng dụng của bạn. Điều này cho phép:

✅ Chuyển đổi văn bản tiếng Việt thành âm thanh tự nhiên  
✅ Chọn từ 16 giọng đọc với các accent khác nhau  
✅ Điều chỉnh tốc độ đọc (0.8x - 1.2x)  
✅ Nghe thử âm thanh trực tiếp  
✅ Tải về dạng MP3  

## 🎯 Các Tính Năng Chính

### 1️⃣ **Ô Nhập Văn Bản**
- Nhập hoặc dán văn bản tiếng Việt
- Tối đa 300 ký tự
- Có thể copy từ "Nội Dung Gốc" (nếu đã scrape bài viết)
- Đếm ký tự real-time

### 2️⃣ **Chọn Giọng Đọc** 🎤
16 giọng đọc được chia thành 3 miền:

**Miền Bắc** (8 giọng)
- Quỳnh Anh, Phương Trang, Thảo Chi, Thanh Hà (Nữ)
- Thanh Tùng, Nam Khánh, Tiến Quân, Thanh Phương (Nam)

**Miền Trung** (2 giọng)
- Mai Ngọc (Nữ), Bảo Quốc (Nam)

**Miền Nam** (6 giọng)
- Diễm My, Phương Ly, Thủy Dung, Thủy Duyên, Lệ Yên (Nữ)
- Minh Quân (Nam)

### 3️⃣ **Chọn Tốc Độ Đọc** ⚡
- 0.8x - Chậm
- 0.9x - Vừa Chậm
- 1.0x - Bình Thường (mặc định)
- 1.1x - Vừa Nhanh
- 1.2x - Nhanh

### 4️⃣ **Nút Chuyển Thành Âm Thanh** 🎙️
- Nhấn để bắt đầu chuyển đổi
- Hiển thị tiến độ loading
- Trả về audio MP3 hoặc thông báo lỗi

### 5️⃣ **Nút Nghe Thử** ▶️
- Phát âm thanh vừa tạo trong trình duyệt
- Bộ điều khiển âm thanh tích hợp
- Cho phép tạm dừng/tiếp tục phát

### 6️⃣ **Nút Tải Về** ⬇️
- Tải file MP3 về máy
- Tên file tự động với timestamp
- Định dạng: `audio_HH-MM-SS.mp3`

## 🚀 Cách Sử Dụng

### Bước 1: Cấu Hình Token
Xem file `VIETTEL_TTS_SETUP.md` để hướng dẫn chi tiết

### Bước 2: Khởi Động Server
```bash
npm start
```

### Bước 3: Mở Ứng Dụng
```
http://localhost:3000
```

### Bước 4: Sử Dụng TTS
1. Cuộn xuống mục "Viettel Text-to-Speech"
2. Nhập văn bản (hoặc copy từ nội dung gốc)
3. Chọn giọng đọc
4. Chọn tốc độ
5. Nhấn "Chuyển Thành Âm Thanh"
6. Nghe thử hoặc tải về

## 📁 Cấu Trúc Code

### Frontend (HTML/JavaScript)
- **File:** `public/index.html`
- **Phần CSS:** Styles cho TTS section
- **Phần JavaScript:** 
  - `updateTtsCharCount()` - Đếm ký tự
  - `copyFromContent()` - Copy từ nội dung
  - `convertToSpeech()` - Gửi request API
  - `playAudio()` - Phát âm thanh
  - `downloadAudio()` - Tải file MP3

### Backend (Express.js)
- **File:** `server.js`
- **Endpoint:** `POST /api/tts/convert`
- **Tham số:**
  ```json
  {
    "text": "Văn bản tiếng Việt",
    "voice": "hcm-diemmy",
    "speed": 1
  }
  ```
- **Response:** Audio stream (MP3)

## ⚙️ Chi Tiết Kỹ Thuật

### API Viettel
- **URL:** `https://viettelai.vn/tts/speech_synthesis`
- **Method:** POST
- **Authentication:** Token-based
- **Content Type:** application/json

### Kiến Trúc Request Flow
```
Browser (HTML Form)
    ↓
JavaScript (convertToSpeech())
    ↓
Fetch API (/api/tts/convert)
    ↓
Express Server
    ↓
Axios (Viettel API)
    ↓
Viettel AI Server
    ↓
MP3 Audio Stream
    ↓
Browser Audio Player
```

## 🔒 Bảo Mật

### Environment Variables
```
VIETTEL_TTS_TOKEN=...  # Trong .env (không commit)
```

### Best Practices
- ✅ Kiểm tra độ dài văn bản (max 300 ký tự)
- ✅ Validate voice code
- ✅ Xử lý error properly
- ✅ Giới hạn rate requests (server-side)
- ✅ Không log token

## 🚨 Xử Lý Lỗi

### Lỗi Phổ Biến & Giải Pháp

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| Token không hợp lệ | Token sai/hết hạn | Check file .env |
| Văn bản quá dài | > 300 ký tự | Cắt ngắn văn bản |
| Giọng không tồn tại | Voice code sai | Chọn giọng từ dropdown |
| Không thể kết nối | API down | Thử lại sau |
| Timeout | Mạng chậm | Kiểm tra connection |

## 📊 Hiệu Suất

- **Thời gian xử lý:** 1-10 giây (tùy độ dài văn bản)
- **Kích thước file:** Tùy độ dài & tốc độ (thường 10-50 KB)
- **Định dạng:** MP3 (128 kbps)

## 🎨 UI/UX Improvements

### Phần Frontend
- Responsive design (grid 2 cột trên desktop, 1 cột trên mobile)
- Real-time character counter
- Status messages (loading, success, error)
- Integrated audio player
- Copy button from source content

### User Experience
- Voice selection theo miền địa lý
- Speed presets dễ hiểu
- Button states (enabled/disabled)
- Visual feedback (spinner, status colors)
- Error messages rõ ràng

## 📦 Dependencies

Không cần thêm package mới:
- `axios` - Đã có (cho HTTP requests)
- `express` - Đã có (cho backend)
- `dotenv` - Đã có (cho environment variables)

## 🔄 Workflow Hoàn Chỉnh

```
1. Scrape URL (Kênh14/Saostar)
   ↓
2. Lấy nội dung bài viết
   ↓
3. Tóm tắt bằng Gemini AI (optional)
   ↓
4. Copy nội dung vào TTS box
   ↓
5. Chọn giọng & tốc độ
   ↓
6. Chuyển thành âm thanh
   ↓
7. Nghe thử & Tải về MP3
```

## 📚 Tài Liệu Liên Quan

- `VIETTEL_TTS_SETUP.md` - Hướng dẫn cấu hình chi tiết
- `README.md` - Tài liệu chính của project
- `public/index.html` - Mã HTML/CSS/JavaScript

## 💡 Tips & Tricks

1. **Kết hợp với Scraper:**
   - Scrape bài viết
   - Tóm tắt bằng Gemini
   - Chuyển tóm tắt thành âm thanh
   - Tải về để dùng trong video/podcast

2. **Tùy Chỉnh Cho Nhu Cầu:**
   - Bài viết tin tức: Giọng nữ, tốc độ bình thường
   - Quảng cáo: Giọng nam, tốc độ vừa chậm
   - Podcast: Giọng nữ, tốc độ chậm

3. **Tối Ưu Hóa Chất Lượng:**
   - Tách thành câu ngắn
   - Dùng dấu câu đúng
   - Tránh từ viết tắt

## 🐛 Debugging

### Check Logs
```bash
# Terminal nơi chạy server
# Tìm dòng: "🎤 TTS Request..."
# Hoặc: "✅ TTS conversion successful"
# Hoặc: "TTS Error..."
```

### Browser Console
```javascript
// F12 → Console
// Tìm fetch requests
// Check network tab
```

## 📞 Support

- Viettel AI: https://viettelai.vn/lien-he
- Email: viettelai@viettel.com.vn
- Hotline: +84 98 1900 911

---

**Phiên bản:** 1.0  
**Cập nhật:** May 2026  
**Status:** ✅ Production Ready
