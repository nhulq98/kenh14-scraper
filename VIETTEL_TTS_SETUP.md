# 🎙️ Hướng Dẫn Cấu Hình Viettel Text-to-Speech (TTS)

## 📋 Yêu Cầu

Để sử dụng tính năng Text-to-Speech tích hợp Viettel AI, bạn cần:

1. **Đăng ký tài khoản Viettel AI**
2. **Lấy API Token từ Viettel**
3. **Cấu hình token vào file `.env`**

## 🚀 Các Bước Cấu Hình

### Bước 1: Đăng Ký Tài Khoản Viettel AI

1. Truy cập: https://viettelai.vn/
2. Nhấn nút **"Sign up"** hoặc **"Đăng ký"**
3. Điền thông tin đăng ký:
   - Email
   - Mật khẩu
   - Xác nhận mật khẩu
4. Xác nhận email
5. Đăng nhập vào tài khoản của bạn

### Bước 2: Truy Cập API Dashboard

1. Đăng nhập vào: https://viettelai.vn/
2. Tìm mục **"API"**, **"Developer"**, hoặc **"Dashboard"**
3. Tìm section **"Text-to-Speech (TTS)"** hoặc **"API Keys"**
4. Tạo hoặc sao chép **API Token**

### Bước 3: Cấu Hình Token

1. Tạo file `.env` trong thư mục gốc của project (nếu chưa có):

```bash
cp .env.example .env
```

2. Thêm hoặc cập nhật dòng sau trong file `.env`:

```env
VIETTEL_TTS_TOKEN=your_token_here
```

Thay `your_token_here` bằng token thực tế của bạn từ Viettel AI.

### Bước 4: Khởi Động Server

```bash
npm start
```

Hoặc nếu sử dụng development mode:

```bash
npm run dev
```

## 🧪 Kiểm Tra Cấu Hình

Để kiểm tra xem TTS đã hoạt động:

1. Mở trình duyệt: http://localhost:3000
2. Cuộn xuống mục **"Viettel Text-to-Speech"**
3. Nhập văn bản tiếng Việt (tối đa 300 ký tự)
4. Chọn giọng đọc (ví dụ: "Diễm My - Nữ - Miền Nam")
5. Chọn tốc độ đọc
6. Nhấn nút **"Chuyển Thành Âm Thanh"**
7. Nếu thành công, bạn sẽ thấy trình phát âm thanh với nút "Nghe Thử" và "Tải Về"

## ⚙️ Chi Tiết Tham Số TTS

### Danh Sách Giọng Đọc Có Sẵn

**Miền Bắc:**
- `hn-quynhanh` - Quỳnh Anh (Nữ)
- `hn-phuongtrang` - Phương Trang (Nữ)
- `hn-thaochi` - Thảo Chi (Nữ)
- `hn-thanhha` - Thanh Hà (Nữ)
- `hn-thanhphuong` - Thanh Phương (Nữ)
- `hn-thanhtung` - Thanh Tùng (Nam)
- `hn-namkhanh` - Nam Khánh (Nam)
- `hn-tienquan` - Tiến Quân (Nam)

**Miền Trung:**
- `hue-maingoc` - Mai Ngọc (Nữ)
- `hue-baoquoc` - Bảo Quốc (Nam)

**Miền Nam:**
- `hcm-diemmy` - Diễm My (Nữ)
- `hcm-phuongly` - Phương Ly (Nữ)
- `hcm-thuydung` - Thủy Dung (Nữ)
- `hcm-thuyduyen` - Thủy Duyên (Nữ)
- `hcm-leyen` - Lệ Yên (Nữ)
- `hcm-minhquan` - Minh Quân (Nam)

### Tốc Độ Đọc

- `0.8` - Chậm
- `0.9` - Vừa Chậm
- `1.0` - Bình Thường (Mặc định)
- `1.1` - Vừa Nhanh
- `1.2` - Nhanh

### Giới Hạn

- **Độ dài văn bản:** Tối đa 300 ký tự
- **Định dạng đầu ra:** MP3
- **Tỉ lệ yêu cầu:** Phụ thuộc vào gói dịch vụ của bạn trên Viettel AI

## 🔐 Bảo Mật

⚠️ **QUAN TRỌNG:**

- **KHÔNG** commit file `.env` vào git repository
- **KHÔNG** public token của bạn
- Giữ token an toàn như mật khẩu
- Nếu token bị lộ, hãy tạo token mới trên Viettel AI

## 🆘 Gỡi Lỗi

### Lỗi: "Token không hợp lệ"

- Kiểm tra lại token trong file `.env`
- Đảm bảo token không có khoảng trắng đầu/cuối
- Kiểm tra token còn hoạt động trên https://viettelai.vn

### Lỗi: "Không thể kết nối tới Viettel AI"

- Kiểm tra kết nối internet
- Kiểm tra xem Viettel AI API có hoạt động
- Thử lại sau vài phút

### Lỗi: "Văn bản không hợp lệ"

- Đảm bảo văn bản có chứa ký tự tiếng Việt
- Kiểm tra độ dài (tối đa 300 ký tự)
- Thử với văn bản đơn giản hơn

### Lỗi: "Giọng đọc không được hỗ trợ"

- Chọn một trong các giọng được liệt kê ở trên
- Kiểm tra mã giọng đọc chính xác

## 📊 API Response Codes

| Code | Ý Nghĩa |
|------|----------|
| 200 | Thành công |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Token không hợp lệ |
| 403 | Không có quyền truy cập |
| 500 | Lỗi máy chủ |

## 📚 Tài Liệu Thêm

- Trang chính Viettel AI: https://viettelai.vn/
- Tài liệu TTS: https://viettelai.vn/en/tai-lieu
- Trang TTS demo: https://viettelai.vn/en/chuyen-giong-noi

## 💡 Mẹo Sử Dụng

1. **Copy từ nội dung gốc:** Nếu bạn đã scrape bài viết, nhấn nút "Copy từ Nội Dung Gốc" để tự động copy 300 ký tự đầu tiên
2. **Nghe thử trước khi tải:** Luôn nghe thử âm thanh trước khi tải về
3. **Chọn giọng phù hợp:** Thử các giọng khác nhau để tìm giọng phù hợp nhất
4. **Điều chỉnh tốc độ:** Nếu văn bản phức tạp, hãy chọn tốc độ chậm hơn

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. Kiểm tra logs: Mở terminal nơi server đang chạy
2. Kiểm tra console browser: Mở DevTools (F12) -> Console
3. Liên hệ Viettel AI: https://viettelai.vn/lien-he
   - Email: viettelai@viettel.com.vn
   - Hotline: +84 98 1900 911

---

**Chúc bạn sử dụng dịch vụ Text-to-Speech thành công! 🎉**
