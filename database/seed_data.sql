-- =====================================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA) CHO QUÁN CÀ PHÊ
-- =====================================================================================

-- 1. BỘ PHẬN
INSERT INTO DON_VI_BO_PHAN (MaBoPhan, TenBoPhan) VALUES
('BP_QL', N'Ban Quản Lý'),
('BP_BAR', N'Quầy Pha Chế (Barista)'),
('BP_TN', N'Quầy Thu Ngân'),
('BP_PV', N'Đội Ngũ Phục Vụ'),
('BP_KHO', N'Kho & Tiếp Vận');

-- 2. CHỨC VỤ
INSERT INTO CHUC_VU (MaChucVu, TenChucVu, HeSoLuong) VALUES
('CV_OWNER', N'Chủ Cửa Hàng', 3.00),
('CV_MGR', N'Quản Lý Quán', 2.20),
('CV_BAR', N'Trưởng Pha Chế', 1.60),
('CV_CASHIER', N'Thu Ngân Viên', 1.30),
('CV_WAITER', N'Nhân Viên Phục Vụ', 1.00);

-- 3. NHÂN VIÊN
INSERT INTO NHAN_VIEN (MaNhanVien, HoTen, NgaySinh, SoDienThoai, MaChucVu, MaBoPhan, TrangThaiLamViec) VALUES
('NV01', N'Nguyễn Hoàng Nam (Chủ quán)', '1988-05-12', '0901234567', 'CV_OWNER', 'BP_QL', N'DangLamViec'),
('NV02', N'Trần Minh Tuấn (Quản lý)', '1993-08-20', '0912345678', 'CV_MGR', 'BP_QL', N'DangLamViec'),
('NV03', N'Lê Thị Mai (Thu ngân)', '1998-11-15', '0923456789', 'CV_CASHIER', 'BP_TN', N'DangLamViec'),
('NV04', N'Phạm Đăng Khoa (Barista)', '2000-03-10', '0934567890', 'CV_BAR', 'BP_BAR', N'DangLamViec'),
('NV05', N'Hoàng Thùy Linh (Phục vụ)', '2002-09-25', '0945678901', 'CV_WAITER', 'BP_PV', N'DangLamViec');

-- 4. TÀI KHOẢN (Mật khẩu mặc định: 123456)
INSERT INTO TAI_KHOAN (MaTaiKhoan, MaNhanVien, TenDangNhap, MatKhauHash, VaiTro, KichHoat) VALUES
('TK01', 'NV01', 'owner', 'e10adc3949ba59abbe56e057f20f883e', 'ChuQuan', 1),
('TK02', 'NV02', 'manager', 'e10adc3949ba59abbe56e057f20f883e', 'QuanLy', 1),
('TK03', 'NV03', 'cashier', 'e10adc3949ba59abbe56e057f20f883e', 'ThuNgan', 1),
('TK04', 'NV04', 'barista', 'e10adc3949ba59abbe56e057f20f883e', 'PhaChe', 1),
('TK05', 'NV05', 'waiter', 'e10adc3949ba59abbe56e057f20f883e', 'PhucVu', 1);

-- 5. CA LÀM VIỆC
INSERT INTO CA_LAM_VIEC (MaCa, TenCa, GioBatDau, GioKetThuc, TienCongTheoCa) VALUES
('CA_SANG', N'Ca Sáng (06:30 - 14:30)', '06:30:00', '14:30:00', 200000),
('CA_CHIEU', N'Ca Chiều (14:30 - 22:30)', '14:30:00', '22:30:00', 200000);

-- 8. KHU VỰC
INSERT INTO KHU_VUC (MaKhuVuc, TenKhuVuc) VALUES
('KV_T1', N'Tầng 1 (Máy Lạnh & Quầy Bar)'),
('KV_T2', N'Tầng 2 (Yên Tĩnh Làm Việc)'),
('KV_SV', N'Sân Vườn Ngoài Trời');

-- 9. BÀN
INSERT INTO BAN (MaBan, TenBan, MaKhuVuc, TrangThai, SoGhe) VALUES
('B01', N'Bàn 01', 'KV_T1', 'Trong', 2),
('B02', N'Bàn 02', 'KV_T1', 'Trong', 4),
('B03', N'Bàn 03', 'KV_T1', 'CoKhach', 4),
('B04', N'Bàn 04', 'KV_T1', 'Trong', 6),
('B05', N'Bàn 05 (Sofa VIP)', 'KV_T1', 'DatTruoc', 8),
('B11', N'Bàn 11', 'KV_T2', 'Trong', 2),
('B12', N'Bàn 12', 'KV_T2', 'Trong', 4),
('B13', N'Bàn 13', 'KV_T2', 'CoKhach', 4),
('B14', N'Bàn 14', 'KV_T2', 'Trong', 6),
('B21', N'Sân Vườn 01', 'KV_SV', 'Trong', 4),
('B22', N'Sân Vườn 02', 'KV_SV', 'Trong', 4),
('B23', N'Sân Vườn 03', 'KV_SV', 'Trong', 4);

-- 10. NHÓM MÓN
INSERT INTO NHOM_MON (MaNhom, TenNhom, ThuTuHienThi) VALUES
('GRP_CFE', N'Cà Phê Truyền Thống & Espresso', 1),
('GRP_TEA', N'Trà Trái Cây & Trà Sữa', 2),
('GRP_FRZ', N'Đá Xay & Sinh Tố', 3),
('GRP_CAKE', N'Bánh Ngọt & Ăn Vặt', 4);

-- 11. DANH MỤC MÓN
INSERT INTO DANH_MUC_MON (MaMon, TenMon, MaNhom, DonViTinh, GiaBanHienHanh, HinhAnh, DangKinhDoanh) VALUES
('M01', N'Cà Phê Đen Đá', 'GRP_CFE', N'Ly', 29000, 'coffee_black.jpg', 1),
('M02', N'Cà Phê Sữa Đá', 'GRP_CFE', N'Ly', 35000, 'coffee_condensed.jpg', 1),
('M03', N'Bạc Xỉu Sài Gòn', 'GRP_CFE', N'Ly', 39000, 'bac_xiu.jpg', 1),
('M04', N'Espresso Nóng', 'GRP_CFE', N'Tách', 32000, 'espresso.jpg', 1),
('M05', N'Caramel Macchiato', 'GRP_CFE', N'Ly', 49000, 'caramel_macchiato.jpg', 1),
('M06', N'Trà Đào Cam Sả', 'GRP_TEA', N'Ly', 45000, 'tra_dao_cam_sa.jpg', 1),
('M07', N'Trà Vải Hoa Hồng', 'GRP_TEA', N'Ly', 45000, 'tra_vai.jpg', 1),
('M08', N'Trà Sữa Oolong Nướng', 'GRP_TEA', N'Ly', 42000, 'tra_sua_oolong.jpg', 1),
('M09', N'Matcha Đá Xay Kem Cheese', 'GRP_FRZ', N'Ly', 55000, 'matcha_iceblended.jpg', 1),
('M10', N'Bánh Croissant Bơ Tỏi', 'GRP_CAKE', N'Cái', 35000, 'croissant.jpg', 1),
('M11', N'Tiramisu Cacao', 'GRP_CAKE', N'Phần', 45000, 'tiramisu.jpg', 1);

-- 17. NHÀ CUNG CẤP
INSERT INTO NHA_CUNG_CAP (MaNCC, TenNCC, SoDienThoai, DiaChi, CongNoHienTai) VALUES
('NCC01', N'Công Ty TNHH Nông Sản Cầu Đất Farm', '02633888999', N'Đà Lạt, Lâm Đồng', 15000000),
('NCC02', N'Công Ty CP Sữa Vinamilk', '02854155555', N'Quận 7, TP. HCM', 5200000),
('NCC03', N'Nhà Phân Phối Nguyên Liệu Barista Mart', '0909887766', N'Bình Thạnh, TP. HCM', 8400000);

-- 18. VẬT TƯ NGUYÊN LIỆU (TỒN KHO)
INSERT INTO VAT_TU_NGUYEN_LIEU (MaVatTu, TenVatTu, DonViTinh, SoLuongTonHienTai, MucToiThieuCanCanhBao, DonGiaBinhQuan) VALUES
('VT_ROBUSTA', N'Hạt Cà Phê Robusta Buôn Ma Thuột', N'g', 15000.000, 2000.000, 180),   -- 180đ/g = 180.000đ/kg
('VT_ARABICA', N'Hạt Cà Phê Arabica Cầu Đất', N'g', 10000.000, 1500.000, 320),      -- 320đ/g = 320.000đ/kg
('VT_SUADAC', N'Sữa Đặc Ngôi Sao Phương Nam', N'ml', 8000.000, 1000.000, 55),       -- 55đ/ml
('VT_SUATUOI', N'Sữa Tươi Tiệt Trùng Barista', N'ml', 12000.000, 2000.000, 35),     -- 35đ/ml
('VT_DUONG', N'Đường Cát Trắng Tinh Luyện', N'g', 20000.000, 3000.000, 25),         -- 25đ/g
('VT_TRADAO', N'Cốt Trà Đen / Đào Cozy', N'ml', 5000.000, 800.000, 40),             -- 40đ/ml
('VT_MIENGDAO', N'Đào Ngâm Hộp Kronos', N'mieng', 120.000, 30.000, 3500),           -- 3500đ/miếng
('VT_SYRUP_CAM', N'Syrup Cam Teisseire', N'ml', 2500.000, 500.000, 220),            -- 220đ/ml
('VT_MATCHA', N'Bột Matcha Uji Nhật Bản', N'g', 1500.000, 200.000, 850),            -- 850đ/g
('VT_KEMCHEESE', N'Kem Topping Base / Cheese', N'ml', 3000.000, 500.000, 120),      -- 120đ/ml
('VT_CROISSANT', N'Bánh Croissant Đông Lạnh', N'cai', 25.000, 10.000, 16000);        -- 16.000đ/cái

-- 12. CÔNG THỨC MÓN (RECIPES)
INSERT INTO CONG_THUC_MON (MaCongThuc, MaMon, MaVatTu, SoLuongDinhMuc, DonViTinh, GhiChu) VALUES
-- Cà phê đen: 25g Robusta, 15g đường
('CT_M01_1', 'M01', 'VT_ROBUSTA', 25.000, 'g', N'Chiết xuất phin/espresso 45ml'),
('CT_M01_2', 'M01', 'VT_DUONG', 15.000, 'g', N'Nước đường standard'),
-- Cà phê sữa: 25g Robusta, 40ml sữa đặc
('CT_M02_1', 'M02', 'VT_ROBUSTA', 25.000, 'g', N'Cà phê cốt'),
('CT_M02_2', 'M02', 'VT_SUADAC', 40.000, 'ml', N'Sữa đặc'),
-- Bạc xỉu: 15g Robusta, 50ml sữa đặc, 60ml sữa tươi
('CT_M03_1', 'M03', 'VT_ROBUSTA', 15.000, 'g', N'Lớp cà phê trên'),
('CT_M03_2', 'M03', 'VT_SUADAC', 50.000, 'ml', N'Lớp sữa đáy'),
('CT_M03_3', 'M03', 'VT_SUATUOI', 60.000, 'ml', N'Lớp sữa tươi giữa'),
-- Trà đào cam sả: 120ml cốt trà, 2 miếng đào ngâm, 20ml syrup cam
('CT_M06_1', 'M06', 'VT_TRADAO', 120.000, 'ml', N'Cốt trà ủ nóng sả'),
('CT_M06_2', 'M06', 'VT_MIENGDAO', 2.000, 'mieng', N'Topping 2 miếng đào'),
('CT_M06_3', 'M06', 'VT_SYRUP_CAM', 20.000, 'ml', N'Hương vị vỏ cam'),
-- Matcha đá xay: 15g bột matcha, 80ml sữa tươi, 40ml kem cheese
('CT_M09_1', 'M09', 'VT_MATCHA', 15.000, 'g', N'Xay mịn với đá bi'),
('CT_M09_2', 'M09', 'VT_SUATUOI', 80.000, 'ml', N'Sữa tươi béo'),
('CT_M09_3', 'M09', 'VT_KEMCHEESE', 40.000, 'ml', N'Macchiato bông tuyết');

-- 13. KHÁCH HÀNG
INSERT INTO KHACH_HANG (MaKhachHang, HoTen, SoDienThoai, DiemTichLuy, HangThanhVien) VALUES
('KH01', N'Đặng Văn Hậu', '0988111222', 45, 'Member'),
('KH02', N'Vũ Thị Bích Trâm', '0977222333', 180, 'Silver'),
('KH03', N'Trần Quốc Bảo', '0966333444', 620, 'Gold'),
('KH04', N'Lâm Doanh Doanh', '0911555999', 1450, 'VIP');

-- 6. CA LÀM VIỆC HIỆN TẠI (ĐANG MỞ)
INSERT INTO BANG_KE_GIAO_CA (MaGiaoCa, MaCa, MaNhanVien, NgayLamViec, ThoiGianMoCa, TienDauCa, DoanhThuTienMat, DoanhThuChuyenKhoan, TienMatThucTeTrongKet, ChenhLechThuaThieu, TrangThai, GhiChuGiaoCa) VALUES
('GC_20261105_01', 'CA_SANG', 'NV03', '2026-11-05', '2026-11-05 06:30:00', 1000000, 0, 0, 0, 0, 'DangMo', N'Tiền đầu ca chuẩn bị sẵn mệnh giá nhỏ.');

-- 23. SỔ QUỸ THU CHI (BAN ĐẦU)
INSERT INTO SO_QUY_THU_CHI (MaPhieuThuChi, LoaiPhieu, NgayPhatSinh, SoTien, MaNhanVien, DoiTuongNopNhan, ChungTuGoc, LyDo) VALUES
('PTC_001', 'Chi', '2026-11-01 09:00:00', 1200000, 'NV02', N'Công ty Điện Lực EVN', 'HD_DIEN_11', N'Tiền điện kỳ 1 tháng 11'),
('PTC_002', 'Chi', '2026-11-02 10:00:00', 450000, 'NV02', N'Cửa hàng Văn Phòng Phẩm', 'HD_VPP_01', N'Mua cuộn giấy in bill nhiệt 80mm & bút viết'),
('PTC_003', 'Thu', '2026-11-03 14:00:00', 500000, 'NV01', N'Đoàn quay phim ngắn', 'HD_THUE_ST', N'Phụ thu phí chụp hình thương mại tại sân vườn');
