import { db } from '../db/database.js';

export class ReportService {
  /**
   * Báo cáo Kết quả Hoạt động Kinh doanh Lãi - Lỗ (Profit & Loss - P&L)
   */
  public static getProfitAndLoss(startDate?: string, endDate?: string) {
    const tuNgay = startDate || '2000-01-01 00:00:00';
    const denNgay = endDate || '2099-12-31 23:59:59';

    // Các cột ngày có thể lưu dạng ISO ('2026-11-05T13:23:46.212Z') hoặc 'YYYY-MM-DD HH:MM:SS'.
    // So sánh chuỗi trực tiếp sẽ sai vì 'T' > ' ' -> luôn chuẩn hoá bằng datetime() trước khi so sánh.
    const inRange = (col: string) => `datetime(${col}) BETWEEN datetime(?) AND datetime(?)`;
    const round = (n: number) => Math.round(Number(n) || 0);

    // 1. Tổng doanh thu bán hàng
    const dtRow = db.prepare(`
      SELECT COALESCE(SUM(TienMatThucThu), 0) as DoanhThu,
             COUNT(SoHoaDon) as TongDon
      FROM HOA_DON_BAN_HANG
      WHERE TrangThaiThanhToan = 'DaThanhToan'
        AND ${inRange('NgayGioLap')}
    `).get(tuNgay, denNgay) as any;
    const doanhThuBanHang = round(dtRow.DoanhThu);
    const tongDonHang = dtRow.TongDon;

    // 2. Tổng giá vốn hàng bán (COGS - Cost of Goods Sold)
    const cogsRow = db.prepare(`
      SELECT COALESCE(SUM(ct.SoLuong * ctm.SoLuongDinhMuc * vt.DonGiaBinhQuan), 0) as COGS
      FROM HOA_DON_BAN_HANG hd
      JOIN CHI_TIET_HOA_DON ct ON hd.SoHoaDon = ct.SoHoaDon
      JOIN CONG_THUC_MON ctm ON ct.MaMon = ctm.MaMon
      JOIN VAT_TU_NGUYEN_LIEU vt ON ctm.MaVatTu = vt.MaVatTu
      WHERE hd.TrangThaiThanhToan = 'DaThanhToan'
        AND ${inRange('hd.NgayGioLap')}
    `).get(tuNgay, denNgay) as any;
    const giaVonHangBan = round(cogsRow.COGS);

    // 3. Chi phí hao hụt kho
    const haoHutRow = db.prepare(`
      SELECT COALESCE(SUM(TongGiaTriHaoHut), 0) as HaoHut
      FROM PHIEU_HUY_HAO_HUT
      WHERE ${inRange('NgayHuy')}
    `).get(tuNgay, denNgay) as any;
    const chiPhiHaoHut = round(haoHutRow.HaoHut);

    // 4. Thu khác từ sổ quỹ
    const thuKhacRow = db.prepare(`
      SELECT COALESCE(SUM(SoTien), 0) as ThuKhac
      FROM SO_QUY_THU_CHI
      WHERE LoaiPhieu = 'Thu'
        AND (ChungTuGoc IS NULL OR ChungTuGoc NOT IN (SELECT SoHoaDon FROM HOA_DON_BAN_HANG))
        AND ${inRange('NgayPhatSinh')}
    `).get(tuNgay, denNgay) as any;
    const thuKhac = round(thuKhacRow.ThuKhac);

    // 5. Chi phí vận hành (điện, nước, mặt bằng...)
    const chiPhiVanHanhRow = db.prepare(`
      SELECT COALESCE(SUM(SoTien), 0) as ChiPhiVH
      FROM SO_QUY_THU_CHI
      WHERE LoaiPhieu = 'Chi'
        AND (ChungTuGoc IS NULL OR ChungTuGoc NOT LIKE 'PN%')
        AND ${inRange('NgayPhatSinh')}
    `).get(tuNgay, denNgay) as any;
    const chiPhiVanHanh = round(chiPhiVanHanhRow.ChiPhiVH);

    // 6. Chi phí lương nhân viên
    const luongRow = db.prepare(`
      SELECT COALESCE(SUM(ThucLinh), 0) as ChiPhiLuong
      FROM BANG_THANH_TOAN_LUONG
      WHERE ${inRange('NgayTinhLuong')}
    `).get(tuNgay, denNgay) as any;
    const chiPhiLuong = round(luongRow.ChiPhiLuong);

    // Tính toán chỉ số P&L
    const loiNhuanGop = doanhThuBanHang - giaVonHangBan;
    const tiSuatLoiNhuanGop = doanhThuBanHang > 0 ? (loiNhuanGop / doanhThuBanHang) * 100 : 0;

    const tongChiPhiHoatDong = chiPhiVanHanh + chiPhiLuong + chiPhiHaoHut;
    const loiNhuanRong = loiNhuanGop + thuKhac - tongChiPhiHoatDong;
    const tiSuatLoiNhuanRong = doanhThuBanHang > 0 ? (loiNhuanRong / doanhThuBanHang) * 100 : 0;

    // Chi tiết chi phí hoạt động theo nhóm
    const expenseBreakdown = db.prepare(`
      SELECT LyDo, SUM(SoTien) as SoTien
      FROM SO_QUY_THU_CHI
      WHERE LoaiPhieu = 'Chi'
        AND (ChungTuGoc IS NULL OR ChungTuGoc NOT LIKE 'PN%')
        AND ${inRange('NgayPhatSinh')}
      GROUP BY LyDo
    `).all(tuNgay, denNgay) as any[];

    // Top 5 món bán chạy nhất
    const topMon = db.prepare(`
      SELECT m.TenMon, SUM(ct.SoLuong) as SoLuongBan, SUM(ct.ThanhTien) as DoanhThuMon
      FROM CHI_TIET_HOA_DON ct
      JOIN HOA_DON_BAN_HANG hd ON ct.SoHoaDon = hd.SoHoaDon
      JOIN DANH_MUC_MON m ON ct.MaMon = m.MaMon
      WHERE hd.TrangThaiThanhToan = 'DaThanhToan'
        AND ${inRange('hd.NgayGioLap')}
      GROUP BY m.MaMon
      ORDER BY SoLuongBan DESC
      LIMIT 5
    `).all(tuNgay, denNgay) as any[];

    return {
      tuNgay,
      denNgay,
      tongDonHang,
      doanhThuBanHang,
      giaVonHangBan_COGS: giaVonHangBan,
      loiNhuanGop,
      tiSuatLoiNhuanGop: Number(tiSuatLoiNhuanGop.toFixed(1)),
      thuKhac,
      chiPhiVanHanh,
      chiPhiLuong,
      chiPhiHaoHut,
      tongChiPhiHoatDong,
      loiNhuanRong_NetProfit: loiNhuanRong,
      tiSuatLoiNhuanRong: Number(tiSuatLoiNhuanRong.toFixed(1)),
      expenseBreakdown,
      topMon
    };
  }
}
