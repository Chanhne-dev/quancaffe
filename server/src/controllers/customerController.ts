import { Request, Response } from 'express';
import { db } from '../db/database.js';

export class CustomerController {
  public static searchByPhone(req: Request, res: Response) {
    try {
      const { phone } = req.query as { phone: string };
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điện thoại' });
      }

      const customer = db.prepare(`
        SELECT MaKhachHang, HoTen, SoDienThoai, DiemTichLuy, HangThanhVien
        FROM KHACH_HANG
        WHERE SoDienThoai LIKE ?
        LIMIT 1
      `).get(`%${phone}%`) as any;

      if (!customer) {
        return res.json({ success: false, message: 'Không tìm thấy khách hàng' });
      }

      // Tính mức chiết khấu thành viên
      let discountRate = 0;
      if (customer.HangThanhVien === 'VIP') discountRate = 15;
      else if (customer.HangThanhVien === 'Gold') discountRate = 10;
      else if (customer.HangThanhVien === 'Silver') discountRate = 5;

      res.json({
        success: true,
        data: {
          ...customer,
          chietKhauPhanTram: discountRate
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static getEmployees(req: Request, res: Response) {
    try {
      const employees = db.prepare(`
        SELECT n.MaNhanVien, n.HoTen, n.SoDienThoai, c.TenChucVu, b.TenBoPhan, t.VaiTro, t.TenDangNhap
        FROM NHAN_VIEN n
        JOIN CHUC_VU c ON n.MaChucVu = c.MaChucVu
        JOIN DON_VI_BO_PHAN b ON n.MaBoPhan = b.MaBoPhan
        LEFT JOIN TAI_KHOAN t ON n.MaNhanVien = t.MaNhanVien
      `).all();

      res.json({ success: true, data: employees });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
