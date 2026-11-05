import { Request, Response } from 'express';
import { db } from '../db/database.js';

export class InventoryController {
  public static getMaterials(req: Request, res: Response) {
    try {
      const materials = db.prepare(`
        SELECT *, 
               CASE WHEN SoLuongTonHienTai <= MucToiThieuCanCanhBao THEN 1 ELSE 0 END as CanhBaoHetHang
        FROM VAT_TU_NGUYEN_LIEU
        ORDER BY CanhBaoHetHang DESC, TenVatTu ASC
      `).all();

      res.json({ success: true, data: materials });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static getRecipes(req: Request, res: Response) {
    try {
      const recipes = db.prepare(`
        SELECT c.*, m.TenMon, v.TenVatTu, v.SoLuongTonHienTai, v.DonGiaBinhQuan
        FROM CONG_THUC_MON c
        JOIN DANH_MUC_MON m ON c.MaMon = m.MaMon
        JOIN VAT_TU_NGUYEN_LIEU v ON c.MaVatTu = v.MaVatTu
        ORDER BY m.TenMon ASC
      `).all();

      res.json({ success: true, data: recipes });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
