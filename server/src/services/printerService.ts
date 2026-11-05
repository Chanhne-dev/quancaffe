import { db } from '../db/database.js';

export class PrinterService {
  /**
   * Tạo chuỗi nhị phân (Buffer) lệnh ESC/POS chuẩn cho máy in nhiệt 80mm/58mm (LAN/USB/Bluetooth)
   * Kèm lệnh bung ngăn kéo đựng tiền tự động (Cash Drawer Kick Pulse)
   */
  public static generateEscPosReceipt(soHoaDon: string): { buffer: Buffer; textContent: string } {
    const hd = db.prepare(`
      SELECT hd.*, b.TenBan, n.HoTen as TenThuNgan, k.HoTen as TenKhach, k.HangThanhVien
      FROM HOA_DON_BAN_HANG hd
      LEFT JOIN BAN b ON hd.MaBan = b.MaBan
      LEFT JOIN NHAN_VIEN n ON hd.MaNhanVien = n.MaNhanVien
      LEFT JOIN KHACH_HANG k ON hd.MaKhachHang = k.MaKhachHang
      WHERE hd.SoHoaDon = ?
    `).get(soHoaDon) as any;

    if (!hd) {
      throw new Error('Hóa đơn không tồn tại để in');
    }

    const items = db.prepare(`
      SELECT ct.*, m.TenMon
      FROM CHI_TIET_HOA_DON ct
      JOIN DANH_MUC_MON m ON ct.MaMon = m.MaMon
      WHERE ct.SoHoaDon = ?
    `).all(soHoaDon) as any[];

    // Khởi tạo các mã byte ESC/POS
    const ESC = 0x1B;
    const GS = 0x1D;

    const CMD_INIT = [ESC, 0x40]; // ESC @: Khởi tạo máy in
    const CMD_DRAWER_KICK = [ESC, 0x70, 0x00, 0x19, 0xFA]; // ESC p 0 25 250: Bật xung mở ngăn kéo tiền mặt
    const CMD_ALIGN_CENTER = [ESC, 0x61, 0x01]; // ESC a 1
    const CMD_ALIGN_LEFT = [ESC, 0x61, 0x00]; // ESC a 0
    const CMD_ALIGN_RIGHT = [ESC, 0x61, 0x02]; // ESC a 2
    const CMD_BOLD_ON = [ESC, 0x45, 0x01]; // ESC E 1
    const CMD_BOLD_OFF = [ESC, 0x45, 0x00]; // ESC E 0
    const CMD_DOUBLE_HEIGHT = [GS, 0x21, 0x01]; // GS ! 1
    const CMD_NORMAL_SIZE = [GS, 0x21, 0x00]; // GS ! 0
    const CMD_CUT_PAPER = [GS, 0x56, 0x42, 0x00]; // GS V B 0 (Cut paper)

    // Tạo text preview cho Web POS & Visual rendering
    const line = '------------------------------------------------';
    const doubleLine = '================================================';

    let textReceipt = '';
    textReceipt += "           L'ARTISAN CAFÉ & ROASTERY            \n";
    textReceipt += '        123 Nguyen Trai, Q.1, TP. HCM           \n';
    textReceipt += '         Maison Fondée en 2026 • Paris          \n';
    textReceipt += '              Hotline: 0901.234.567             \n';
    textReceipt += `${doubleLine}\n`;
    textReceipt += `ADDITION N°: ${hd.SoHoaDon}\n`;
    textReceipt += `Date: ${new Date(hd.NgayGioLap).toLocaleString('vi-VN')}\n`;
    textReceipt += `Table: ${hd.TenBan || 'A Emporter'} | Service: ${hd.KenhDatHang}\n`;
    textReceipt += `Caissier: ${hd.TenThuNgan || 'N/A'}\n`;
    if (hd.TenKhach) {
      textReceipt += `Client VIP: ${hd.TenKhach} (${hd.HangThanhVien})\n`;
    }
    textReceipt += `${line}\n`;
    textReceipt += 'ARTICLE            QT   PRIX UNIT        TOTAL\n';
    textReceipt += `${line}\n`;

    items.forEach((item) => {
      const ten = item.TenMon.padEnd(18, ' ').substring(0, 18);
      const sl = String(item.SoLuong).padStart(3, ' ');
      const dg = Number(item.DonGia).toLocaleString('vi-VN').padStart(9, ' ');
      const tt = Number(item.ThanhTien).toLocaleString('vi-VN').padStart(14, ' ');
      textReceipt += `${ten} ${sl} ${dg} ${tt}\n`;
      if (item.GhiChuTopping) {
        textReceipt += `  * ${item.GhiChuTopping}\n`;
      }
    });

    textReceipt += `${line}\n`;
    textReceipt += `Sous-total:    ${Number(hd.TongTienMon).toLocaleString('vi-VN')} d\n`;
    textReceipt += `Remise VIP:    ${Number(hd.GiamGia).toLocaleString('vi-VN')} d\n`;
    textReceipt += `NET A PAYER:   ${Number(hd.TienMatThucThu).toLocaleString('vi-VN')} d\n`;
    textReceipt += `Reglement:     ${hd.PhuongThucThanhToan}\n`;
    textReceipt += `${doubleLine}\n`;
    textReceipt += '       MERCI DE VOTRE VISITE ET A BIENTOT!      \n';
    textReceipt += '             Code Wifi: artisan2026             \n\n\n';

    // Đóng gói ESC/POS Buffer
    const buffer = Buffer.concat([
      Buffer.from(CMD_INIT),
      Buffer.from(CMD_DRAWER_KICK), // Tự động mở két tiền mặt
      Buffer.from(CMD_ALIGN_CENTER),
      Buffer.from(CMD_BOLD_ON),
      Buffer.from("L'ARTISAN CAFE & ROASTERY\n"),
      Buffer.from(CMD_BOLD_OFF),
      Buffer.from('Hotline: 0901.234.567\n\n'),
      Buffer.from(CMD_ALIGN_LEFT),
      Buffer.from(textReceipt),
      Buffer.from(CMD_CUT_PAPER)
    ]);

    return {
      buffer,
      textContent: textReceipt
    };
  }
}
