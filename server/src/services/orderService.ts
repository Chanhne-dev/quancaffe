import { db } from '../db/database.js';
import { CreateOrderDTO, LowStockAlert, KitchenStatus } from '../types/index.js';
import { kdsHub } from '../sockets/kdsHub.js';

export class OrderService {
  /**
   * Tạo đơn hàng mới & gửi bếp KDS
   */
  public static createOrder(dto: CreateOrderDTO) {
    const soHoaDon = dto.soHoaDon || `HD_${Date.now()}`;
    const ngayGioLap = new Date().toISOString();

    // 1. Tính toán giá trị đơn hàng
    let tongTienMon = 0;
    dto.items.forEach(item => {
      tongTienMon += item.donGia * item.soLuong;
    });

    // 2. Tìm khách hàng & áp dụng ưu đãi hạng thành viên nếu có
    let maKhachHang = dto.maKhachHang || null;
    let giamGia = dto.giamGia || 0;

    if (dto.soDienThoaiKhach && !maKhachHang) {
      const khach = db.prepare('SELECT MaKhachHang, HangThanhVien, DiemTichLuy FROM KHACH_HANG WHERE SoDienThoai = ?')
        .get(dto.soDienThoaiKhach) as any;
      if (khach) {
        maKhachHang = khach.MaKhachHang;
        // Áp dụng chiết khấu hạng nếu chưa có giảm giá thủ công
        if (!dto.giamGia) {
          if (khach.HangThanhVien === 'VIP') giamGia = tongTienMon * 0.15;
          else if (khach.HangThanhVien === 'Gold') giamGia = tongTienMon * 0.10;
          else if (khach.HangThanhVien === 'Silver') giamGia = tongTienMon * 0.05;
        }
      }
    }

    const tienMatThucThu = Math.max(0, tongTienMon - giamGia);
    const trangThaiThanhToan = dto.thanhToanNgay ? 'DaThanhToan' : 'ChoThanhToan';

    // Lấy ca làm việc đang mở
    const caHienTai = db.prepare("SELECT MaCa, MaGiaoCa FROM BANG_KE_GIAO_CA WHERE TrangThai = 'DangMo' ORDER BY ThoiGianMoCa DESC LIMIT 1").get() as any;
    const maCa = caHienTai ? caHienTai.MaCa : null;

    // BẮT ĐẦU TRANSACTION
    db.exec('BEGIN TRANSACTION;');
    try {
      // Lưu Hóa đơn
      const insertHD = db.prepare(`
        INSERT INTO HOA_DON_BAN_HANG (
          SoHoaDon, NgayGioLap, KenhDatHang, MaBan, MaNhanVien, MaKhachHang,
          TongTienMon, GiamGia, TienMatThucThu, PhuongThucThanhToan,
          TrangThaiThanhToan, MaCa, GhiChu, OfflineId, DaDongBo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      insertHD.run(
        soHoaDon,
        ngayGioLap,
        dto.kenhDatHang,
        dto.maBan || null,
        dto.maNhanVien,
        maKhachHang,
        tongTienMon,
        giamGia,
        tienMatThucThu,
        dto.phuongThucThanhToan,
        trangThaiThanhToan,
        maCa,
        dto.ghiChu || null,
        dto.offlineId || null
      );

      // Lưu Chi tiết hóa đơn
      const insertCT = db.prepare(`
        INSERT INTO CHI_TIET_HOA_DON (
          SoHoaDon, MaMon, SoLuong, DonGia, ThanhTien, GhiChuTopping, TrangThaiPhaChe, ThoiGianGuiBep
        ) VALUES (?, ?, ?, ?, ?, ?, 'ChoLam', ?)
      `);

      const insertedItems: any[] = [];
      for (const item of dto.items) {
        const thanhTien = item.soLuong * item.donGia;
        insertCT.run(
          soHoaDon,
          item.maMon,
          item.soLuong,
          item.donGia,
          thanhTien,
          item.ghiChuTopping || null,
          ngayGioLap
        );

        // Lấy tên món
        const mon = db.prepare('SELECT TenMon FROM DANH_MUC_MON WHERE MaMon = ?').get(item.maMon) as any;

        insertedItems.push({
          maMon: item.maMon,
          tenMon: mon ? mon.TenMon : item.maMon,
          soLuong: item.soLuong,
          donGia: item.donGia,
          thanhTien,
          ghiChuTopping: item.ghiChuTopping || '',
          trangThaiPhaChe: 'ChoLam'
        });
      }

      // Cập nhật trạng thái bàn nếu có
      if (dto.maBan) {
        db.prepare("UPDATE BAN SET TrangThai = 'CoKhach' WHERE MaBan = ?").run(dto.maBan);
      }

      // Nếu thanh toán ngay: Trừ kho & tích điểm & cập nhật quỹ ca
      let lowStockAlerts: LowStockAlert[] = [];
      if (dto.thanhToanNgay) {
        lowStockAlerts = OrderService.deductInventoryForOrder(soHoaDon);
        if (maKhachHang) {
          OrderService.accumulatePoints(maKhachHang, tienMatThucThu);
        }
        OrderService.recordCashRevenueInShift(caHienTai?.MaGiaoCa, dto.phuongThucThanhToan, tienMatThucThu);
      }

      db.exec('COMMIT;');

      // BẮN SỰ KIỆN WEBSOCKET TỚI MÀN HÌNH KDS VÀ POS
      const orderPayload = {
        soHoaDon,
        ngayGioLap,
        kenhDatHang: dto.kenhDatHang,
        maBan: dto.maBan,
        tongTienMon,
        giamGia,
        tienMatThucThu,
        phuongThucThanhToan: dto.phuongThucThanhToan,
        trangThaiThanhToan,
        items: insertedItems
      };

      kdsHub.broadcast('ORDER_NEW', orderPayload);

      if (dto.maBan) {
        kdsHub.broadcast('TABLE_UPDATED', { maBan: dto.maBan, trangThai: 'CoKhach' });
      }

      // Gửi cảnh báo tồn kho nếu có
      if (lowStockAlerts.length > 0) {
        lowStockAlerts.forEach(alert => {
          kdsHub.broadcast('STOCK_ALERT', alert);
        });
      }

      return {
        success: true,
        data: orderPayload,
        lowStockAlerts
      };
    } catch (err: any) {
      db.exec('ROLLBACK;');
      console.error('[OrderService.createOrder Error]:', err);
      throw new Error(`Tạo đơn hàng thất bại: ${err.message}`);
    }
  }

  /**
   * Xử lý thanh toán đơn hàng & trừ tồn kho tự động (Transaction Safe)
   */
  public static processPayment(soHoaDon: string, phuongThuc: string, maNhanVien: string) {
    const order = db.prepare('SELECT * FROM HOA_DON_BAN_HANG WHERE SoHoaDon = ?').get(soHoaDon) as any;
    if (!order) {
      throw new Error('Hóa đơn không tồn tại');
    }
    if (order.TrangThaiThanhToan === 'DaThanhToan') {
      throw new Error('Hóa đơn này đã được thanh toán trước đó');
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Cập nhật hóa đơn
      db.prepare(`
        UPDATE HOA_DON_BAN_HANG
        SET TrangThaiThanhToan = 'DaThanhToan',
            PhuongThucThanhToan = ?,
            MaNhanVien = ?
        WHERE SoHoaDon = ?
      `).run(phuongThuc, maNhanVien, soHoaDon);

      // 2. Chạy thuật toán trừ tồn kho tự động (Recipe Auto-Deduction)
      const lowStockAlerts = OrderService.deductInventoryForOrder(soHoaDon);

      // 3. Tích điểm cho khách hàng
      if (order.MaKhachHang) {
        OrderService.accumulatePoints(order.MaKhachHang, order.TienMatThucThu);
      }

      // 4. Giải phóng bàn nếu không còn order đang chờ
      if (order.MaBan) {
        const remainingOrders = db.prepare(`
          SELECT COUNT(*) as cnt FROM HOA_DON_BAN_HANG
          WHERE MaBan = ? AND TrangThaiThanhToan = 'ChoThanhToan' AND SoHoaDon != ?
        `).get(order.MaBan, soHoaDon) as any;

        if (remainingOrders.cnt === 0) {
          db.prepare("UPDATE BAN SET TrangThai = 'Trong' WHERE MaBan = ?").run(order.MaBan);
        }
      }

      // 5. Ghi nhận doanh thu vào ca làm việc hiện tại
      const caHienTai = db.prepare("SELECT MaGiaoCa FROM BANG_KE_GIAO_CA WHERE TrangThai = 'DangMo' ORDER BY ThoiGianMoCa DESC LIMIT 1").get() as any;
      if (caHienTai) {
        OrderService.recordCashRevenueInShift(caHienTai.MaGiaoCa, phuongThuc, order.TienMatThucThu);
      }

      // 6. Ghi nhận vào Sổ quỹ thu chi nếu là Tiền mặt
      db.prepare(`
        INSERT INTO SO_QUY_THU_CHI (MaPhieuThuChi, LoaiPhieu, NgayPhatSinh, SoTien, MaNhanVien, DoiTuongNopNhan, ChungTuGoc, LyDo)
        VALUES (?, 'Thu', datetime('now'), ?, ?, ?, ?, ?)
      `).run(
        `PT_${Date.now()}`,
        order.TienMatThucThu,
        maNhanVien,
        order.MaKhachHang || 'Khách Vãng Lai',
        soHoaDon,
        `Thu tiền hóa đơn ${soHoaDon} qua ${phuongThuc}`
      );

      db.exec('COMMIT;');

      // Phát thông báo WebSocket
      if (order.MaBan) {
        kdsHub.broadcast('TABLE_UPDATED', { maBan: order.MaBan, trangThai: 'Trong' });
      }

      if (lowStockAlerts.length > 0) {
        lowStockAlerts.forEach(alert => kdsHub.broadcast('STOCK_ALERT', alert));
      }

      return {
        success: true,
        message: 'Thanh toán và trừ tồn kho hoàn tất',
        lowStockAlerts
      };
    } catch (err: any) {
      db.exec('ROLLBACK;');
      console.error('[OrderService.processPayment Error]:', err);
      throw new Error(`Xử lý thanh toán thất bại: ${err.message}`);
    }
  }

  /**
   * Thuật toán trừ tồn kho tự động theo công thức món (Recipe Mapping & Auto-Deduction)
   */
  private static deductInventoryForOrder(soHoaDon: string): LowStockAlert[] {
    const alerts: LowStockAlert[] = [];

    // Lấy chi tiết món
    const items = db.prepare('SELECT MaMon, SoLuong FROM CHI_TIET_HOA_DON WHERE SoHoaDon = ?').all(soHoaDon) as any[];

    for (const item of items) {
      // Tìm công thức món tương ứng
      const recipes = db.prepare(`
        SELECT c.MaVatTu, c.SoLuongDinhMuc, v.TenVatTu, v.SoLuongTonHienTai, v.MucToiThieuCanCanhBao, v.DonViTinh
        FROM CONG_THUC_MON c
        JOIN VAT_TU_NGUYEN_LIEU v ON c.MaVatTu = v.MaVatTu
        WHERE c.MaMon = ?
      `).all(item.MaMon) as any[];

      for (const r of recipes) {
        const luongHaoPhi = r.SoLuongDinhMuc * item.SoLuong;
        const soLuongTonMoi = r.SoLuongTonHienTai - luongHaoPhi;

        // Cập nhật trừ tồn kho
        db.prepare(`
          UPDATE VAT_TU_NGUYEN_LIEU
          SET SoLuongTonHienTai = ?
          WHERE MaVatTu = ?
        `).run(soLuongTonMoi, r.MaVatTu);

        // Kiểm tra ngưỡng cảnh báo chạm đáy tồn kho (Low Stock Warning)
        if (soLuongTonMoi <= r.MucToiThieuCanCanhBao) {
          alerts.push({
            maVatTu: r.MaVatTu,
            tenVatTu: r.TenVatTu,
            soLuongTonHienTai: Number(soLuongTonMoi.toFixed(2)),
            mucToiThieuCanCanhBao: r.MucToiThieuCanCanhBao,
            donViTinh: r.DonViTinh,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Tích điểm & Nâng hạng thành viên (10.000đ = 1 điểm)
   */
  private static accumulatePoints(maKhachHang: string, soTien: number) {
    const pointsEarned = Math.floor(soTien / 10000);
    if (pointsEarned <= 0) return;

    const kh = db.prepare('SELECT DiemTichLuy FROM KHACH_HANG WHERE MaKhachHang = ?').get(maKhachHang) as any;
    if (!kh) return;

    const newPoints = kh.DiemTichLuy + pointsEarned;
    let newTier = 'Member';
    if (newPoints >= 1000) newTier = 'VIP';
    else if (newPoints >= 500) newTier = 'Gold';
    else if (newPoints >= 100) newTier = 'Silver';

    db.prepare(`
      UPDATE KHACH_HANG
      SET DiemTichLuy = ?,
          HangThanhVien = ?
      WHERE MaKhachHang = ?
    `).run(newPoints, newTier, maKhachHang);
  }

  /**
   * Cập nhật doanh thu vào ca làm việc hiện hành
   */
  private static recordCashRevenueInShift(maGiaoCa: string | undefined, phuongThuc: string, soTien: number) {
    if (!maGiaoCa) return;

    if (phuongThuc === 'TienMat') {
      db.prepare(`
        UPDATE BANG_KE_GIAO_CA
        SET DoanhThuTienMat = DoanhThuTienMat + ?
        WHERE MaGiaoCa = ?
      `).run(soTien, maGiaoCa);
    } else {
      db.prepare(`
        UPDATE BANG_KE_GIAO_CA
        SET DoanhThuChuyenKhoan = DoanhThuChuyenKhoan + ?
        WHERE MaGiaoCa = ?
      `).run(soTien, maGiaoCa);
    }
  }

  /**
   * Cập nhật trạng thái pha chế KDS (ChoLam -> DangLam -> HoanThanh)
   */
  public static updateKdsItemStatus(maChiTiet: number, trangThai: KitchenStatus) {
    const ct = db.prepare('SELECT SoHoaDon, MaMon FROM CHI_TIET_HOA_DON WHERE MaChiTiet = ?').get(maChiTiet) as any;
    if (!ct) {
      throw new Error('Món không tồn tại trong chi tiết hóa đơn');
    }

    const thoiGianHoanThanh = trangThai === 'HoanThanh' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE CHI_TIET_HOA_DON
      SET TrangThaiPhaChe = ?,
          ThoiGianHoanThanh = COALESCE(?, ThoiGianHoanThanh)
      WHERE MaChiTiet = ?
    `).run(trangThai, thoiGianHoanThanh, maChiTiet);

    // Phát broadcast cập nhật item
    kdsHub.broadcast('KDS_ITEM_STATUS', {
      maChiTiet,
      soHoaDon: ct.SoHoaDon,
      trangThai
    });

    // Kiểm tra xem tất cả các món trong đơn hàng đã hoàn tất chưa
    const remainingUnfinished = db.prepare(`
      SELECT COUNT(*) as count FROM CHI_TIET_HOA_DON
      WHERE SoHoaDon = ? AND TrangThaiPhaChe != 'HoanThanh'
    `).get(ct.SoHoaDon) as any;

    if (remainingUnfinished.count === 0) {
      // Đơn hàng đã làm xong hoàn toàn -> thông báo phục vụ / thu ngân
      const order = db.prepare('SELECT MaBan, KenhDatHang FROM HOA_DON_BAN_HANG WHERE SoHoaDon = ?').get(ct.SoHoaDon) as any;
      kdsHub.broadcast('KDS_ORDER_COMPLETED', {
        soHoaDon: ct.SoHoaDon,
        maBan: order?.MaBan,
        kenhDatHang: order?.KenhDatHang,
        message: `Đơn hàng ${ct.SoHoaDon} (${order?.MaBan || 'Mang đi'}) đã hoàn tất pha chế!`
      });
    }

    return { success: true, maChiTiet, trangThai };
  }

  /**
   * Lấy danh sách phiếu order chờ pha chế trên KDS
   */
  public static getActiveKdsTickets() {
    const orders = db.prepare(`
      SELECT hd.SoHoaDon, hd.NgayGioLap, hd.KenhDatHang, hd.MaBan, b.TenBan, hd.GhiChu
      FROM HOA_DON_BAN_HANG hd
      LEFT JOIN BAN b ON hd.MaBan = b.MaBan
      WHERE EXISTS (
        SELECT 1 FROM CHI_TIET_HOA_DON ct
        WHERE ct.SoHoaDon = hd.SoHoaDon AND ct.TrangThaiPhaChe != 'HoanThanh'
      )
      ORDER BY hd.NgayGioLap ASC
    `).all() as any[];

    const result = orders.map(ord => {
      const items = db.prepare(`
        SELECT ct.MaChiTiet, ct.MaMon, m.TenMon, ct.SoLuong, ct.GhiChuTopping,
               ct.TrangThaiPhaChe, ct.ThoiGianGuiBep
        FROM CHI_TIET_HOA_DON ct
        JOIN DANH_MUC_MON m ON ct.MaMon = m.MaMon
        WHERE ct.SoHoaDon = ?
      `).all(ord.SoHoaDon) as any[];

      return {
        ...ord,
        items
      };
    });

    return result;
  }
}
