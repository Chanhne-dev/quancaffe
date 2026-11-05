import { db } from '../db/database.js';
import { kdsHub } from '../sockets/kdsHub.js';

export class ShiftService {
  /**
   * Lấy thông tin ca làm việc hiện tại đang mở
   */
  public static getCurrentShift() {
    const shift = db.prepare(`
      SELECT g.*, c.TenCa, c.GioBatDau, c.GioKetThuc, n.HoTen as TenNhanVien
      FROM BANG_KE_GIAO_CA g
      JOIN CA_LAM_VIEC c ON g.MaCa = c.MaCa
      JOIN NHAN_VIEN n ON g.MaNhanVien = n.MaNhanVien
      WHERE g.TrangThai = 'DangMo'
      ORDER BY g.ThoiGianMoCa DESC
      LIMIT 1
    `).get() as any;

    if (!shift) return null;

    // Tính tổng doanh thu tiền mặt và chuyển khoản từ các hóa đơn trong ca
    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN PhuongThucThanhToan = 'TienMat' THEN TienMatThucThu ELSE 0 END), 0) as TongTienMat,
        COALESCE(SUM(CASE WHEN PhuongThucThanhToan != 'TienMat' THEN TienMatThucThu ELSE 0 END), 0) as TongChuyenKhoan,
        COUNT(SoHoaDon) as TongDonHang
      FROM HOA_DON_BAN_HANG
      WHERE MaCa = ? AND TrangThaiThanhToan = 'DaThanhToan'
    `).get(shift.MaCa) as any;

    return {
      ...shift,
      DoanhThuTienMat: stats.TongTienMat,
      DoanhThuChuyenKhoan: stats.TongChuyenKhoan,
      TongDonHang: stats.TongDonHang,
      TienMatLyThuyetTrongKet: shift.TienDauCa + stats.TongTienMat
    };
  }

  /**
   * Mở ca làm việc mới
   */
  public static openShift(maCa: string, maNhanVien: string, tienDauCa: number, ghiChu?: string) {
    // Đảm bảo không có ca nào đang mở
    const current = db.prepare("SELECT MaGiaoCa FROM BANG_KE_GIAO_CA WHERE TrangThai = 'DangMo'").get();
    if (current) {
      throw new Error('Hiện tại đã có ca đang mở. Vui lòng chốt ca trước khi mở ca mới!');
    }

    const maGiaoCa = `GC_${Date.now()}`;
    const ngayLamViec = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO BANG_KE_GIAO_CA (
        MaGiaoCa, MaCa, MaNhanVien, NgayLamViec, ThoiGianMoCa,
        TienDauCa, DoanhThuTienMat, DoanhThuChuyenKhoan, TienMatThucTeTrongKet,
        ChenhLechThuaThieu, TrangThai, GhiChuGiaoCa
      ) VALUES (?, ?, ?, ?, datetime('now'), ?, 0, 0, 0, 0, 'DangMo', ?)
    `).run(maGiaoCa, maCa, maNhanVien, ngayLamViec, tienDauCa, ghiChu || '');

    kdsHub.broadcast('SHIFT_CHANGED', { action: 'OPEN', maGiaoCa });

    return { success: true, maGiaoCa };
  }

  /**
   * Chốt ca & Cân đối két tiền mặt (Cash Drawer Balancing)
   */
  public static closeShift(maGiaoCa: string, tienMatThucTe: number, ghiChu?: string) {
    const shift = db.prepare('SELECT * FROM BANG_KE_GIAO_CA WHERE MaGiaoCa = ?').get(maGiaoCa) as any;
    if (!shift) {
      throw new Error('Phiếu giao ca không tồn tại');
    }
    if (shift.TrangThai !== 'DangMo') {
      throw new Error('Ca làm việc này đã được chốt trước đó');
    }

    // Tính doanh thu thực tế đã ghi nhận trong ca
    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN PhuongThucThanhToan = 'TienMat' THEN TienMatThucThu ELSE 0 END), 0) as TongTienMat,
        COALESCE(SUM(CASE WHEN PhuongThucThanhToan != 'TienMat' THEN TienMatThucThu ELSE 0 END), 0) as TongChuyenKhoan
      FROM HOA_DON_BAN_HANG
      WHERE MaCa = ? AND TrangThaiThanhToan = 'DaThanhToan'
    `).get(shift.MaCa) as any;

    const tienMatLyThuyet = shift.TienDauCa + stats.TongTienMat;
    const chenhLech = tienMatThucTe - tienMatLyThuyet; // >0 Thừa, <0 Thiếu

    db.prepare(`
      UPDATE BANG_KE_GIAO_CA
      SET ThoiGianDongCa = datetime('now'),
          DoanhThuTienMat = ?,
          DoanhThuChuyenKhoan = ?,
          TienMatThucTeTrongKet = ?,
          ChenhLechThuaThieu = ?,
          TrangThai = 'DaChot',
          GhiChuGiaoCa = COALESCE(?, GhiChuGiaoCa)
      WHERE MaGiaoCa = ?
    `).run(
      stats.TongTienMat,
      stats.TongChuyenKhoan,
      tienMatThucTe,
      chenhLech,
      ghiChu || null,
      maGiaoCa
    );

    kdsHub.broadcast('SHIFT_CHANGED', {
      action: 'CLOSE',
      maGiaoCa,
      chenhLechThuaThieu: chenhLech
    });

    return {
      success: true,
      data: {
        maGiaoCa,
        tienDauCa: shift.TienDauCa,
        doanhThuTienMat: stats.TongTienMat,
        doanhThuChuyenKhoan: stats.TongChuyenKhoan,
        tienMatLyThuyet,
        tienMatThucTe,
        chenhLechThuaThieu: chenhLech,
        ketLuan: chenhLech === 0 ? 'Két tiền khớp chuẩn' : chenhLech > 0 ? `Két dư thừa ${chenhLech.toLocaleString('vi-VN')} đ` : `Két thâm hụt ${Math.abs(chenhLech).toLocaleString('vi-VN')} đ`
      }
    };
  }

  /**
   * Quản lý phê duyệt chốt ca
   */
  public static approveShift(maGiaoCa: string, maNguoiXacNhan: string) {
    db.prepare(`
      UPDATE BANG_KE_GIAO_CA
      SET TrangThai = 'DaXacNhan',
          NguoiXacNhan = ?
      WHERE MaGiaoCa = ?
    `).run(maNguoiXacNhan, maGiaoCa);

    kdsHub.broadcast('SHIFT_CHANGED', { action: 'APPROVE', maGiaoCa });

    return { success: true, message: 'Đã phê duyệt ca làm việc thành công!' };
  }
}
