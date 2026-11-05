import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { kdsHub } from '../sockets/kdsHub.js';

export class MenuController {
  public static getMenu(req: Request, res: Response) {
    try {
      const groups = db.prepare('SELECT * FROM NHOM_MON ORDER BY ThuTuHienThi ASC').all() as any[];
      const items = db.prepare('SELECT * FROM DANH_MUC_MON WHERE DangKinhDoanh = 1').all() as any[];

      const menu = groups.map(g => ({
        ...g,
        items: items.filter(i => i.MaNhom === g.MaNhom)
      }));

      res.json({ success: true, data: { groups, items, menu } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static getTables(req: Request, res: Response) {
    try {
      const areas = db.prepare('SELECT * FROM KHU_VUC').all() as any[];
      const tables = db.prepare(`
        SELECT b.*, k.TenKhuVuc,
          (SELECT SoHoaDon FROM HOA_DON_BAN_HANG hd 
           WHERE hd.MaBan = b.MaBan AND hd.TrangThaiThanhToan = 'ChoThanhToan' 
           LIMIT 1) as CurrentOrder
        FROM BAN b
        JOIN KHU_VUC k ON b.MaKhuVuc = k.MaKhuVuc
      `).all() as any[];

      res.json({ success: true, data: { areas, tables } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static updateTableStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { trangThai } = req.body;

      db.prepare('UPDATE BAN SET TrangThai = ? WHERE MaBan = ?').run(trangThai, id);
      kdsHub.broadcast('TABLE_UPDATED', { maBan: id, trangThai });

      res.json({ success: true, message: 'Cập nhật trạng thái bàn thành công' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static transferTable(req: Request, res: Response) {
    try {
      const { fromTable, toTable } = req.body;
      if (!fromTable || !toTable) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn bàn nguồn và bàn đích' });
      }

      db.exec('BEGIN TRANSACTION;');
      // Chuyển tất cả hóa đơn chưa thanh toán sang bàn mới
      db.prepare(`
        UPDATE HOA_DON_BAN_HANG
        SET MaBan = ?
        WHERE MaBan = ? AND TrangThaiThanhToan = 'ChoThanhToan'
      `).run(toTable, fromTable);

      // Cập nhật trạng thái 2 bàn
      db.prepare("UPDATE BAN SET TrangThai = 'Trong' WHERE MaBan = ?").run(fromTable);
      db.prepare("UPDATE BAN SET TrangThai = 'CoKhach' WHERE MaBan = ?").run(toTable);

      db.exec('COMMIT;');

      kdsHub.broadcast('TABLE_UPDATED', { maBan: fromTable, trangThai: 'Trong' });
      kdsHub.broadcast('TABLE_UPDATED', { maBan: toTable, trangThai: 'CoKhach' });

      res.json({ success: true, message: `Đã chuyển từ ${fromTable} sang ${toTable} thành công!` });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
