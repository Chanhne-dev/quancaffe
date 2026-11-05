import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.resolve(process.cwd(), 'server', 'quancafe.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Kích hoạt Foreign Keys trong SQLite
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  // Tạo 23 bảng chuẩn
  db.exec(`
    -- 1. DON_VI_BO_PHAN
    CREATE TABLE IF NOT EXISTS DON_VI_BO_PHAN (
      MaBoPhan TEXT PRIMARY KEY,
      TenBoPhan TEXT NOT NULL
    );

    -- 2. CHUC_VU
    CREATE TABLE IF NOT EXISTS CHUC_VU (
      MaChucVu TEXT PRIMARY KEY,
      TenChucVu TEXT NOT NULL,
      HeSoLuong REAL NOT NULL DEFAULT 1.00
    );

    -- 3. NHAN_VIEN
    CREATE TABLE IF NOT EXISTS NHAN_VIEN (
      MaNhanVien TEXT PRIMARY KEY,
      HoTen TEXT NOT NULL,
      NgaySinh TEXT,
      SoDienThoai TEXT NOT NULL,
      MaChucVu TEXT NOT NULL,
      MaBoPhan TEXT NOT NULL,
      TrangThaiLamViec TEXT NOT NULL DEFAULT 'DangLamViec',
      NgayTao TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (MaChucVu) REFERENCES CHUC_VU(MaChucVu),
      FOREIGN KEY (MaBoPhan) REFERENCES DON_VI_BO_PHAN(MaBoPhan)
    );

    -- 4. TAI_KHOAN (5 VAI TRÒ RBAC)
    CREATE TABLE IF NOT EXISTS TAI_KHOAN (
      MaTaiKhoan TEXT PRIMARY KEY,
      MaNhanVien TEXT NOT NULL,
      TenDangNhap TEXT UNIQUE NOT NULL,
      MatKhauHash TEXT NOT NULL,
      VaiTro TEXT NOT NULL CHECK (VaiTro IN ('ChuQuan', 'QuanLy', 'ThuNgan', 'PhaChe', 'PhucVu')),
      KichHoat INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien) ON DELETE CASCADE
    );

    -- 5. CA_LAM_VIEC
    CREATE TABLE IF NOT EXISTS CA_LAM_VIEC (
      MaCa TEXT PRIMARY KEY,
      TenCa TEXT NOT NULL,
      GioBatDau TEXT NOT NULL,
      GioKetThuc TEXT NOT NULL,
      TienCongTheoCa REAL NOT NULL DEFAULT 0
    );

    -- 6. BANG_KE_GIAO_CA
    CREATE TABLE IF NOT EXISTS BANG_KE_GIAO_CA (
      MaGiaoCa TEXT PRIMARY KEY,
      MaCa TEXT NOT NULL,
      MaNhanVien TEXT NOT NULL,
      NgayLamViec TEXT NOT NULL,
      ThoiGianMoCa TEXT NOT NULL DEFAULT (datetime('now')),
      ThoiGianDongCa TEXT,
      TienDauCa REAL NOT NULL DEFAULT 0,
      DoanhThuTienMat REAL NOT NULL DEFAULT 0,
      DoanhThuChuyenKhoan REAL NOT NULL DEFAULT 0,
      TienMatThucTeTrongKet REAL NOT NULL DEFAULT 0,
      ChenhLechThuaThieu REAL NOT NULL DEFAULT 0,
      TrangThai TEXT NOT NULL DEFAULT 'DangMo', -- DangMo, DaChot, DaXacNhan
      NguoiXacNhan TEXT,
      GhiChuGiaoCa TEXT,
      FOREIGN KEY (MaCa) REFERENCES CA_LAM_VIEC(MaCa),
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien),
      FOREIGN KEY (NguoiXacNhan) REFERENCES NHAN_VIEN(MaNhanVien)
    );

    -- 7. BANG_THANH_TOAN_LUONG
    CREATE TABLE IF NOT EXISTS BANG_THANH_TOAN_LUONG (
      MaBangLuong TEXT PRIMARY KEY,
      ThangNam TEXT NOT NULL,
      MaNhanVien TEXT NOT NULL,
      TongGioLam REAL NOT NULL DEFAULT 0,
      LuongCoBan REAL NOT NULL DEFAULT 0,
      Thuong REAL NOT NULL DEFAULT 0,
      Phat REAL NOT NULL DEFAULT 0,
      ThucLinh REAL NOT NULL DEFAULT 0,
      NgayTinhLuong TEXT NOT NULL DEFAULT (datetime('now')),
      TrangThai TEXT NOT NULL DEFAULT 'ChuaThanhToan',
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien)
    );

    -- 8. KHU_VUC
    CREATE TABLE IF NOT EXISTS KHU_VUC (
      MaKhuVuc TEXT PRIMARY KEY,
      TenKhuVuc TEXT NOT NULL
    );

    -- 9. BAN
    CREATE TABLE IF NOT EXISTS BAN (
      MaBan TEXT PRIMARY KEY,
      TenBan TEXT NOT NULL,
      MaKhuVuc TEXT NOT NULL,
      TrangThai TEXT NOT NULL DEFAULT 'Trong' CHECK (TrangThai IN ('Trong', 'CoKhach', 'DatTruoc')),
      SoGhe INTEGER NOT NULL DEFAULT 4,
      FOREIGN KEY (MaKhuVuc) REFERENCES KHU_VUC(MaKhuVuc)
    );

    -- 10. NHOM_MON
    CREATE TABLE IF NOT EXISTS NHOM_MON (
      MaNhom TEXT PRIMARY KEY,
      TenNhom TEXT NOT NULL,
      ThuTuHienThi INTEGER NOT NULL DEFAULT 0
    );

    -- 11. DANH_MUC_MON
    CREATE TABLE IF NOT EXISTS DANH_MUC_MON (
      MaMon TEXT PRIMARY KEY,
      TenMon TEXT NOT NULL,
      MaNhom TEXT NOT NULL,
      DonViTinh TEXT NOT NULL DEFAULT 'Ly',
      GiaBanHienHanh REAL NOT NULL,
      HinhAnh TEXT,
      DangKinhDoanh INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (MaNhom) REFERENCES NHOM_MON(MaNhom)
    );

    -- 17. NHA_CUNG_CAP
    CREATE TABLE IF NOT EXISTS NHA_CUNG_CAP (
      MaNCC TEXT PRIMARY KEY,
      TenNCC TEXT NOT NULL,
      SoDienThoai TEXT,
      DiaChi TEXT,
      CongNoHienTai REAL NOT NULL DEFAULT 0
    );

    -- 18. VAT_TU_NGUYEN_LIEU
    CREATE TABLE IF NOT EXISTS VAT_TU_NGUYEN_LIEU (
      MaVatTu TEXT PRIMARY KEY,
      TenVatTu TEXT NOT NULL,
      DonViTinh TEXT NOT NULL,
      SoLuongTonHienTai REAL NOT NULL DEFAULT 0,
      MucToiThieuCanCanhBao REAL NOT NULL DEFAULT 10,
      DonGiaBinhQuan REAL NOT NULL DEFAULT 0
    );

    -- 12. CONG_THUC_MON
    CREATE TABLE IF NOT EXISTS CONG_THUC_MON (
      MaCongThuc TEXT PRIMARY KEY,
      MaMon TEXT NOT NULL,
      MaVatTu TEXT NOT NULL,
      SoLuongDinhMuc REAL NOT NULL,
      DonViTinh TEXT NOT NULL,
      GhiChu TEXT,
      FOREIGN KEY (MaMon) REFERENCES DANH_MUC_MON(MaMon) ON DELETE CASCADE,
      FOREIGN KEY (MaVatTu) REFERENCES VAT_TU_NGUYEN_LIEU(MaVatTu)
    );

    -- 13. KHACH_HANG
    CREATE TABLE IF NOT EXISTS KHACH_HANG (
      MaKhachHang TEXT PRIMARY KEY,
      HoTen TEXT NOT NULL,
      SoDienThoai TEXT UNIQUE NOT NULL,
      DiemTichLuy INTEGER NOT NULL DEFAULT 0,
      HangThanhVien TEXT NOT NULL DEFAULT 'Member' CHECK (HangThanhVien IN ('Member', 'Silver', 'Gold', 'VIP')),
      NgayDangKy TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 14. HOA_DON_BAN_HANG
    CREATE TABLE IF NOT EXISTS HOA_DON_BAN_HANG (
      SoHoaDon TEXT PRIMARY KEY,
      NgayGioLap TEXT NOT NULL DEFAULT (datetime('now')),
      KenhDatHang TEXT NOT NULL DEFAULT 'TaiBan' CHECK (KenhDatHang IN ('TaiBan', 'MangDi', 'GiaoHang')),
      MaBan TEXT,
      MaNhanVien TEXT NOT NULL,
      MaKhachHang TEXT,
      TongTienMon REAL NOT NULL DEFAULT 0,
      GiamGia REAL NOT NULL DEFAULT 0,
      TienMatThucThu REAL NOT NULL DEFAULT 0,
      PhuongThucThanhToan TEXT NOT NULL DEFAULT 'TienMat',
      TrangThaiThanhToan TEXT NOT NULL DEFAULT 'ChoThanhToan' CHECK (TrangThaiThanhToan IN ('ChoThanhToan', 'DaThanhToan', 'DaHuy')),
      MaCa TEXT,
      GhiChu TEXT,
      OfflineId TEXT,
      DaDongBo INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (MaBan) REFERENCES BAN(MaBan),
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien),
      FOREIGN KEY (MaKhachHang) REFERENCES KHACH_HANG(MaKhachHang),
      FOREIGN KEY (MaCa) REFERENCES CA_LAM_VIEC(MaCa)
    );

    -- 15. CHI_TIET_HOA_DON
    CREATE TABLE IF NOT EXISTS CHI_TIET_HOA_DON (
      MaChiTiet INTEGER PRIMARY KEY AUTOINCREMENT,
      SoHoaDon TEXT NOT NULL,
      MaMon TEXT NOT NULL,
      SoLuong INTEGER NOT NULL DEFAULT 1,
      DonGia REAL NOT NULL,
      ThanhTien REAL NOT NULL,
      GhiChuTopping TEXT,
      TrangThaiPhaChe TEXT NOT NULL DEFAULT 'ChoLam' CHECK (TrangThaiPhaChe IN ('ChoLam', 'DangLam', 'HoanThanh')),
      ThoiGianGuiBep TEXT NOT NULL DEFAULT (datetime('now')),
      ThoiGianHoanThanh TEXT,
      FOREIGN KEY (SoHoaDon) REFERENCES HOA_DON_BAN_HANG(SoHoaDon) ON DELETE CASCADE,
      FOREIGN KEY (MaMon) REFERENCES DANH_MUC_MON(MaMon)
    );

    -- 16. YEU_CAU_HUY_DOI_MON
    CREATE TABLE IF NOT EXISTS YEU_CAU_HUY_DOI_MON (
      MaYeuCau TEXT PRIMARY KEY,
      SoHoaDon TEXT NOT NULL,
      MaChiTiet INTEGER NOT NULL,
      LyDoHuy TEXT NOT NULL,
      NguoiYeuCau TEXT NOT NULL,
      NguoiPheDuyet TEXT,
      ThoiGianYeuCau TEXT NOT NULL DEFAULT (datetime('now')),
      ThoiGianDuyet TEXT,
      TrangThaiDuyet TEXT NOT NULL DEFAULT 'ChoDuyet',
      FOREIGN KEY (SoHoaDon) REFERENCES HOA_DON_BAN_HANG(SoHoaDon),
      FOREIGN KEY (MaChiTiet) REFERENCES CHI_TIET_HOA_DON(MaChiTiet),
      FOREIGN KEY (NguoiYeuCau) REFERENCES NHAN_VIEN(MaNhanVien),
      FOREIGN KEY (NguoiPheDuyet) REFERENCES NHAN_VIEN(MaNhanVien)
    );

    -- 19. PHIEU_NHAP_KHO
    CREATE TABLE IF NOT EXISTS PHIEU_NHAP_KHO (
      SoPhieuNhap TEXT PRIMARY KEY,
      NgayNhap TEXT NOT NULL DEFAULT (datetime('now')),
      MaNCC TEXT NOT NULL,
      MaNhanVien TEXT NOT NULL,
      TongTienNhap REAL NOT NULL DEFAULT 0,
      TrangThai TEXT NOT NULL DEFAULT 'DaNhap',
      GhiChu TEXT,
      FOREIGN KEY (MaNCC) REFERENCES NHA_CUNG_CAP(MaNCC),
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien)
    );

    -- 20. CHI_TIET_PHIEU_NHAP
    CREATE TABLE IF NOT EXISTS CHI_TIET_PHIEU_NHAP (
      MaCTNhap INTEGER PRIMARY KEY AUTOINCREMENT,
      SoPhieuNhap TEXT NOT NULL,
      MaVatTu TEXT NOT NULL,
      SoLuongNhap REAL NOT NULL,
      DonGiaNhap REAL NOT NULL,
      ThanhTien REAL NOT NULL,
      FOREIGN KEY (SoPhieuNhap) REFERENCES PHIEU_NHAP_KHO(SoPhieuNhap) ON DELETE CASCADE,
      FOREIGN KEY (MaVatTu) REFERENCES VAT_TU_NGUYEN_LIEU(MaVatTu)
    );

    -- 21. PHIEU_HUY_HAO_HUT
    CREATE TABLE IF NOT EXISTS PHIEU_HUY_HAO_HUT (
      SoPhieuHuy TEXT PRIMARY KEY,
      NgayHuy TEXT NOT NULL DEFAULT (datetime('now')),
      MaNhanVien TEXT NOT NULL,
      TongGiaTriHaoHut REAL NOT NULL DEFAULT 0,
      LyDoHaoHut TEXT NOT NULL,
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien)
    );

    -- 22. CHI_TIET_HUY_HAO_HUT
    CREATE TABLE IF NOT EXISTS CHI_TIET_HUY_HAO_HUT (
      MaCTHuy INTEGER PRIMARY KEY AUTOINCREMENT,
      SoPhieuHuy TEXT NOT NULL,
      MaVatTu TEXT NOT NULL,
      SoLuongHaoHut REAL NOT NULL,
      GiaTri REAL NOT NULL,
      FOREIGN KEY (SoPhieuHuy) REFERENCES PHIEU_HUY_HAO_HUT(SoPhieuHuy) ON DELETE CASCADE,
      FOREIGN KEY (MaVatTu) REFERENCES VAT_TU_NGUYEN_LIEU(MaVatTu)
    );

    -- 23. SO_QUY_THU_CHI
    CREATE TABLE IF NOT EXISTS SO_QUY_THU_CHI (
      MaPhieuThuChi TEXT PRIMARY KEY,
      LoaiPhieu TEXT NOT NULL CHECK (LoaiPhieu IN ('Thu', 'Chi')),
      NgayPhatSinh TEXT NOT NULL DEFAULT (datetime('now')),
      SoTien REAL NOT NULL CHECK (SoTien > 0),
      MaNhanVien TEXT NOT NULL,
      DoiTuongNopNhan TEXT,
      ChungTuGoc TEXT,
      LyDo TEXT NOT NULL,
      FOREIGN KEY (MaNhanVien) REFERENCES NHAN_VIEN(MaNhanVien)
    );
  `);

  // Kiểm tra nếu chưa có dữ liệu thì nạp seed data
  const countRow = db.prepare('SELECT COUNT(*) as count FROM NHAN_VIEN').get() as { count: number };
  if (countRow.count === 0) {
    seedData();
  }
}

function seedData() {
  console.log('Seeding initial coffee shop data...');
  const statements = [
    // 1. DON_VI_BO_PHAN
    `INSERT INTO DON_VI_BO_PHAN (MaBoPhan, TenBoPhan) VALUES
      ('BP_QL', 'Ban Quản Lý'),
      ('BP_BAR', 'Quầy Pha Chế (Barista)'),
      ('BP_TN', 'Quầy Thu Ngân'),
      ('BP_PV', 'Đội Ngũ Phục Vụ'),
      ('BP_KHO', 'Kho & Tiếp Vận');`,

    // 2. CHUC_VU
    `INSERT INTO CHUC_VU (MaChucVu, TenChucVu, HeSoLuong) VALUES
      ('CV_OWNER', 'Chủ Cửa Hàng', 3.00),
      ('CV_MGR', 'Quản Lý Quán', 2.20),
      ('CV_BAR', 'Trưởng Pha Chế', 1.60),
      ('CV_CASHIER', 'Thu Ngân Viên', 1.30),
      ('CV_WAITER', 'Nhân Viên Phục Vụ', 1.00);`,

    // 3. NHAN_VIEN
    `INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, MaChucVu, MaBoPhan, TrangThaiLamViec) VALUES
      ('NV01', 'Nguyễn Hoàng Nam (Chủ quán)', '1988-05-12', '0901234567', 'CV_OWNER', 'BP_QL', 'DangLamViec'),
      ('NV02', 'Trần Minh Tuấn (Quản lý)', '1993-08-20', '0912345678', 'CV_MGR', 'BP_QL', 'DangLamViec'),
      ('NV03', 'Lê Thị Mai (Thu ngân)', '1998-11-15', '0923456789', 'CV_CASHIER', 'BP_TN', 'DangLamViec'),
      ('NV04', 'Phạm Đăng Khoa (Barista)', '2000-03-10', '0934567890', 'CV_BAR', 'BP_BAR', 'DangLamViec'),
      ('NV05', 'Hoàng Thùy Linh (Phục vụ)', '2002-09-25', '0945678901', 'CV_WAITER', 'BP_PV', 'DangLamViec');`,

    // 4. TAI_KHOAN (Mật khẩu: 123456)
    `INSERT INTO TAI_KHOAN (MaTaiKhoan, MaNhanVien, TenDangNhap, MatKhauHash, VaiTro, KichHoat) VALUES
      ('TK01', 'NV01', 'owner', '123456', 'ChuQuan', 1),
      ('TK02', 'NV02', 'manager', '123456', 'QuanLy', 1),
      ('TK03', 'NV03', 'cashier', '123456', 'ThuNgan', 1),
      ('TK04', 'NV04', 'barista', '123456', 'PhaChe', 1),
      ('TK05', 'NV05', 'waiter', '123456', 'PhucVu', 1);`,

    // 5. CA_LAM_VIEC
    `INSERT INTO CA_LAM_VIEC (MaCa, TenCa, GioBatDau, GioKetThuc, TienCongTheoCa) VALUES
      ('CA_SANG', 'Ca Sáng (06:30 - 14:30)', '06:30', '14:30', 200000),
      ('CA_CHIEU', 'Ca Chiều (14:30 - 22:30)', '14:30', '22:30', 200000);`,

    // 8. KHU_VUC
    `INSERT INTO KHU_VUC (MaKhuVuc, TenKhuVuc) VALUES
      ('KV_T1', 'Tầng 1 (Máy Lạnh & Quầy Bar)'),
      ('KV_T2', 'Tầng 2 (Yên Tĩnh Làm Việc)'),
      ('KV_SV', 'Sân Vườn Ngoài Trời');`,

    // 9. BAN
    `INSERT INTO BAN (MaBan, TenBan, MaKhuVuc, TrangThai, SoGhe) VALUES
      ('B01', 'Bàn 01', 'KV_T1', 'Trong', 2),
      ('B02', 'Bàn 02', 'KV_T1', 'Trong', 4),
      ('B03', 'Bàn 03', 'KV_T1', 'CoKhach', 4),
      ('B04', 'Bàn 04', 'KV_T1', 'Trong', 6),
      ('B05', 'Bàn 05 VIP', 'KV_T1', 'DatTruoc', 8),
      ('B11', 'Bàn 11', 'KV_T2', 'Trong', 2),
      ('B12', 'Bàn 12', 'KV_T2', 'Trong', 4),
      ('B13', 'Bàn 13', 'KV_T2', 'CoKhach', 4),
      ('B14', 'Bàn 14', 'KV_T2', 'Trong', 6),
      ('B21', 'Sân Vườn 01', 'KV_SV', 'Trong', 4),
      ('B22', 'Sân Vườn 02', 'KV_SV', 'Trong', 4),
      ('B23', 'Sân Vườn 03', 'KV_SV', 'Trong', 4);`,

    // 10. NHOM_MON
    `INSERT INTO NHOM_MON (MaNhom, TenNhom, ThuTuHienThi) VALUES
      ('GRP_CFE', 'Cà Phê Truyền Thống & Espresso', 1),
      ('GRP_TEA', 'Trà Trái Cây & Trà Sữa', 2),
      ('GRP_FRZ', 'Đá Xay & Sinh Tố', 3),
      ('GRP_CAKE', 'Bánh Ngọt & Ăn Vặt', 4);`,

    // 11. DANH_MUC_MON
    `INSERT INTO DANH_MUC_MON (MaMon, TenMon, MaNhom, DonViTinh, GiaBanHienHanh, HinhAnh, DangKinhDoanh) VALUES
      ('M01', 'Cà Phê Đen Đá', 'GRP_CFE', 'Ly', 29000, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&auto=format&fit=crop&q=80', 1),
      ('M02', 'Cà Phê Sữa Đá', 'GRP_CFE', 'Ly', 35000, 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80', 1),
      ('M03', 'Bạc Xỉu Sài Gòn', 'GRP_CFE', 'Ly', 39000, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop&q=80', 1),
      ('M04', 'Espresso Nóng', 'GRP_CFE', 'Tách', 32000, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80', 1),
      ('M05', 'Caramel Macchiato', 'GRP_CFE', 'Ly', 49000, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&auto=format&fit=crop&q=80', 1),
      ('M06', 'Trà Đào Cam Sả', 'GRP_TEA', 'Ly', 45000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80', 1),
      ('M07', 'Trà Vải Hoa Hồng', 'GRP_TEA', 'Ly', 45000, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80', 1),
      ('M08', 'Trà Sữa Oolong Nướng', 'GRP_TEA', 'Ly', 42000, 'https://images.unsplash.com/photo-1558857563-b37cf5a73e65?w=400&auto=format&fit=crop&q=80', 1),
      ('M09', 'Matcha Đá Xay Kem Cheese', 'GRP_FRZ', 'Ly', 55000, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80', 1),
      ('M10', 'Bánh Croissant Bơ Tỏi', 'GRP_CAKE', 'Cái', 35000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', 1),
      ('M11', 'Tiramisu Cacao', 'GRP_CAKE', 'Phần', 45000, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&auto=format&fit=crop&q=80', 1);`,

    // 17. NHA_CUNG_CAP
    `INSERT INTO NHA_CUNG_CAP (MaNCC, TenNCC, SoDienThoai, DiaChi, CongNoHienTai) VALUES
      ('NCC01', 'Công Ty Cầu Đất Farm', '02633888999', 'Đà Lạt, Lâm Đồng', 15000000),
      ('NCC02', 'Công Ty CP Sữa Vinamilk', '02854155555', 'Quận 7, TP. HCM', 5200000),
      ('NCC03', 'Nhà Phân Phối Barista Mart', '0909887766', 'Bình Thạnh, TP. HCM', 8400000);`,

    // 18. VAT_TU_NGUYEN_LIEU
    `INSERT INTO VAT_TU_NGUYEN_LIEU (MaVatTu, TenVatTu, DonViTinh, SoLuongTonHienTai, MucToiThieuCanCanhBao, DonGiaBinhQuan) VALUES
      ('VT_ROBUSTA', 'Hạt Cà Phê Robusta', 'g', 15000, 2000, 180),
      ('VT_ARABICA', 'Hạt Cà Phê Arabica', 'g', 10000, 1500, 320),
      ('VT_SUADAC', 'Sữa Đặc Phương Nam', 'ml', 8000, 1000, 55),
      ('VT_SUATUOI', 'Sữa Tươi Tiệt Trùng', 'ml', 12000, 2000, 35),
      ('VT_DUONG', 'Đường Cát Trắng', 'g', 20000, 3000, 25),
      ('VT_TRADAO', 'Cốt Trà Đào Cozy', 'ml', 5000, 800, 40),
      ('VT_MIENGDAO', 'Đào Ngâm Kronos', 'mieng', 120, 30, 3500),
      ('VT_SYRUP_CAM', 'Syrup Cam Teisseire', 'ml', 2500, 500, 220),
      ('VT_MATCHA', 'Bột Matcha Uji', 'g', 1500, 200, 850),
      ('VT_KEMCHEESE', 'Kem Kem Cheese', 'ml', 3000, 500, 120),
      ('VT_CROISSANT', 'Bánh Croissant Lạnh', 'cái', 25, 10, 16000);`,

    // 12. CONG_THUC_MON
    `INSERT INTO CONG_THUC_MON (MaCongThuc, MaMon, MaVatTu, SoLuongDinhMuc, DonViTinh, GhiChu) VALUES
      ('CT_M01_1', 'M01', 'VT_ROBUSTA', 25, 'g', 'Chiết xuất 45ml'),
      ('CT_M01_2', 'M01', 'VT_DUONG', 15, 'g', 'Nước đường'),
      ('CT_M02_1', 'M02', 'VT_ROBUSTA', 25, 'g', 'Cốt cà phê'),
      ('CT_M02_2', 'M02', 'VT_SUADAC', 40, 'ml', 'Sữa đặc'),
      ('CT_M03_1', 'M03', 'VT_ROBUSTA', 15, 'g', 'Cà phê tầng trên'),
      ('CT_M03_2', 'M03', 'VT_SUADAC', 50, 'ml', 'Sữa đặc đáy'),
      ('CT_M03_3', 'M03', 'VT_SUATUOI', 60, 'ml', 'Sữa tươi giữa'),
      ('CT_M06_1', 'M06', 'VT_TRADAO', 120, 'ml', 'Cốt trà ủ sả'),
      ('CT_M06_2', 'M06', 'VT_MIENGDAO', 2, 'mieng', '2 miếng đào'),
      ('CT_M06_3', 'M06', 'VT_SYRUP_CAM', 20, 'ml', 'Syrup vỏ cam'),
      ('CT_M09_1', 'M09', 'VT_MATCHA', 15, 'g', 'Matcha Uji'),
      ('CT_M09_2', 'M09', 'VT_SUATUOI', 80, 'ml', 'Sữa tươi xay'),
      ('CT_M09_3', 'M09', 'VT_KEMCHEESE', 40, 'ml', 'Màng cheese kem'),
      ('CT_M10_1', 'M10', 'VT_CROISSANT', 1, 'cái', 'Nướng nóng 5p');`,

    // 13. KHACH_HANG
    `INSERT INTO KHACH_HANG (MaKhachHang, HoTen, SoDienThoai, DiemTichLuy, HangThanhVien) VALUES
      ('KH01', 'Đặng Văn Hậu', '0988111222', 45, 'Member'),
      ('KH02', 'Vũ Thị Bích Trâm', '0977222333', 180, 'Silver'),
      ('KH03', 'Trần Quốc Bảo', '0966333444', 620, 'Gold'),
      ('KH04', 'Lâm Doanh Doanh', '0911555999', 1450, 'VIP');`,

    // 6. BANG_KE_GIAO_CA
    `INSERT INTO BANG_KE_GIAO_CA (MaGiaoCa, MaCa, MaNhanVien, NgayLamViec, ThoiGianMoCa, TienDauCa, DoanhThuTienMat, DoanhThuChuyenKhoan, TienMatThucTeTrongKet, ChenhLechThuaThieu, TrangThai, GhiChuGiaoCa) VALUES
      ('GC_CA1_HOMNAY', 'CA_SANG', 'NV03', date('now'), datetime('now'), 1000000, 0, 0, 0, 0, 'DangMo', 'Tiền thối lẻ 1.000.000đ chuẩn bị sẵn.');`,

    // 23. SO_QUY_THU_CHI
    `INSERT INTO SO_QUY_THU_CHI (MaPhieuThuChi, LoaiPhieu, NgayPhatSinh, SoTien, MaNhanVien, DoiTuongNopNhan, ChungTuGoc, LyDo) VALUES
      ('PTC_001', 'Chi', datetime('now', '-2 days'), 1200000, 'NV02', 'Công ty Điện Lực EVN', 'HD_DIEN_11', 'Tiền điện sinh hoạt kỳ 1'),
      ('PTC_002', 'Chi', datetime('now', '-1 day'), 450000, 'NV02', 'Văn Phòng Phẩm Sao Mai', 'HD_VPP_01', 'Giấy in bill nhiệt 80mm k80'),
      ('PTC_003', 'Thu', datetime('now', '-1 day'), 500000, 'NV01', 'Đoàn quay phim', 'HD_THUE_ST', 'Phụ thu quay video tại quán');`,

    // 7. BANG_THANH_TOAN_LUONG
    `INSERT INTO BANG_THANH_TOAN_LUONG (MaBangLuong, ThangNam, MaNhanVien, TongGioLam, LuongCoBan, Thuong, Phat, ThucLinh, TrangThai) VALUES
      ('BL_NV03_10', '2026-10', 'NV03', 200, 6500000, 500000, 0, 7000000, 'DaThanhToan'),
      ('BL_NV04_10', '2026-10', 'NV04', 210, 8000000, 600000, 0, 8600000, 'DaThanhToan'),
      ('BL_NV05_10', '2026-10', 'NV05', 180, 5000000, 300000, 50000, 5250000, 'DaThanhToan');`
  ];

  for (const sql of statements) {
    db.exec(sql);
  }
  console.log('Seeding completed successfully!');
}
