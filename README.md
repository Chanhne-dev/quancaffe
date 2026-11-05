# HỆ THỐNG QUẢN LÝ QUÁN CÀ PHÊ TOÀN DIỆN (F&B POS & KDS SYSTEM)

Hệ thống Quản lý Quán Cà phê (F&B POS) đa nền tảng hoàn chỉnh, đạt chuẩn kiến trúc doanh nghiệp, từ **Cơ sở dữ liệu (23 bảng chuẩn)**, **Backend API & Real-time WebSocket Hub**, **Logic nghiệp vụ tự động hóa** đến **Giao diện người dùng Web POS & KDS cảm ứng**.

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

```
                            ┌───────────────────────────────────┐
                            │    Client SPA (Touch Web POS)     │
                            │   (Cashier / Waiter / Manager)    │
                            └─────────────────┬─────────────────┘
                                              │ HTTP / WebSocket
                                              ▼
┌─────────────────────────┐         ┌───────────────────┐         ┌─────────────────────────┐
│ Barista KDS Screen      │◄───────►│  Express & WS Hub │◄───────►│ IndexedDB Offline Cache │
│ (Real-time Kitchen Hub) │         │ (Transaction-safe)│         │ (Service Worker Worker) │
└─────────────────────────┘         └─────────┬─────────┘         └─────────────────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │   MS SQL Server   │   │    PostgreSQL     │   │  SQLite Embedded  │
            │  (mssql_schema)   │   │ (postgres_schema) │   │   (Live Engine)   │
            └───────────────────┘   └───────────────────┘   └───────────────────┘
```

* **Backend Engine:** Node.js 24 + Express + TypeScript + `node:sqlite` (DatabaseSync engine không phụ thuộc native compile, transaction-safe ACID) + WebSocket Server.
* **Database Scripts:**
  * [mssql_schema.sql](file:///d:/300%20bai%20code%20thi%E1%BA%BFu%20nhi/quancaffe/database/mssql_schema.sql): Script DDL chuẩn cho Microsoft SQL Server với đầy đủ PK, FK, Constraints, Indexes và Stored Procedure `sp_BaoCaoLaiLo`.
  * [postgres_schema.sql](file:///d:/300%20bai%20code%20thi%E1%BA%BFu%20nhi/quancaffe/database/postgres_schema.sql): Script DDL chuẩn cho PostgreSQL 14+.
  * [Entities.cs](file:///d:/300%20bai%20code%20thi%E1%BA%BFu%20nhi/quancaffe/database/ef_core/Entities.cs): 23 C# Entity Classes & DbContext (.NET 8 Clean Architecture EF Core).
  * [seed_data.sql](file:///d:/300%20bai%20code%20thi%E1%BA%BFu%20nhi/quancaffe/database/seed_data.sql): Dữ liệu mẫu thực tế cho quán cà phê Việt Nam.
* **Frontend Web App:** HTML5 Single Page Application hiện đại với Tailwind CSS, Lucide Icons, kết nối Real-time WebSocket, hỗ trợ cảm ứng trên tablet/POS, chế độ ngoại tuyến PWA IndexedDB, mô phỏng in hóa đơn nhiệt ESC/POS và hiệu ứng bung mở két tiền tự động.

---

## 2. PHÂN HỆ 23 BẢNG CƠ SỞ DỮ LIỆU CỐT LÕI

### a. Danh mục chung & Nhân sự:
1. `DON_VI_BO_PHAN`: Quản lý các phòng ban (Quản lý, Pha chế, Thu ngân, Phục vụ, Kho).
2. `CHUC_VU`: Chức danh và hệ số lương.
3. `NHAN_VIEN`: Thông tin hồ sơ nhân sự, trạng thái làm việc.
4. `TAI_KHOAN`: Tài khoản đăng nhập hệ thống, mật khẩu hash, phân quyền RBAC 5 vai trò.
5. `CA_LAM_VIEC`: Định nghĩa khung giờ ca (Ca sáng, Ca chiều) và tiền công theo ca.
6. `BANG_KE_GIAO_CA`: Theo dõi tiền đầu ca, doanh thu tiền mặt, chuyển khoản, tiền mặt thực đếm và chênh lệch két.
7. `BANG_THANH_TOAN_LUONG`: Bảng lương hàng tháng (Lương cơ bản + Thưởng - Phạt = Thực lĩnh).

### b. Quản lý Bàn, Thực đơn & Công thức:
8. `KHU_VUC`: Phân tầng không gian (Tầng 1, Tầng 2, Sân vườn ngoài trời).
9. `BAN`: Quản lý trạng thái bàn (`Trong`, `CoKhach`, `DatTruoc`), số ghế.
10. `NHOM_MON`: Phân loại danh mục (Cà phê, Trà trái cây, Đá xay, Bánh ngọt).
11. `DANH_MUC_MON`: Thực đơn món, đơn giá bán, đơn vị tính, trạng thái kinh doanh.
12. `CONG_THUC_MON`: Định mức chi tiết từng nguyên liệu cấu thành nên 1 ly đồ uống.

### c. Giao dịch Bán hàng (Order & Billing):
13. `KHACH_HANG`: Hồ sơ khách hàng, số điện thoại, điểm tích lũy, phân hạng (`Member`, `Silver`, `Gold`, `VIP`).
14. `HOA_DON_BAN_HANG`: Hóa đơn bán hàng tổng, kênh bán (`TaiBan`, `MangDi`, `GiaoHang`), trạng thái (`ChoThanhToan`, `DaThanhToan`, `DaHuy`), phương thức (`TienMat`, `QR`, `The`).
15. `CHI_TIET_HOA_DON`: Chi tiết từng món trong hóa đơn, số lượng, ghi chú topping/đường/đá, trạng thái pha chế (`ChoLam`, `DangLam`, `HoanThanh`).
16. `YEU_CAU_HUY_DOI_MON`: Quy trình duyệt hủy/đổi món cần chữ ký Quản lý.

### d. Quản lý Kho, Nguyên vật liệu & Thu Chi:
17. `NHA_CUNG_CAP`: Danh bạ đối tác cung ứng và công nợ hiện tại.
18. `VAT_TU_NGUYEN_LIEU`: Kho nguyên liệu (Robusta, Arabica, sữa đặc, đường...), số lượng tồn hiện tại, ngưỡng báo động tối thiểu, đơn giá bình quân.
19. `PHIEU_NHAP_KHO`: Phiếu nhập kho nguyên vật liệu từ nhà cung cấp.
20. `CHI_TIET_PHIEU_NHAP`: Danh sách chi tiết các mặt hàng nhập kho.
21. `PHIEU_HUY_HAO_HUT`: Ghi nhận sự cố hư hỏng, hết hạn, hao hụt kho.
22. `CHI_TIET_HUY_HAO_HUT`: Định lượng và giá trị hao hụt.
23. `SO_QUY_THU_CHI`: Sổ quỹ tiền mặt/ngân hàng theo dõi dòng tiền (Thu / Chi) phục vụ báo cáo P&L.

---

## 3. LOGIC NGHIỆP VỤ BẮT BUỘC ĐÃ HOÀN THIỆN

### 1. Thuật toán Trừ Tồn Kho Tự Động (Recipe Auto-Deduction)
* Khi hóa đơn chuyển sang `DaThanhToan`:
  $$\text{Lượng trừ} = \text{SoLuongDinhMuc} \times \text{CHI\_TIET\_HOA\_DON.SoLuong}$$
* Toàn bộ thao tác thực thi trong 1 **ACID Transaction** an toàn tuyệt đối.
* Nếu tồn kho sau trừ $\le$ `MucToiThieuCanCanhBao`, hệ thống lập tức phát sinh cảnh báo `Low Stock Warning` qua WebSocket tới màn hình Quản lý và Thu ngân.

### 2. Màn hình Bếp / Pha Chế Real-time (Kitchen Display System - KDS)
* Thu ngân tạo order hoặc bấm "Gửi Bếp" $\rightarrow$ WebSocket đẩy vé xuống KDS của Barista kèm âm thanh chuông báo (Web Audio chime).
* Barista chạm chuyển đổi tiến trình: `ChoLam` $\rightarrow$ `DangLam` $\rightarrow$ `HoanThanh`.
* Khi tất cả các món trong order hoàn tất, KDS phát thông báo `KDS_ORDER_COMPLETED` để phục vụ lấy đồ trả khách.
* Nút "Tra Cứu Công Thức" cho phép Barista xem nhanh định lượng gram/ml chuẩn.

### 3. Chốt Ca & Bàn Giao Két Tiền (Cash Drawer Balancing)
* Kết thúc ca, hệ thống tính toán:
  $$\text{TienMatLyThuyet} = \text{TienDauCa} + \text{DoanhThuTienMat}$$
* Thu ngân kiểm đếm và nhập `TienMatThucTeTrongKet`.
* Hệ thống tính:
  $$\text{ChenhLechThuaThieu} = \text{TienMatThucTeTrongKet} - \text{TienMatLyThuyet}$$
* Khóa dữ liệu và ghi nhận trạng thái ca làm việc.

### 4. Báo Cáo Lãi - Lỗ (Profit & Loss - P&L Statement)
* **Doanh thu bán hàng** (từ `HOA_DON_BAN_HANG` đã thanh toán).
* **Giá vốn hàng bán (COGS)**: Tính chính xác theo định mức công thức nhân với đơn giá bình quân từng nguyên liệu tiêu hao.
* **Lợi nhuận gộp (Gross Profit)** = Doanh thu bán hàng - Giá vốn hàng bán (COGS).
* **Chi phí hoạt động (OPEX)** = Chi phí vận hành (điện, nước, mặt bằng từ `SO_QUY_THU_CHI`) + Chi phí lương nhân viên (`BANG_THANH_TOAN_LUONG`) + Hao hụt kho (`PHIEU_HUY_HAO_HUT`).
* **Lợi nhuận ròng (Net Profit)** = Lợi nhuận gộp + Thu khác - Chi phí hoạt động.

### 5. Chế độ Ngoại Tuyến (Offline Mode)
* Sử dụng Service Worker (`sw.js`) để cache app shell.
* Lưu trữ đơn hàng ngoại tuyến trên trình duyệt bằng **IndexedDB**.
* Khi kết nối Internet phục hồi, hệ thống kích hoạt worker Reconciliation gửi batch đơn hàng lên `/api/orders/reconciliation` để đồng bộ và trừ kho tự động.

### 6. Tích hợp Ngoại Vi & ESC/POS
* Cung cấp hàm sinh mã nhị phân ESC/POS chuẩn cho máy in nhiệt 80mm (`CMD_INIT = 1B 40`, `CMD_CUT = 1D 56 42 00`).
* Phát xung điện mở két tự động (`1B 70 00 19 FA`) kèm hiệu ứng đồ họa ngăn kéo trượt mở trên giao diện.

---

## 4. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### Khởi chạy Backend & Web UI:
```powershell
# Chạy server với npx tsx
npx tsx server/src/server.ts
```

### Truy cập hệ thống:
* **Giao diện Web POS & KDS:** [http://localhost:3001](http://localhost:3001)
* **WebSocket Real-time Hub:** `ws://localhost:3001/ws`
* **Kiểm tra sức khỏe hệ thống (Health Check):** [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Tài khoản & Vai trò thử nghiệm (Mật khẩu: `123456`):
1. **Chủ quán (Owner):** Tài khoản `owner` (Quyền cao nhất, xem toàn bộ P&L và cấu hình).
2. **Quản lý (Manager):** Tài khoản `manager` (Quản lý kho, duyệt ca, chi phí).
3. **Thu ngân (Cashier):** Tài khoản `cashier` (Bán hàng POS, đóng/chốt ca, in hóa đơn).
4. **Pha chế (Barista):** Tài khoản `barista` (Màn hình KDS, tra cứu công thức).
5. **Phục vụ (Waiter):** Tài khoản `waiter` (Mở bàn, chọn món, gửi order).
