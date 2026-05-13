# 🔐 Login Feature - Hướng Dẫn Sử Dụng

## 📋 Mô Tả Tính Năng

Tôi đã tạo chức năng login hoàn chỉnh cho website theo cấu trúc MVC. Người dùng phải đăng nhập trước khi truy cập vào trang chính.

## 🛡️ Tính Năng Bảo Mật

### Rate Limiting (Giới Hạn Đăng Nhập)

Hệ thống tự động bảo vệ tài khoản khỏi brute force attack:

- **Tối đa 5 lần sai**: Mỗi IP chỉ được sai tối đa 5 lần
- **Khóa tài khoản**: Nếu sai quá 5 lần, IP sẽ bị khóa
- **Thời gian khóa tăng dần**: 
  - Lần vi phạm 1: Khóa 5 phút
  - Lần vi phạm 2: Khóa 10 phút
  - Lần vi phạm 3: Khóa 15 phút
  - ... (tăng 5 phút mỗi lần)

**Ví dụ:**
- Đăng nhập sai lần 1: Hiển thị "Sai thông tin (Còn 4 lần thử)"
- Đăng nhập sai lần 2: Hiển thị "Sai thông tin (Còn 3 lần thử)"
- ...
- Đăng nhập sai lần 6: Khóa 5 phút → "Tài khoản bị khóa trong 5 phút"
- Đăng nhập sai lần 11 (sau 5p): Khóa 10 phút → "Tài khoản bị khóa trong 10 phút"

## 🏗️ Cấu Trúc Thư Mục

```
project/
├── .env                                    # Biến môi trường (AUTH_USERNAME, AUTH_PASSWORD)
│
├── src/
│   ├── models/
│   │   └── user.model.js                  # User Model - Logic dữ liệu
│   │
│   ├── views/
│   │   └── auth/
│   │       ├── html/
│   │       │   └── login.html             # Giao diện trang login (không có demo credentials)
│   │       ├── css/
│   │       │   └── login.css              # Style trang login
│   │       └── js/
│   │           └── login.js               # Frontend controller & localStorage
│   │
│   ├── controllers/
│   │   └── auth.controller.js             # Bridge - Nhận event & gọi service
│   │
│   └── services/
│       ├── auth.service.js                # Tầng xác thực & kiểm tra credentials
│       └── rate-limit.service.js          # 🆕 Rate limiting theo IP
│
├── cache/
│   ├── trending.cache.json
│   └── rate_limit.json                    # 🆕 Lưu trữ attempt count theo IP
│
├── public/
│   └── index.html                         # Trang chính (có kiểm tra auth)
│
└── server.js                              # Backend server (có route auth + rate limit)
```

## 🔑 Thông Tin Đăng Nhập Mặc Định

```
Username: admin
Password: cucvang2003
```

## 🚀 Cách Hoạt Động

### 1️⃣ Luồng Đăng Nhập

```
User truy cập website
    ↓
Check localStorage - Nếu đã login → Hiển thị trang chính
           ↓ (Nếu chưa login)
Redirect đến /login
    ↓
Hiển thị form đăng nhập
    ↓
User nhập username & password
    ↓
Submit form → Gửi POST /api/auth/login
    ↓
Backend kiểm tra credentials
    ↓ (Nếu đúng)
Response success → Save vào localStorage
    ↓
Redirect về trang chính ("/")
    ↓
Hiển thị trang chính + User info & Logout button

           ↓ (Nếu sai)
Response error
    ↓
Hiển thị message: "Sai thông tin đăng nhập, xin vui lòng kiểm tra lại"
```

### 2️⃣ Các Thành Phần Chính

#### 📝 **User Model** (`src/models/user.model.js`)
- Lưu thông tin user (username, password, isAuthenticated)
- Phương thức `validate()` - Kiểm tra thông tin đăng nhập
- Phương thức `serialize()` - Chuyển thành JSON để lưu localStorage

#### 🔐 **Auth Service** (`src/services/auth.service.js`)
- Xử lý logic xác thực
- `login(username, password)` - Kiểm tra credentials
- `logout()` - Logout user
- `isAuthenticated()` - Kiểm tra trạng thái
- `getCurrentUser()` - Lấy thông tin user hiện tại

#### 🎮 **Auth Controller** (`src/controllers/auth.controller.js`)
- Bộ điều hướng: Nhận sự kiện từ View → Gọi Service → Trả kết quả
- Xử lý session restore từ localStorage

#### 🖥️ **Login Views** (`src/views/auth/`)
- **HTML** (`login.html`):
  - Form đăng nhập với input username & password
  - Nút toggle hiển thị/ẩn mật khẩu (👁️)
  - Error message & validation
  - Demo credentials info

- **CSS** (`login.css`):
  - Responsive design (mobile, tablet, desktop)
  - Gradient background & animation
  - Modern UI với smooth transitions
  - Loading state cho button

- **JavaScript** (`login.js`):
  - `LoginViewController` class - Quản lý UI
  - Handle form submission
  - Toggle password visibility
  - Validate form inputs
  - Save/restore session từ localStorage
  - `isAuthenticated()` - Kiểm tra đã login
  - `getCurrentUser()` - Lấy thông tin user
  - `logout()` - Logout & redirect

### 3️⃣ API Routes

| Method | Endpoint | Chức Năng |
|--------|----------|----------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/check` | Kiểm tra auth status |
| GET | `/login` | Trang form đăng nhập |
| GET | `/auth/css/login.css` | CSS của trang login |
| GET | `/auth/js/login.js` | JS của trang login |

### 4️⃣ localStorage Data

Khi login thành công, dữ liệu được lưu vào localStorage với key `auth_user`:

```json
{
    "username": "admin",
    "isAuthenticated": true,
    "loginTime": "2024-05-13T10:30:00.000Z"
}
```

## 🎯 Các Tính Năng

✅ **Form Validation**
- Kiểm tra username & password rỗng
- Kiểm tra độ dài tối thiểu
- Real-time error clearing

✅ **Password Visibility Toggle**
- Nút 👁️ để hiển thị/ẩn mật khẩu
- Icon thay đổi theo trạng thái

✅ **Error Handling**
- Hiển thị error message nếu sai credentials
- Validation error cho từng field
- Network error handling

✅ **Loading State**
- Button loading spinner khi submit
- Disable button trong lúc processing
- Prevent double-submit

✅ **Session Persistence**
- Lưu session vào localStorage
- Một lần login sài mãi mãi (đến khi logout)
- Auto-redirect nếu đã login
- Restore session khi refresh page

✅ **Logout**
- Xóa localStorage
- Redirect về trang login
- Confirm dialog trước logout

✅ **User Info Display**
- Hiển thị username ở góc phải trên
- Button logout dễ truy cập
- Responsive trên mobile

## 🧪 Cách Test

### 1. Khởi động Server

```bash
npm install  # Cài dependencies nếu chưa
npm start    # Hoặc: node server.js
```

Server sẽ chạy ở: `http://localhost:3000`

### 2. Test Login Flow

1. **Test Login Sai:**
   - Truy cập: `http://localhost:3000`
   - Sẽ redirect đến: `http://localhost:3000/login`
   - Nhập sai username/password
   - Nhấn "Đăng Nhập"
   - ❌ Sẽ hiển thị error: "Sai thông tin đăng nhập, xin vui lòng kiểm tra lại"

2. **Test Login Đúng:**
   - Nhập: username = `admin`, password = `cucvang2003`
   - Nhấn "Đăng Nhập"
   - ✅ Sẽ redirect về trang chính (`/`)
   - Thấy username "admin" ở góc phải trên
   - Button "Đăng Xuất" khả dụng

3. **Test Logout:**
   - Nhấn button "Đăng Xuất"
   - Confirm dialog hiện lên
   - Nhấn OK
   - ✅ Redirect về trang login
   - localStorage bị xóa

4. **Test Session Persistence:**
   - Login thành công
   - Refresh page (F5)
   - ✅ Vẫn ở trang chính, không bị redirect đến login
   - Username vẫn hiển thị

5. **Test Password Toggle:**
   - Ở trang login
   - Click nút 👁️
   - ✅ Password field thay đổi từ `*` sang hiển thị text
   - Icon thay đổi thành 🙈

6. **Test Responsive:**
   - Thu nhỏ browser window
   - ✅ Layout tự động adjust
   - User info ở mobile sẽ hiển thị ở dưới

## 📝 Các File Được Cập Nhật

1. **`.env`** - Thêm AUTH_USERNAME & AUTH_PASSWORD
2. **`server.js`** - Thêm auth routes
3. **`public/index.html`** - Thêm auth check script & user info
4. **`src/**`** - Các file MVC model, view, controller, service

## ⚙️ Cách Thay Đổi Credentials

Mở file `.env` và sửa:

```env
AUTH_USERNAME=username_mới
AUTH_PASSWORD=password_mới
```

Sau đó restart server:
```bash
npm start
```

## 🔐 Security Notes

> ⚠️ **Lưu Ý:** Đây là demo với hardcoded credentials. Trong production:
> - Sử dụng database thực
> - Hash password với bcrypt
> - Dùng JWT tokens
> - HTTPS only
> - Secure cookies

## 🎨 Customization

### Thay đổi màu sắc login page
- Mở `src/views/auth/css/login.css`
- Sửa giá trị color variables:
```css
--primary: #FF4655;     /* Màu chính (đỏ)*/
--accent: #00d4ff;      /* Màu accent (xanh) */
```

### Thay đổi text/message
- Mở `src/views/auth/html/login.html`
- Sửa text trong form

### Thêm validation rules
- Mở `src/views/auth/js/login.js`
- Sửa phương thức `validateForm()`

## 📞 Support

Nếu có vấn đề:
1. Kiểm tra browser console (F12) xem có error không
2. Kiểm tra server logs
3. Kiểm tra network tab xem API response
4. Kiểm tra localStorage: DevTools → Application → LocalStorage

---

**Status:** ✅ Login feature hoàn thành & sẵn sàng test

**Ngày tạo:** 13/05/2024
