# Hướng dẫn tạo Admin User

## Cách 1: Sử dụng script (Khuyến nghị)

1. **Tạo file `.env` trong thư mục `backend`** (nếu chưa có):
```env
MONGODB_URI=mongodb://localhost:27017/location-management
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin
```

2. **Chạy script:**
```bash
cd backend
npm run create-admin
```

3. **Kết quả:**
- Email: `admin@example.com`
- Password: `admin123`
- Name: `Admin`

⚠️ **Lưu ý:** Đổi mật khẩu sau lần đăng nhập đầu tiên!

## Cách 2: Tạo thủ công qua API

1. **Khởi động server:**
```bash
cd backend
npm run dev
```

2. **Đăng ký tài khoản admin:**
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123",
  "name": "Admin",
  "role": "admin"
}
```

3. **Hoặc đăng ký user thường rồi update role thành admin qua API Admin**

## Cách 3: Tạo trực tiếp trong MongoDB

1. **Kết nối MongoDB:**
```bash
mongosh mongodb://localhost:27017/location-management
```

2. **Tạo admin:**
```javascript
// Hash password "admin123" với bcrypt
// Password hash: $2a$10$... (cần hash trước)

db.users.insertOne({
  email: "admin@example.com",
  password: "$2a$10$HASHED_PASSWORD_HERE", // Cần hash password trước
  name: "Admin",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Lý do tại sao ban đầu vào đã login?

**Vấn đề:** Khi mở trang web, bạn thấy đã đăng nhập sẵn.

**Nguyên nhân:**
1. **LocalStorage vẫn còn token:** Browser đã lưu token từ lần đăng nhập trước
2. **Token chưa hết hạn:** Token JWT có thời hạn 7 ngày, nên vẫn còn hiệu lực
3. **Không có logic kiểm tra token hợp lệ:** Frontend chỉ kiểm tra có token hay không, không kiểm tra token có hợp lệ

**Giải pháp:**

1. **Xóa localStorage (Tạm thời):**
   - Mở DevTools (F12)
   - Vào tab Application/Storage
   - Xóa Local Storage
   - Hoặc chạy trong console: `localStorage.clear()`

2. **Thêm logic kiểm tra token (Tốt hơn):**
   - Thêm API endpoint để verify token
   - Kiểm tra token khi app khởi động
   - Tự động logout nếu token không hợp lệ

3. **Giảm thời gian token (Tùy chọn):**
   - Thay đổi `expiresIn: '7d'` thành `'1h'` hoặc `'24h'` trong backend

## Xóa localStorage để logout

Trong browser console:
```javascript
localStorage.clear()
location.reload()
```

Hoặc thêm nút Logout trong giao diện (đã có sẵn).



